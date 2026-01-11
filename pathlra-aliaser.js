"use strict";

/**
 * pathlra-aliaser
 * 
 * High-performance ultra-fast path alias resolver and module loader enhancer
 * Designed and optimized by hub-mgv with maximum attention to speed and efficiency
 * 
 * Key Features & Design Goals
 * 1 Sub-millisecond alias resolution for Node.js modules, minimizing overhead
 * 2 Dual resolution strategies
 *    - LINEAR scan for small alias sets (less than 100) for simplicity and speed
 *    - RADIX tree for large alias sets, enabling advanced prefix matching and ultra-fast lookups
 * 3 Lightweight LRU cache with batch eviction to accelerate repeated module resolution
 * 4 Optimized data structures, variable naming, and algorithms with a focus on speed
 * 5 Automatic alias registration from package.json and support for dynamic alias targets
 * 6 Minimal memory footprint, high-frequency file/module path access optimized
 * 
 * Developer Note
 * Every aspect of this module—from variable names to core algorithms—was crafted
 * with speed as the absolute priority Alias matching path normalization and
 * cache management are fine-tuned for extreme performance
 *
 * Usage: require and initialize in your Node.js project to enable advanced path aliasing.
 */
const p = require("path");
const m = require("module");
const f = require("fs");
const { performance: perf } = require("perf_hooks");

// Platform-agnostic path separator handling
var s = p.sep;
var sc = s.charCodeAt(0);
var f_sl = 47; // Forward slash code
var b_sl = 92; // Backslash code
var nul = "\0"; // Null separator for cache keys
var csz = 10000; // Max LRU cache size
var ev_b = Math.floor(csz * 0.1); // Eviction batch size 10% of cache
var lin = 0; // Strategy ID linear scan
var rdx = 1; // Strategy ID radix tree
let strat = lin; // Current active strategy

/**
 * Lightweight LRU cache with batch eviction
 * Optimized for high-frequency module resolution
 */
class lru {
  constructor(max) {
    this.max = max;
    this.m = new Map(); // Key -> node
    this.h = null; // Head (most recently used)
    this.t = null; // Tail (least recently used)
  }
  /**
   * Retrieve value and promote to head
   * @param {*} k - Cache key
   * @returns {*} Cached value or undefined
   */
  get(k) {
    const n = this.m.get(k);
    if (!n) return undefined;
    if (n !== this.h) {
      // Unlink from current position
      if (n.prev) n.prev.next = n.next;
      if (n.next) n.next.prev = n.prev;
      if (n === this.t) this.t = n.prev;
      // Move to head
      n.prev = null;
      n.next = this.h;
      this.h.prev = n;
      this.h = n;
    }
    return n.v;
  }
  /**
   * Insert/update key-value pair
   * @param {*} k - Key
   * @param {*} v - Value
   */
  set(k, v) {
    let n = this.m.get(k);
    if (n) {
      n.v = v;
      this.get(k); // Promote existing entry
      return;
    }
    // Create new node
    n = { k, v, prev: null, next: this.h };
    if (this.h) this.h.prev = n;
    this.h = n;
    if (!this.t) this.t = n;
    this.m.set(k, n);
    // Evict if over capacity
    if (this.m.size > this.max) this.evt();
  }
  /**
   * Batch-evict least recently used entries
   */
  evt() {
    if (!this.t) return;
    let c = this.t;
    // Remove up to ev_b entries from tail
    for (let i = 0; i < ev_b && c; i++) {
      this.m.delete(c.k);
      c = c.prev;
    }
    if (c) {
      // Update new tail
      c.next = null;
      this.t = c;
    } else {
      // Cache is now empty
      this.h = null;
      this.t = null;
    }
  }
  /**
   * Clear entire cache
   */
  clr() {
    this.m.clear();
    this.h = null;
    this.t = null;
  }
}

// Global resolution cache
const rc = new lru(csz);

/**
 * Radix tree node for path prefix matching
 */
class rn {
  constructor() {
    this.c = null; // Children map charCode -> rn
    this.a = null; // Alias reference not used in current impl
    this.t = null; // Target resolver string or function
    this.e = ""; // Edge label substring
    this.l = false; // Is leaf has terminal target
  }
}

