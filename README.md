Developed by hub-mgv attribution appreciated ❤️❤️❤️

pathlra-aliaser

Ultra-Fast, Zero-Dependency Path Alias Resolver for Node.js
Engineered for sub-millisecond resolution, extreme performance, and seamless integration with zero runtime overhead in production.

Why pathlra-aliaser?
Most alias tools are slow, bloated, or force you to manage paths in JavaScript files.
pathlra-aliaser is a high-performance module loader enhancer built for speed, stability, and minimal memory footprint. It safely patches Node.js’s module resolution system, enabling clean, readable imports like:

```js
const db = require("@services/database");
```

without any build step, transpilation, or runtime penalty.

Key Features
Sub-millisecond resolution: Resolves aliases in <0.1ms even under heavy load.
Adaptive strategy engine: Linear scan for ≤100 aliases, radix tree for ≥100 aliases.
Optimized LRU cache: Batch eviction (10% at a time) to avoid GC spikes.
package.json-first design: Aliases live only in package.json.
Dynamic alias support: Programmatic runtime path generation.
Custom module directories: Extend require() to search in non-standard folders.
Zero dependencies: Pure Node.js, fully compatible with "use strict".
Minimal memory footprint: Optimized data structures and memory-aware algorithms.
How It Works
Initialization: Scans package.json for keys starting with path_aliaser.
Alias Registration: Loads all alias → target mappings.
Strategy Selection:
<100 aliases → linear scan
≥100 aliases → radix tree for O(k) prefix lookups
Module Patching: Overrides Node.js’s resolver functions.
Caching: Uses high-efficiency LRU cache with batch eviction.
Path Propagation: Custom module directories injected into all active module paths.
All happens once at startup with near-zero runtime cost.
### Installation
```bash
npm install pathlra-aliaser
```

#### Configuration (via package.json)

All configuration lives in package.json. Do not define aliases in .js files unless dynamic.
```json
{
  "name": "my-app",
  "path_aliaser": {
    "@utils": "./src/utils",
    "@models": "./src/models",
    "@config": "./config"
  },
  "_moduleDirectories": ["node_modules", "custom_libs"]
}
```

Paths are relative to the project root. _moduleDirectories extends Node.js’s search paths safely.

Example Usage
```js
"use strict";
require("pathlra-aliaser")(); // Must be called BEFORE any aliased requires
const logger = require("@utils/logger");
const User = require("@models/User");
```
Advanced Features
Dynamic Aliases: Register runtime-resolved aliases.
Add Custom Module Directory: aliaser.ap("./internal_modules");
Bulk Alias Registration: aliaser.addAliases({ "@core": "./src/core" });
Reset Everything: aliaser.rst(); clears cache, aliases, paths, and resets state.
Performance & Internals
Cache: 10,000 entries by default
Eviction: 1,000 least-used entries per batch
Memory usage: <2 MB with 1,000+ aliases
Initialization warning: Logs if init >20ms
Inspect internals:
```js
const stats = require("pathlra-aliaser")._internal.getStats();
console.log(stats);
```
Ideal For
Large-scale Node.js applications
Microservices
Performance-critical systems
Long-running processes
Teams enforcing standardized path conventions

Not for: Frontend bundling, TypeScript-only projects (unless with ts-node), or projects preferring config files over package.json.
Common Misconceptions
- "I need to call aa() for every alias." → No, package.json is enough.
- "It modifies global behavior unsafely." → Only patches Node.js resolver safely.
- "It slows down my app." → Benchmarks show faster resolution than manual paths after warm-up.
License

MIT © hub-mgv
Engineered for speed. Built for scale. Designed to disappear.
pathlra-aliaser: where path resolution becomes invisible.





