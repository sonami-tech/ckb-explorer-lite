/**
 * Filter types and utilities for Live Cells page.
 *
 * Provides:
 * - Filter and sort type definitions
 * - Filter builder for indexer search key
 * - Client-side lock script filtering
 * - Present scripts interface for smart counts
 */

import { getCodeHashesForGroup, getLockScriptGroups, isOtherLockScript, isOtherTypeScript, OTHER_SCRIPTS_GROUP, NO_TYPE_SCRIPT_GROUP } from '../lib/scriptGroups';
import { KNOWN_TYPE_SCRIPTS } from '../lib/wellKnown';
import { resolveBlockRange, getScriptInfo } from '../lib/filterUtils';
import type { NetworkType } from '../config/networks';
import type { RpcScript, RpcCell } from '../types/rpc';
import type { BlockRangeFilter } from '../components/AddressTransactionFilters';

/**
 * Filter state for Live Cells page.
 */
export interface LiveCellFilters {
	lockScriptGroups: string[];      // Lock script group names (empty = show all)
	typeScriptGroups: string[];      // Type script group names (empty = show all)
	hasData: 'all' | 'with' | 'without';  // Tri-state for data filter
	minCellCkb: number | null;       // Minimum capacity in CKB
	blockRange: BlockRangeFilter;    // Reuse from AddressTransactionFilters
}

/**
 * Sort state for Live Cells page.
 */
export interface LiveCellSort {
	direction: 'asc' | 'desc';
}

/**
 * Default filter values.
 */
export const DEFAULT_LIVE_CELL_FILTERS: LiveCellFilters = {
	lockScriptGroups: [],
	typeScriptGroups: [],
	hasData: 'all',
	minCellCkb: null,
	blockRange: { preset: 'all', customStart: null, customEnd: null },
};

/**
 * Default sort values.
 */
export const DEFAULT_LIVE_CELL_SORT: LiveCellSort = {
	direction: 'desc',  // Newest first
};

/**
 * Present scripts structure for smart counts.
 * Tracks which script groups are present and their counts.
 */
export interface PresentScripts {
	typeGroups: Map<string, number>;  // groupName -> count
	lockGroups: Map<string, number>;  // groupName -> count
}

/**
 * Filter object for indexer search key.
 */
export interface IndexerSearchKeyFilter {
	script?: RpcScript;
	script_search_mode?: 'prefix' | 'exact' | 'partial';
	output_data_len_range?: [string, string];
	output_capacity_range?: [string, string];
	block_range?: [string, string];
}

/**
 * Block range preset options.
 */
export const BLOCK_RANGE_OPTIONS: { value: BlockRangeFilter['preset']; label: string }[] = [
	{ value: 'all', label: 'All blocks' },
	{ value: 'last_1k', label: 'Last 1,000 blocks' },
	{ value: 'last_10k', label: 'Last 10,000 blocks' },
	{ value: 'last_100k', label: 'Last 100,000 blocks' },
	{ value: 'custom', label: 'Custom range...' },
];

/**
 * Sort order options.
 */
export const SORT_OPTIONS: { value: LiveCellSort['direction']; label: string }[] = [
	{ value: 'desc', label: 'Newest First' },
	{ value: 'asc', label: 'Oldest First' },
];

/**
 * Has Data filter options.
 */
export const HAS_DATA_OPTIONS: { value: LiveCellFilters['hasData']; label: string }[] = [
	{ value: 'all', label: 'Show All' },
	{ value: 'with', label: 'With Data' },
	{ value: 'without', label: 'Without Data' },
];

/**
 * Build indexer filter from Live Cell filters.
 * Note: Lock script groups are handled client-side, not in this filter.
 *
 * @param filters - The live cell filters.
 * @param tipBlockNumber - Current chain tip for block range presets.
 * @param network - The network type for script lookup.
 * @returns IndexerSearchKeyFilter or undefined if no filters active.
 */