/**
 *  * Radix tree for efficient prefix-based alias lookup
*/
class rt {
  constructor() {
    this.r = new rn(); // Root node
  }

  /**
   * Insert alias pattern into tree
   * @param {string} a - Alias prefix "@utils"
   * @param {*} t - Target resolver string path or function
   */
  ins(a, t) {
    let n = this.r;
    let i = 0;
    const al = a.length;

    while (i < al) {
      const cc = a.charCodeAt(i);

      if (!n.c) {
        n.c = Object.create(null); // Optimal object-as-map
      }


      let ch = n.c[cc];
      if (!ch) {
        // No existing edge - create leaf
        ch = new rn();
        ch.e = a.slice(i);
        ch.t = t;
        ch.l = true;
        n.c[cc] = ch;
        return;
      }


      // Find common prefix between existing edge and new alias
      const ed = ch.e;
      let j = 0;
      const el = ed.length;
      const rem = al - i;

      while (j < el && j < rem && ed.charCodeAt(j) === a.charCodeAt(i + j)) {
        j++;
      }

      if (j === el) {
        // Existing edge is prefix of new alias - traverse deeper
        i += el;
        n = ch;
        continue;
      }

      if (j > 0) {
        // Split existing node at common prefix
        const sp = new rn();
        sp.e = ed.slice(0, j);
        sp.c = Object.create(null);
        ch.e = ed.slice(j); // Remaining part becomes child
        const es = ed.charCodeAt(j);
        sp.c[es] = ch;
        // Add new alias as sibling
        const nl = new rn();
        nl.e = a.slice(i + j);
        nl.t = t;
        nl.l = true;
        const ns = a.charCodeAt(i + j);
        sp.c[ns] = nl;

        n.c[cc] = sp;
        return;
      }
      // No common prefix create branching node
      const br = new rn();
      br.c = Object.create(null);
      const es0 = ed.charCodeAt(0);
      br.c[es0] = ch;
      const nl2 = new rn();
      nl2.e = a.slice(i);
      nl2.t = t;
      nl2.l = true;
      const ns2 = a.charCodeAt(i);
      br.c[ns2] = nl2;
      n.c[cc] = br;
      return;
    }
    // Exact match - update terminal node
    n.t = t;
    n.l = true;
  }
  /**
   * Find best matching alias for request path
   * @param {string} req - Requested module path
   * @returns {{a: string, t: *}|null} Match info or null
   */
  fnd(req) {
    let n = this.r;
    let lm = null; // Last matched terminal
    let d = 0;
    const rl = req.length;
    while (d < rl && n) {
      // Track potential directory matches (for partial paths)
      if (n.l) {
        const nc = req.charCodeAt(d);
        if (nc === f_sl || nc === b_sl || nc === sc) {
          lm = { a: n.e, t: n.t };
        }
      }
      if (!n.c) break;
      const cd = req.charCodeAt(d);
      const ch = n.c[cd];
      if (!ch) break;
      const ed = ch.e;
      const el = ed.length;
      // Full edge match
      if (req.startsWith(ed, d)) {
        d += el;
        // Exact terminal match
        if (ch.l && d === rl) {
          return { a: ed, t: ch.t };
        }
        n = ch;
        continue;
      }
      // Partial edge match
      let k = 0;
      while (
        k < el &&
        d + k < rl &&
        ed.charCodeAt(k) === req.charCodeAt(d + k)
      ) {
        k++;
      }
      if (k === 0) break;
      // Check if partial match qualifies as terminal
      if (
        ch.l &&
        (d + k === rl || [f_sl, b_sl, sc].includes(req.charCodeAt(d + k)))
      ) {
        return { a: ed.slice(0, k), t: ch.t };
      }
      break;
    }
    return lm; // Return last valid directory match
  }
}

// Global state management
const cp = new Set(); // Custom module paths
const am = new Map(); // Active aliases alias -> target
let tree = null; // Radix tree instance
let sa = null; // Sorted aliases array for linear strategy
let pa = []; // Prioritized path array
let ha = false; // Has active aliases
let ac = false; // Aliases changed needs optimization
let pc = false; // Paths changed needs propagation

