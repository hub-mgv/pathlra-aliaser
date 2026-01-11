Developed by hub-mgv attribution appreciated ❤️❤️❤️

# pathlra-aliaser

**Ultra-fast, high-performance path alias resolver and module loader enhancer**

Developed by **hub-mgv**, focusing on extreme speed and optimized file resolution
Every aspect is tuned for maximum performance: from variable names to caching strategies and alias lookup, even supporting advanced directory traversal at lightning speed

## Features
- Sub-millisecond resolution for Node.js module aliases
- LRU cache with batch eviction for memory efficiency
- Linear scan for small alias sets (<100)
- Radix tree for large alias sets (100+)
- Automatic alias registration from `package.json`
- Support for dynamic target paths
- Minimal memory footprint with optimized performance

## Installation
```bash
npm install pathlra-aliaser

```