export function buildCellIndexerFilter(
	filters: LiveCellFilters,
	tipBlockNumber: bigint | null,
	network: NetworkType
): IndexerSearchKeyFilter | undefined {
	const filter: IndexerSearchKeyFilter = {};
	let hasFilter = false;

	// Type script filter (uses first group's first script when multiple selected).
	if (filters.typeScriptGroups.length > 0) {
		const firstGroup = filters.typeScriptGroups[0];
		const codeHashes = getCodeHashesForGroup(firstGroup, network);
		if (codeHashes.length > 0) {
			const scriptInfo = getScriptInfo(codeHashes[0], network);
			if (scriptInfo) {
				filter.script = {
					code_hash: scriptInfo.codeHash,
					hash_type: scriptInfo.hashType,
					args: '0x',
				};
				filter.script_search_mode = 'prefix';  // Match any args
				hasFilter = true;
			}
		}
	}

	// Has Data filter.
	if (filters.hasData === 'with') {
		// Data length >= 1 byte
		filter.output_data_len_range = ['0x1', '0xffffffffffffffff'];
		hasFilter = true;
	} else if (filters.hasData === 'without') {
		// Data length exactly 0 (range is [start, end) exclusive)
		filter.output_data_len_range = ['0x0', '0x1'];
		hasFilter = true;
	}

	// Min cell CKB filter.
	if (filters.minCellCkb !== null) {
		const minShannons = BigInt(Math.floor(filters.minCellCkb * 100_000_000));
		filter.output_capacity_range = [
			'0x' + minShannons.toString(16),
			'0xffffffffffffffff',  // Max uint64
		];
		hasFilter = true;
	}

	// Block range filter.
	if (filters.blockRange.preset !== 'all' && tipBlockNumber !== null) {
		const range = resolveBlockRange(filters.blockRange, tipBlockNumber);
		if (range) {
			filter.block_range = range;
			hasFilter = true;
		}
	}

	return hasFilter ? filter : undefined;
}

/**
 * Filter cells by lock script groups (client-side).
 * The indexer doesn't support lock script filtering, so this is done after fetching.
 * Supports the special "Other" group for non-well-known scripts.
 *
 * @param cells - The cells to filter.
 * @param lockScriptGroups - The lock script groups to match (empty = no filter).
 * @param networkType - The network type.
 * @returns Filtered cells.
 */
export function filterCellsByLockScript(
	cells: RpcCell[],
	lockScriptGroups: string[],
	networkType: NetworkType
): RpcCell[] {
	if (lockScriptGroups.length === 0) return cells;

	const includeOther = lockScriptGroups.includes(OTHER_SCRIPTS_GROUP);
	const otherGroups = lockScriptGroups.filter(g => g !== OTHER_SCRIPTS_GROUP);

	return cells.filter(cell => {
		const codeHash = cell.output.lock.code_hash;

		// Check if this is an "Other" (non-well-known) script.
		if (includeOther && isOtherLockScript(codeHash, networkType)) {
			return true;
		}

		// Check if it matches any of the selected groups.
		if (otherGroups.length > 0) {
			const cellLockGroups = getLockScriptGroups(codeHash, networkType);
			if (cellLockGroups?.some(group => otherGroups.includes(group))) {
				return true;
			}
		}

		return false;
	});
}

/**
 * Filter cells by type script groups (client-side).
 * Supports the special "Other" group for non-well-known scripts.
 *
 * @param cells - The cells to filter.
 * @param typeScriptGroups - The type script groups to match (empty = no filter).
 * @param networkType - The network type.
 * @returns Filtered cells.
 */
export function filterCellsByTypeScript(
	cells: RpcCell[],
	typeScriptGroups: string[],
	networkType: NetworkType
): RpcCell[] {
	if (typeScriptGroups.length === 0) return cells;

	const includeNone = typeScriptGroups.includes(NO_TYPE_SCRIPT_GROUP);
	const includeOther = typeScriptGroups.includes(OTHER_SCRIPTS_GROUP);
	const knownGroups = typeScriptGroups.filter(g => g !== OTHER_SCRIPTS_GROUP && g !== NO_TYPE_SCRIPT_GROUP);

	return cells.filter(cell => {
		const typeScript = cell.output.type;

		// Cell has no type script.
		if (!typeScript) {
			return includeNone;
		}

		const codeHash = typeScript.code_hash;

		// Check if this is an "Other" (non-well-known) script.
		if (includeOther && isOtherTypeScript(codeHash, networkType)) {
			return true;
		}

		// Check if it matches any of the selected groups.
		if (knownGroups.length > 0) {
			// Use the existing getTypeScriptGroup logic.
			const info = KNOWN_TYPE_SCRIPTS[networkType === 'mainnet' ? 'mainnet' : 'testnet'][codeHash];
			if (info?.groups?.some(group => knownGroups.includes(group))) {
				return true;
			}
		}

		return false;
	});
}