// Monkey-patch Node.js module resolution
const Mod = module.constructor.length > 1 ? module.constructor : m;
const _nmp = Mod._nodeModulePaths;
const _rfn = Mod._resolveFilename;

/**
 * Override _nodeModulePaths to inject custom paths
 * Preserves original behavior for node_modules paths
 */
Mod._nodeModulePaths = function (frm) {
  if (frm.includes(`${s}node_modules${s}`)) {
    return _nmp.call(this, frm);
  }

  const ps = _nmp.call(this, frm);
  return pa.length ? pa.concat(ps) : ps;
};


/**
 * Core resolution override with caching and aliasing
 */
Mod._resolveFilename = function (req, prnt, isM, opts) {
  const pp = prnt?.filename || "";
  const ck = pp + nul + req; // Cache key: parent + request

  // Return cached result if available
  const ch = rc.get(ck);
  if (ch !== undefined) return ch;

  let rr = req;
  let mr = null; // Match result

  if (ha) {
    // Re-optimize if aliases changed
    if (ac) {
      opt();
      ac = false;
    }

    // Strategy dispatch
    if (strat === lin) {
      // Linear scan for small alias sets (<100)
      const rl = req.length;
      for (let i = 0; i < sa.length; i++) {
        const [a, t] = sa[i];
        const al = a.length;

        if (al > rl) continue;
        if (req.startsWith(a)) {
          // Verify boundary must be end or path separator
          if (al === rl || [f_sl, b_sl, sc].includes(req.charCodeAt(al))) {
            mr = { a, t };
            break;
          }
        }
      }
    } else {
      // Radix tree for large alias sets
      mr = tree.fnd(req);
    }

    // Process match if found
    if (mr) {
      const { a, t } = mr;
      // Resolve target path (supports dynamic functions)
      const rtg = typeof t === "function" ? t(pp, req, a) : t;

      if (typeof rtg !== "string") {
        throw new Error(
          "pathlra-aliaser Custom handler must return string path"
        );
      }

      // Reconstruct final path
      const sf = req.slice(a.length);
      rr = sf ? rtg + (sf.charCodeAt(0) === sc ? sf : s + sf) : rtg;
    }
  }

  // Delegate to original resolver
  const res = _rfn.call(this, rr, prnt, isM, opts);
  rc.set(ck, res);
  return res;
};



/**
 * Register single alias
 * @param {string} a Alias prefix
 * @param {*} t Target resolver
 */
function aa(a, t) {
  am.set(a, t);
  ha = true;
  ac = true;
}

/**
 * Add custom module directory
 * @param {string} d - Directory path
 */
function ap(d) {
  const nd = p.normalize(d);
  if (cp.has(nd)) return;

  cp.add(nd);
  // Sort by length longest first for correct precedence
  pa = [...cp].sort((x, y) => y.length - x.length);
   pc = true;

  // Propagate changes asynchronously
  setImmediate(apc);
}

/**
 * Propagate path changes to active modules
 */
function apc() {
  if (!pc) return;

  const mn = require.main;
  if (mn && !mn._simulateRepl) ump(mn);

  // Traverse parent chain to update all relevant modules
  let pr = module.parent;
  const sn = new Set();

  while (pr && !sn.has(pr)) {
    sn.add(pr);
    ump(pr);
    pr = pr.parent;
  }

  pc = false;
}

/**
 * Update module paths with custom directories
 * @param {*} md - Module instance
 */
function ump(md) {
  if (!md.paths) return;

  for (const d of cp) {
    if (!md.paths.includes(d)) {
      md.paths.unshift(d); // Prepend for higher priority
    }
  }
}

/**
 * Optimize internal data structures based on alias count
 */
function opt() {
  const cnt = am.size;

  if (cnt === 0) {
    // Disable aliasing when no aliases registered
    ha = false;
    sa = null;
    tree = null;
    strat = lin;
    return;
  }

  // Strategy selection threshold
  if (cnt < 100) {
    strat = lin;
    sa = [...am.entries()].sort((x, y) => y[0].length - x[0].length);
    tree = null;
  } else {
    strat = rdx;
    bld(); // Build radix tree
    sa = null;
  }
}

