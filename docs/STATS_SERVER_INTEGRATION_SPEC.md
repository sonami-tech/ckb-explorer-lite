# CKB Stats Server Integration Specification

## Overview

Integrate CKB Stats Server (port 8116) as optional secondary data source for faster address statistics and unique global metrics. Charts deferred to future phase.

---

## Configuration

**File:** `src/config/networks.ts`

**Change:** Add optional `statsUrl?: string` to `NetworkConfig` interface.

**Initial config:**

```typescript
{
  name: 'Mainnet Archive',
  type: 'mainnet',
  isArchive: true,
  url: 'http://192.168.0.74:8114',
  statsUrl: 'http://192.168.0.74:8116',
}
```

---

## New Files

### `src/lib/lockHash.ts`

Single function using existing CCC dependency:

- `scriptToLockHash(script: RpcScript): string` - Uses `CccScript.from().hash()`
- Pattern already exists in `ScriptSection.tsx:44-55`

### `src/types/stats.ts`

Response types matching stats server API. All numeric fields are hex strings with 0x prefix.

**Address types:**

- `StatsAddressResponse` - block_number, capacity, live_cell_count, tx_count
- `StatsAddressDaoResponse` - block_number, active_deposits, pending_withdrawals, pending_compensation, realized_compensation, total_dao_deposit, total_compensation
- `StatsAddressTypedResponse` - block_number, typed_capacity, typed_cell_count
- `StatsAllAddressResponse` - block_number, core, dao (nullable), typed (nullable)

**Global types:**

- `StatsGlobalResponse` - block_number, total_addresses, active_addresses, total_live_cells, regular_cells, regular_capacity, dao_cells, dao_capacity, typed_cells, typed_capacity, burned_cells, burned_capacity
- `StatsGlobalDaoResponse` - block_number, total_active_deposited, total_pending_withdrawal, total_deposited, depositor_count, total_realized_compensation
- `StatsGlobalTypedResponse` - block_number, total_typed_capacity, total_typed_cells
- `StatsSupplyResponse` - block_number, total_issued, circulating, dao_locked, burned, secondary_issued, occupied_capacity
- `StatsAllGlobalResponse` - block_number, core, dao (nullable), typed (nullable)

**Operational types:**

- `StatsSyncStatusResponse` - current_height, target_height, progress, synced

**Return type notes:**

- `get_all_address_stats` returns `Option<StatsAllAddressResponse>` (null if address unknown)
- `get_all_global_stats` returns `StatsAllGlobalResponse` directly (always returns data or error, never null)

### `src/lib/statsRpc.ts`

JSON-RPC client for stats server.

**Design:**

- No caching (stats queries are fast, pre-computed)
- In-flight deduplication only (prevent duplicate concurrent requests)
- Fail fast on errors (no silent fallbacks)
- Batch requests with `set_block_height` for archive queries
- Reuse `RpcError`, `toHex`, `fromHex` from `rpc.ts`

**Factory function:**

```typescript
export function createStatsClient(statsUrl: string): StatsClient
```

**Methods:**

| Method | RPC Method | Params | Returns |
|--------|------------|--------|---------|
| `getAddressStats` | `get_address_stats` | lockHash, blockNumber? | `StatsAddressResponse \| null` |
| `getAllAddressStats` | `get_all_address_stats` | lockHash, blockNumber? | `StatsAllAddressResponse \| null` |
| `getGlobalStats` | `get_global_stats` | blockNumber? | `StatsGlobalResponse \| null` |
| `getAllGlobalStats` | `get_all_global_stats` | blockNumber? | `StatsAllGlobalResponse` |
| `getCirculatingSupply` | `get_circulating_supply` | blockNumber? | `StatsSupplyResponse \| null` |
| `syncStatus` | `sync_status` | none | `StatsSyncStatusResponse` |

**Archive query pattern:** When blockNumber provided, send batch request with `set_block_height` as first call (same pattern as `rpc.ts:333-366`).

**Type export:**

```typescript
export type StatsClient = ReturnType<typeof createStatsClient>;
```

### `src/contexts/StatsContext.tsx`

**Exports:**

- `StatsProvider` - Context provider component
- `useStats()` - Hook to access stats context (follows pattern of `useNetwork()`, `useArchive()`)

