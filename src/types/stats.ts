/**
 * CKB Stats Server response types.
 *
 * All numeric fields are hex strings with 0x prefix.
 * These types match the JSON-RPC responses from ckb-stats-server.
 */

import type { Hex } from './rpc';

// ============================================================================
// Address Stats Types
// ============================================================================

/** Core address statistics. */
export interface StatsAddressResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total capacity in shannons (hex). */
	capacity: Hex;
	/** Number of live (unspent) cells (hex). */
	live_cell_count: Hex;
	/** Total transaction count (hex). */
	tx_count: Hex;
	/** Whether transaction history is available for this address. */
	tx_history_available: boolean;
}

/** Address DAO statistics. */
export interface StatsAddressDaoResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Active deposits earning compensation (hex shannons). */
	active_deposits: Hex;
	/** Pending withdrawals awaiting Phase 2 (hex shannons). */
	pending_withdrawals: Hex;
	/** Pending compensation calculated at Phase 1 (hex shannons). */
	pending_compensation: Hex;
	/** Realized compensation from completed Phase 2 (hex shannons). */
	realized_compensation: Hex;
	/** Total DAO deposit (active + pending) (hex shannons). */
	total_dao_deposit: Hex;
	/** Total compensation (pending + realized) (hex shannons). */
	total_compensation: Hex;
}

/** Address typed cell statistics. */
export interface StatsAddressTypedResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total capacity in typed cells (hex shannons). */
	typed_capacity: Hex;
	/** Total number of typed cells (hex). */
	typed_cell_count: Hex;
}

/** A single transaction entry from address tx history. */
export interface StatsTxHistoryEntry {
	/** Block number containing this transaction (hex). */
	block_number: Hex;
	/** Transaction hash. */
	tx_hash: Hex;
}

/** Response from get_address_transactions. */
export interface StatsAddressTxHistoryResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total number of transactions for this address (hex). */
	total: Hex;
	/** Current offset into the result set (hex). */
	offset: Hex;
	/** Limit used for this query (hex). */
	limit: Hex;
	/** Transaction entries for the requested page. */
	transactions: StatsTxHistoryEntry[];
}

/** Combined address statistics (all categories). */
export interface StatsAllAddressResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Core address stats (always present). */
	core: StatsAddressResponse;
	/** DAO stats (null if DAO category disabled or address has no DAO activity). */
	dao: StatsAddressDaoResponse | null;
	/** Typed cell stats (null if typed_cells category disabled or no typed cells). */
	typed: StatsAddressTypedResponse | null;
}

// ============================================================================
// Global Stats Types
// ============================================================================

/** Global chain statistics. */
export interface StatsGlobalResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total unique addresses ever seen (hex). */
	total_addresses: Hex;
	/** Addresses with at least one live cell (hex). */
	active_addresses: Hex;
	/** Total live cells across all addresses (hex). */
	total_live_cells: Hex;
	/** Regular cells count (hex). */
	regular_cells: Hex;
	/** Regular cells capacity in shannons (hex). */
	regular_capacity: Hex;
	/** DAO deposit cells count (hex). */
	dao_cells: Hex;
	/** DAO deposit cells capacity in shannons (hex). */
	dao_capacity: Hex;
	/** Cells with type scripts count (hex). */
	typed_cells: Hex;
	/** Cells with type scripts capacity in shannons (hex). */
	typed_capacity: Hex;
	/** Burned/unspendable cells count (hex). */
	burned_cells: Hex;
	/** Burned/unspendable cells capacity in shannons (hex). */
	burned_capacity: Hex;
}

/** Global DAO statistics. */
export interface StatsGlobalDaoResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total active deposits across all addresses (hex shannons). */
	total_active_deposited: Hex;
	/** Total pending withdrawals across all addresses (hex shannons). */
	total_pending_withdrawal: Hex;
	/** Total deposited (active + pending) (hex shannons). */
	total_deposited: Hex;
	/** Count of unique addresses with any DAO activity (hex). */
	depositor_count: Hex;
	/** Total realized compensation (hex shannons). */
	total_realized_compensation: Hex;
}

/** Global typed cell statistics. */
export interface StatsGlobalTypedResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total capacity in typed cells across all addresses (hex shannons). */
	total_typed_capacity: Hex;
	/** Total number of typed cells (hex). */
	total_typed_cells: Hex;
}

/** Combined global statistics (all categories). */
export interface StatsAllGlobalResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Core global stats (always present). */
	core: StatsGlobalResponse;
	/** DAO global stats (null if DAO category disabled). */
	dao: StatsGlobalDaoResponse | null;
	/** Typed cell global stats (null if typed_cells category disabled). */
	typed: StatsGlobalTypedResponse | null;
}

/** Supply breakdown response. */
export interface StatsSupplyResponse {
	/** Block height this data is from (hex). */
	block_number: Hex;
	/** Total CKB issued in shannons (hex). */
	total_issued: Hex;
	/** Circulating supply in shannons (hex). */
	circulating: Hex;
	/** CKB locked in DAO deposits in shannons (hex). */
	dao_locked: Hex;
	/** CKB in burned/unspendable cells in shannons (hex). */
	burned: Hex;
	/** Secondary issuance total in shannons (hex). */
	secondary_issued: Hex;
	/** Occupied capacity in shannons (hex). */
	occupied_capacity: Hex;
}

// ============================================================================
// Operational Types
// ============================================================================

/** Sync status response. */
export interface StatsSyncStatusResponse {
	/** Current synced block height (hex). */
	current_height: Hex;
	/** Target chain tip height (hex). */
	target_height: Hex;
	/** Sync progress as decimal string (e.g., "0.95"). */
	progress: string;
	/** Whether sync is complete. */
	synced: boolean;
}