/**
 * Build radix tree from current aliases
 */
function bld() {
  tree = new rt();
  am.forEach((t, a) => tree.ins(a, t));
}

/**
 * Initialize path aliaser from package.json
 * @param {Object|string} opts Configuration options or base path
 * @returns {Object} Initialization stats
 */
function init(opts = {}) {
  const st = perf.now();
  const bs = gbp(opts); // Get base path
  const pkg = lpj(bs); // Load package.json


  // Find configuration section supports any key starting with 'path_aliaser'
  const cfg = Object.keys(pkg).find((k) => k.startsWith("path_aliaser"));
  const als = cfg ? pkg[cfg] : {};


  // Register aliases from config
  for (const [a, t] of Object.entries(als)) {
    const r = t.startsWith("/") ? t : p.join(bs, t);
    aa(a, r);
  }


  // Handle custom module directories
  const dirs = pkg._moduleDirectories || ["node_modules"];
  for (const d of dirs) {
    if (d !== "node_modules") {
      ap(p.join(bs, d));
    }
  }


  opt();
  apc();

  // Performance monitoring
  const dur = perf.now() - st;
  if (dur > 20) {
    console.warn(
      `pathlra-aliaser Init took ${dur.toFixed(1)}ms optimized for ${
        am.size
      } aliases`
    );
  }

  return { aliases: am.size, paths: cp.size, duration: dur };
}

/**
 * Get base path for package.json resolution
 * @param {*} o - Options object or string path
 * @returns {string} Base directory path
 */
function gbp(o) {
  if (typeof o === "string") o = { base: o };

  if (o.base) {
    return p.resolve(o.base.replace(/\/package\.json$/, ""));
  }

  // Try common locations
  const cands = [
    p.join(__dirname, "../.."), // Two levels up from this file
    process.cwd(), // Current working directory
  ];

  for (const c of cands) {
    try {
      f.accessSync(p.join(c, "package.json"), f.constants.R_OK);
      return c;
    } catch {}
  }

  throw new Error(`Failed to locate package.json in\n${cands.join("\n")}`);
}

/**
 * Load and parse package.json
 * @param {string} b - Base directory
 * @returns {Object} Parsed package.json
 */
function lpj(b) {
  try {
    const pp = p.join(b, "package.json");
    return JSON.parse(f.readFileSync(pp, "utf8"));
  } catch (e) {
    throw new Error(`Failed to load package.json ${e.message}`);
  }
}

/**
 * Reset all state and clear caches
 */
function rst() {
  rc.clr();

  cp.clear();
  am.clear();
  pa = [];
  tree = null;
  sa = null;
  ha = false;
  ac = false;
  pc = false;

  // Clean module paths
  const mn = require.main;
  if (mn && !mn._simulateRepl) cmp(mn);

  let pr = module.parent;
  const sn = new Set();

  while (pr && !sn.has(pr)) {
    sn.add(pr);
    cmp(pr);
    pr = pr.parent;
  }

  // Clear require cache for custom paths
  const ps = [...cp];
  for (const k of Object.keys(require.cache)) {
    if (ps.some((x) => k.startsWith(x))) {
      delete require.cache[k];
    }
  }
}

/**
 * Clean module paths remove custom paths
 * @param {*} md - Module instance
 */
function cmp(md) {
  if (!md.paths) return;
  md.paths = md.paths.filter((x) => !cp.has(x));
}

// Public API
module.exports = Object.assign(init, {
  ap, // Add path
  aa, // Add alias
  addAliases: (als) => {
    for (const [a, t] of Object.entries(als)) {
      aa(a, t);
    }
    ac = true;
  },
  rst, // Reset
  _internal: {
    getStats: () => ({
      aliases: am.size,
      paths: cp.size,
      cacheSize: rc.m.size,
      strategy: strat === lin ? "LINEAR" : "RADIX",
      memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
    }),
    forceStrategy: (st) => {
      strat = st;
      if (st === rdx) bld();
    },
    clearCache: () => rc.clr(),
  },
});