**Context value provides:**

- `statsClient: StatsClient | null` - Client instance or null if no statsUrl
- `isStatsAvailable: boolean` - True when statsUrl configured

**No global stats caching or polling.** Context only provides client access. Pages fetch their own data.

**Network change handling:** Context uses `useNetwork()` to get `currentNetwork`. When `currentNetwork.statsUrl` changes, recreates stats client via `useMemo()` (same pattern as `NetworkContext.tsx:89-92`).

**Provider placement:** After ArchiveProvider (stats queries often need archiveHeight).

---

## Modified Files

### `src/App.tsx`

Add `StatsProvider` to provider tree after `ArchiveProvider`:

```
NetworkProvider
  ArchiveProvider
    StatsProvider      <-- NEW
      TickProvider
        ...
```

### `src/pages/AddressPage.tsx`

**Phase 2 changes:**

1. **Data source switch:** When stats available, replace three RPC calls with single stats call:
   - Replace: `getCellsCapacity()` + `getCellsCount()` + `getTransactionsCount()`
   - With: `getAllAddressStats(lockHash, archiveHeight)` - returns core + dao + typed in one call
   - **Keep unchanged:** `getGroupedTransactions()` - stats server doesn't provide transaction list

2. **New DetailRow items** (only when data present):
   - DAO Section (if `dao` non-null): Active Deposits, Pending Withdrawals, Realized Compensation
   - Typed Cells (if `typed` non-null): Typed Cell count only

### `src/pages/HomePage.tsx`

**Phase 3 changes:**

**Layout:** 6 cards in 2×3 grid on desktop (md:grid-cols-3), stacking on mobile. Current layout already uses `md:grid-cols-3`.

**New cards** (conditional on `isStatsAvailable`):

| Card | Stats |
|------|-------|
| Network | Total Addresses, Active Addresses |
| Cells | Total Live Cells, DAO Cells |
| Supply | Circulating Supply, DAO Locked |

**Fetch strategy:** Lazy load on mount. Fetch `getAllGlobalStats` + `getCirculatingSupply` when home page mounts. Poll with existing `POLL_INTERVAL_MS` (8 seconds) while mounted. Stop polling on unmount.

---

## Implementation Phases

### Phase 1 - Foundation

1. `src/config/networks.ts` - Add statsUrl to interface and mainnet config
2. `src/lib/lockHash.ts` - Create utility
3. `src/types/stats.ts` - Create type definitions
4. `src/lib/statsRpc.ts` - Create client (reuse RpcError, toHex, fromHex from rpc.ts)
5. `src/contexts/StatsContext.tsx` - Create context with StatsProvider and useStats hook
6. `src/App.tsx` - Add StatsProvider to provider tree

### Phase 2 - Address Page

1. Use `getAllAddressStats()` for address data when available (capacity, cell count, tx count, dao, typed)
2. Keep RPC for transaction list (`getGroupedTransactions`)
3. Add DAO stats display (3 fields: Active Deposits, Pending Withdrawals, Realized Compensation)
4. Add Typed Cells count display

### Phase 3 - Home Page

1. Add three new stat cards (Network, Cells, Supply)
2. Conditional rendering based on `isStatsAvailable`

---

## Key Technical Details

**Stats server port:** 8116 (default)

**Lock hash computation:** `CccScript.from({codeHash, hashType, args}).hash()`

**Archive query:** Batch request with `set_block_height` first, same as CKB RPC pattern.

**Error handling:** Fail fast. Reuse `RpcError` class from `rpc.ts`. If stats server configured but unreachable, display error (no fallback to RPC).

**Hex conversion:** Reuse `toHex()` and `fromHex()` from `rpc.ts` for consistency.

**Null handling:** DAO and typed stats are null when category disabled or address has no activity. UI should not show section when null.

---

## Stats Server API Reference

**Source:** `/home/username/ckb-archive/ckb-stats-server/src/api/`

- `methods.rs` - Method implementations
- `types.rs` - Response types and hex utilities
- `middleware.rs` - Batch context handling for `set_block_height` and `set_block_height_range`

**Range queries (future charts):** Use `set_block_height_range(start, end, frequency?)` as first call in batch. Returns array of results with `block_height` field in each entry. Max 1000 samples per query.
