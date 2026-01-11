# pathlra-aliaser

High-performance path alias resolver for Node.js, focused on speed, safety, and predictable behavior.

The library integrates directly with Node.js module resolution and is intended for projects that want cleaner import paths
without additional build steps or runtime layers.

---

## Overview

`pathlra-aliaser` is a lightweight path alias resolver and module loader enhancement for Node.js.

It works by patching Node.js’s internal resolution mechanism at runtime and applying alias mappings before delegating back
to the original resolver. The goal is to provide alias support while preserving Node.js’s expected behavior and semantics.

```js
const db = require("@services/database");
```

No build step or transpilation is required.

---

## Key Features

- Fast alias resolution suitable for large codebases
- Adaptive resolution strategy (linear scan / radix tree)
- LRU cache with batch-based eviction
- Aliases configured directly in `package.json`
- Support for dynamic alias targets
- Optional custom module directories
- Zero external dependencies
- Predictable memory usage
- Optional hot-reload and debug modes
- Helper for generating TypeScript `paths`
- Built-in presets such as `@root` and `@src`

---

## Comparison with Popular Alternatives

This section provides a factual, non-promotional comparison between `pathlra-aliaser` and other commonly used
path alias solutions in the JavaScript / Node.js ecosystem.

### Compared Solutions

- pathlra-aliaser
- module-alias
- tsconfig-paths
- babel-plugin-module-resolver
- Node.js native subpath imports (`imports` / `exports`)

### Architectural Differences

| Solution | How it works | Runtime  Build |
|--------|--------------|-----------------|
| pathlra-aliaser | Patches Node.js resolver and resolves aliases at runtime | Runtime |
| module-alias | Registers aliases during startup | Runtime |
| tsconfig-paths | Resolves paths from tsconfig during execution | Runtime (TS-focused) |
| babel-plugin-module-resolver | Rewrites imports during compilation | Build-time |
| Node subpath imports | Native resolution via package.json | Runtime (ESM) |

### Capability Comparison

| Capability | pathlra-aliaser | module-alias | tsconfig-paths | babel resolver | Node imports |
|-----------|----------------|--------------|----------------|----------------|--------------|
| Pure Node.js (no build) | Yes | Yes | Partial | No | Yes |
| Zero dependencies | Yes | Yes | No | No | Yes |
| Runtime alias resolution | Yes | Yes | Yes | No | Yes |
| TypeScript support | Yes | Partial | Yes | Via Babel | Native |
| Dynamic aliases | Yes | Yes | No | No | No |
| Custom module directories | Yes | Yes | No | No | No |
| Hot-reload support | Optional | No | No | No | No |
| Works without transpiler | Yes | Yes | Partial | No | Yes |

### Practical Notes

- `pathlra-aliaser` and `module-alias` are best suited for pure Node.js runtime environments.
- `tsconfig-paths` is primarily intended for TypeScript projects using `ts-node`.
- `babel-plugin-module-resolver` operates only during build/compile time and does not affect runtime resolution.
- Native Node.js subpath imports are limited to ESM and have stricter naming rules.

This comparison is intended to clarify trade-offs rather than rank solutions.

---

## Installation

```bash
npm install pathlra-aliaser
```

---

## Configuration via `package.json`

```json
{
  "path_aliaser": {
    "@users": "./routes/users",
    "@logger": "./utils/logger"
  }
}
```

---

## Usage

```js
require("pathlra-aliaser")();

const users = require("@users");
const logger = require("@logger");
```

---

## Advanced Usage

### Dynamic Alias

```js
const aliaser = require("pathlra-aliaser");

aliaser.aa("@dynamic", () => "./runtime/path");
```

### Custom Module Directory

```js
aliaser.ap("./internal_modules");
```

---

## TypeScript Integration

```js
const fs = require("fs");
const aliaser = require("pathlra-aliaser");

fs.writeFileSync(
  "tsconfig.json",
  JSON.stringify(aliaser._internal.generateTSConfig(), null, 2)
);
```

---

## License

MIT © hub-mgv

`pathlra-aliaser` is designed to be minimal, predictable, and unobtrusive.
