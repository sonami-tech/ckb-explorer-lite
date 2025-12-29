# RPC Cache Policy

This document describes the caching strategy for RPC requests in CKB Explorer Lite.

## Overview

The RPC cache reduces network requests and RPC node pressure through:

1. **In-flight deduplication**: Concurrent identical requests share a single network call.
2. **Result caching**: Responses are cached based on their mutability characteristics.

## Cache Policies

### LRU (Long-lived)

Entries remain cached until evicted by LRU (Least Recently Used) when the cache reaches capacity. Used for immutable or stable data.

### Short TTL

Entries expire after `CACHE_CONFIG.shortTtlMs` (default: 2 seconds). Used for data that changes frequently or could be affected by chain reorganization.

## Method-Specific Policies

### Always Short TTL

| Method | Rationale |
|--------|-----------|
| `getTipHeader` | Changes every ~8 seconds. |
| `getCurrentEpoch` | Changes periodically. |
| `getBlockchainInfo` | Contains current chain state. |

### Always LRU (Immutable)

| Method | Rationale |
|--------|-----------|
| `getBlockByHash` | Hash is derived from content; data cannot change. |
| `getTransaction` | Transaction data is immutable once created. |

### Depth-Dependent

These methods use a depth check to determine policy. The depth threshold is configured via `CACHE_CONFIG.depthThreshold` (default: 12 blocks).

| Method | Condition | Policy |
|--------|-----------|--------|
| `getBlockByNumber` | archiveHeight < tip - threshold | LRU |
| `getBlockByNumber` | archiveHeight >= tip - threshold | Short TTL |
| `getBlockByNumber` | No archive, blockNum < tip - threshold | LRU |
| `getBlockByNumber` | No archive, blockNum >= tip - threshold | Short TTL |
| `getLiveCell` | archiveHeight < tip - threshold | LRU |
| `getLiveCell` | archiveHeight >= tip - threshold | Short TTL |
| `getLiveCell` | No archiveHeight | Short TTL |
| `getCells` | archiveHeight < tip - threshold | LRU |
| `getCells` | archiveHeight >= tip - threshold | Short TTL |
| `getCells` | No archiveHeight | Short TTL |
| `getCellsCapacity` | archiveHeight < tip - threshold | LRU |
| `getCellsCapacity` | archiveHeight >= tip - threshold | Short TTL |
| `getCellsCapacity` | No archiveHeight | Short TTL |

## Depth Threshold Rationale

Blocks within `depthThreshold` of the chain tip are considered "shallow" and could be reorganized. Historical state at shallow heights is not guaranteed to be final.

- **Deep blocks** (beyond threshold): Effectively immutable; safe to cache indefinitely.
- **Shallow blocks** (within threshold): Could change due to reorg; use short TTL.

## Cache Key Structure

Cache keys are constructed from:
- RPC method name
- Serialized parameters (JSON)
- Archive height (if specified)

Example: `getBlockByNumber:["0xf4240",null]:1000000`

## Special Cases

### Null Results

Null responses (resource not found) are **not cached**. The resource may exist in the future.

### Error Responses

Errors are **not cached**. Errors may be transient (network issues, node overload).

### Tip Tracking

The cache maintains `lastKnownTip` internally, updated from each `getTipHeader` response. This value is used for depth calculations. If the tip is unknown (app just started), all depth-dependent entries use Short TTL until the first `getTipHeader` completes.

### Verbosity Parameter

`getBlockByNumber` accepts a verbosity parameter. Different verbosity levels are cached separately since they return different data shapes.

## Configuration

All cache settings are in `src/config/defaults.ts`:

```typescript
CACHE_CONFIG = {
  enabled: true,        // Enable/disable cache entirely
  maxEntries: 1000,     // LRU cache capacity
  depthThreshold: 12,   // Blocks from tip considered shallow
  shortTtlMs: 2000,     // Short TTL duration (ms)
}
```

## Developer Console

Cache statistics are available via the developer console:

```javascript
window.rpcCacheStats()
```

Returns an object with:
- `hits`: Number of cache hits
- `misses`: Number of cache misses
- `evictions`: Number of LRU evictions
- `size`: Current number of cached entries
- `inFlight`: Number of in-flight requests
