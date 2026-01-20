/**
 * Filter types and utilities for Live Cells page.
 *
 * Provides:
 * - Filter and sort type definitions
 * - Filter builder for indexer search key
 * - Client-side lock script filtering
 * - Present scripts interface for smart counts
 */

import { getCodeHashesForGroup, getLockScriptGroups } from '../lib/scriptGroups';
import { KNOWN_TYPE_SCRIPTS } from '../lib/wellKnown';
import type { NetworkType } from '../config/networks';
import type { RpcScript, RpcCell } from '../types/rpc';
import type { BlockRangeFilter } from './AddressTransactionFilters';

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
 * Resolve block range filter to indexer format [start, end).
 */
function resolveBlockRange(
	range: BlockRangeFilter,
	tipBlockNumber: bigint
): [string, string] | null {
	const toHex = (n: bigint) => '0x' + n.toString(16);

	switch (range.preset) {
		case 'all':
			return null;
		case 'last_1k': {
			const start = tipBlockNumber > 1000n ? tipBlockNumber - 1000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'last_10k': {
			const start = tipBlockNumber > 10000n ? tipBlockNumber - 10000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'last_100k': {
			const start = tipBlockNumber > 100000n ? tipBlockNumber - 100000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'custom': {
			const start = range.customStart !== null ? BigInt(range.customStart) : 0n;
			const end = range.customEnd !== null ? BigInt(range.customEnd) + 1n : tipBlockNumber + 1n;
			return [toHex(start), toHex(end)];
		}
	}
}

/**
 * Get script info (including hash type) for a code hash.
 */
function getScriptInfo(
	codeHash: string,
	network: NetworkType
): { codeHash: string; hashType: 'type' | 'data' | 'data1' | 'data2' } | null {
	const registryNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
	const info = KNOWN_TYPE_SCRIPTS[registryNetwork][codeHash];
	if (!info) return null;

	return { codeHash, hashType: info.hashType };
}

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

	return cells.filter(cell => {
		const cellLockGroups = getLockScriptGroups(cell.output.lock.code_hash, networkType);
		return cellLockGroups?.some(group => lockScriptGroups.includes(group)) ?? false;
	});
}

/**
 * Check if any filters are active.
 */
export function hasActiveFilters(filters: LiveCellFilters): boolean {
	return (
		filters.lockScriptGroups.length > 0 ||
		filters.typeScriptGroups.length > 0 ||
		filters.hasData !== 'all' ||
		filters.minCellCkb !== null ||
		filters.blockRange.preset !== 'all'
	);
}

/**
 * Check if sort is non-default.
 */
export function hasNonDefaultSort(sort: LiveCellSort): boolean {
	return sort.direction !== 'desc';
}

/**
 * Get the label for a block range preset.
 */
export function getBlockRangeLabel(range: BlockRangeFilter): string {
	const option = BLOCK_RANGE_OPTIONS.find(opt => opt.value === range.preset);
	return option?.label ?? 'All blocks';
}
