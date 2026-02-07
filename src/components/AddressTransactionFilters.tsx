/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon, ChevronButton } from './CopyButton';
import { TYPE_SCRIPT_GROUPS, getCodeHashesForGroup, OTHER_SCRIPTS_GROUP, NO_TYPE_SCRIPT_GROUP } from '../lib/scriptGroups';
import { resolveBlockRange, getScriptInfo } from '../lib/filterUtils';
import type { NetworkType } from '../config/networks';
import type { RpcScript } from '../types/rpc';

/**
 * Block range filter configuration.
 */
export interface BlockRangeFilter {
	preset: 'all' | 'last_1k' | 'last_10k' | 'last_100k' | 'custom';
	customStart: number | null;  // Block number, optional
	customEnd: number | null;    // Block number, optional
}

/**
 * Filter state for AddressPage transaction filtering.
 */
export interface AddressPageFilters {
	minCellCkb: number | null;       // In CKB units
	typeScriptGroups: string[];      // Script group names (empty = show all)
	blockRange: BlockRangeFilter;
}

/**
 * Sort state for AddressPage transactions.
 */
export interface AddressPageSort {
	direction: 'asc' | 'desc';  // Only block order available
}

/**
 * Default filter values for AddressPage.
 */
export const DEFAULT_ADDRESS_FILTERS: AddressPageFilters = {
	minCellCkb: null,
	typeScriptGroups: [],
	blockRange: { preset: 'all', customStart: null, customEnd: null },
};

/**
 * Check if any transaction filters are active (non-default).
 */
export function hasActiveFilters(filters: AddressPageFilters): boolean {
	return filters.minCellCkb !== null
		|| filters.typeScriptGroups.length > 0
		|| filters.blockRange.preset !== 'all';
}

/**
 * Default sort values for AddressPage.
 */
export const DEFAULT_ADDRESS_SORT: AddressPageSort = {
	direction: 'desc',  // Newest first
};

/**
 * Filter object for indexer search key.
 */
export interface IndexerSearchKeyFilter {
	script?: RpcScript;
	script_search_mode?: 'prefix' | 'exact' | 'partial';
	output_capacity_range?: [string, string];
	block_range?: [string, string];
}

interface AddressTransactionFiltersProps {
	filters: AddressPageFilters;
	onFiltersChange: (filters: AddressPageFilters) => void;
	sort: AddressPageSort;
	onSortChange: (sort: AddressPageSort) => void;
	isExpanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
}

/**
 * Sort order options.
 */
const SORT_OPTIONS: { value: AddressPageSort['direction']; label: string }[] = [
	{ value: 'desc', label: 'Newest First' },
	{ value: 'asc', label: 'Oldest First' },
];

/**
 * Block range preset options.
 */
const BLOCK_RANGE_OPTIONS: { value: BlockRangeFilter['preset']; label: string }[] = [
	{ value: 'all', label: 'All blocks' },
	{ value: 'last_1k', label: 'Last 1,000 blocks' },
	{ value: 'last_10k', label: 'Last 10,000 blocks' },
	{ value: 'last_100k', label: 'Last 100,000 blocks' },
	{ value: 'custom', label: 'Custom range...' },
];

/**
 * Build indexer filter from AddressPage filters.
 * @param filters - The address page filters.
 * @param tipBlockNumber - Current chain tip for block range presets.
 * @param network - The network type for script lookup.
 * @returns IndexerSearchKeyFilter or undefined if no filters active.
 */
export function buildIndexerFilter(
	filters: AddressPageFilters,
	tipBlockNumber: bigint | null,
	network: NetworkType
): IndexerSearchKeyFilter | undefined {
	const filter: IndexerSearchKeyFilter = {};
	let hasFilter = false;

	// Min cell CKB filter.
	if (filters.minCellCkb !== null) {
		const minShannons = BigInt(Math.floor(filters.minCellCkb * 100_000_000));
		filter.output_capacity_range = [
			'0x' + minShannons.toString(16),
			'0xffffffffffffffff',  // Max uint64
		];
		hasFilter = true;
	}

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
 * Desktop filter panel component for transaction filtering on AddressPage.
 * Provides controls for filtering by min cell CKB, type script, and block range.
 */
export function AddressTransactionFilters({
	filters,
	onFiltersChange,
	sort,
	onSortChange,
	isExpanded,
	onExpandedChange,
}: AddressTransactionFiltersProps) {
	const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
	const [blockRangeDropdownOpen, setBlockRangeDropdownOpen] = useState(false);

	const sortDropdownRef = useRef<HTMLDivElement>(null);
	const blockRangeDropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(sortDropdownRef, () => setSortDropdownOpen(false));
	useClickOutside(blockRangeDropdownRef, () => setBlockRangeDropdownOpen(false));

	// Update a single filter field.
	const updateFilter = useCallback(<K extends keyof AddressPageFilters>(
		key: K,
		value: AddressPageFilters[K]
	) => {
		onFiltersChange({ ...filters, [key]: value });
	}, [filters, onFiltersChange]);

	// Handle min CKB input changes.
	const handleMinCkbInput = useCallback((value: string) => {
		if (value === '') {
			updateFilter('minCellCkb', null);
		} else {
			const parsed = parseFloat(value);
			if (!isNaN(parsed) && parsed >= 0) {
				updateFilter('minCellCkb', parsed);
			}
		}
	}, [updateFilter]);

	// Toggle type script group selection.
	const toggleTypeScriptGroup = useCallback((groupName: string) => {
		const current = filters.typeScriptGroups;
		const newSelection = current.includes(groupName)
			? current.filter(g => g !== groupName)
			: [...current, groupName];
		updateFilter('typeScriptGroups', newSelection);
	}, [filters.typeScriptGroups, updateFilter]);

	// Clear all type script selections (for "Show All" option).
	const clearTypeScriptGroups = useCallback(() => {
		updateFilter('typeScriptGroups', []);
	}, [updateFilter]);

	// Handle block range preset change.
	const handleBlockRangePresetChange = useCallback((preset: BlockRangeFilter['preset']) => {
		if (preset === 'custom') {
			updateFilter('blockRange', {
				preset: 'custom',
				customStart: filters.blockRange.customStart,
				customEnd: filters.blockRange.customEnd,
			});
		} else {
			updateFilter('blockRange', { preset, customStart: null, customEnd: null });
		}
		setBlockRangeDropdownOpen(false);
	}, [filters.blockRange, updateFilter]);

	// Handle custom block number input.
	const handleCustomBlockInput = useCallback((
		field: 'customStart' | 'customEnd',
		value: string
	) => {
		if (value === '') {
			updateFilter('blockRange', { ...filters.blockRange, [field]: null });
		} else {
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed) && parsed >= 0) {
				updateFilter('blockRange', { ...filters.blockRange, [field]: parsed });
			}
		}
	}, [filters.blockRange, updateFilter]);

	// Get current labels.
	const sortLabel = SORT_OPTIONS.find(opt => opt.value === sort.direction)?.label ?? 'Newest First';
	const blockRangeLabel = BLOCK_RANGE_OPTIONS.find(
		opt => opt.value === filters.blockRange.preset
	)?.label ?? 'All blocks';

	// Get all type script groups sorted alphabetically.
	const allTypeGroups = Object.keys(TYPE_SCRIPT_GROUPS).sort((a, b) => a.localeCompare(b));

	return (
		<div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
			{/* Header with expand/collapse toggle. */}
			<button
				onClick={() => onExpandedChange(!isExpanded)}
				className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
			>
				<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Filters
				</span>
				<ChevronButton
					isExpanded={isExpanded}
					onClick={(e) => {
						e?.stopPropagation();
						onExpandedChange(!isExpanded);
					}}
				/>
			</button>

			{/* Expanded content. */}
			{isExpanded && (
				<div className="px-4 pb-4 space-y-4">
					{/* Row 1: Sort Order. */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Sort Order dropdown. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Sort Order
							</label>
							<div ref={sortDropdownRef} className="relative">
								<button
									type="button"
									onClick={() => setSortDropdownOpen(prev => !prev)}
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
									aria-haspopup="listbox"
									aria-expanded={sortDropdownOpen}
								>
									{sortLabel}
								</button>
								<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

								{sortDropdownOpen && (
									<div
										className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 min-w-full"
										role="listbox"
									>
										{SORT_OPTIONS.map((option) => (
											<div
												key={option.value}
												role="option"
												tabIndex={0}
												aria-selected={sort.direction === option.value}
												onClick={() => {
													onSortChange({ direction: option.value });
													setSortDropdownOpen(false);
												}}
												onKeyDown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														onSortChange({ direction: option.value });
														setSortDropdownOpen(false);
													}
												}}
												className={`px-3 py-1.5 text-sm cursor-pointer ${
													sort.direction === option.value
														? 'bg-nervos/10 text-nervos dark:text-nervos'
														: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
												}`}
											>
												{option.label}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Type Scripts checkboxes. */}
					<div>
						<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
							Type Scripts
						</label>
						<div className="grid grid-cols-2 gap-x-6 gap-y-1">
							{/* "Show All" option - checked when no filters are selected. */}
							<label className="flex items-center gap-2 py-1 cursor-pointer">
								<input
									type="checkbox"
									checked={filters.typeScriptGroups.length === 0}
									onChange={clearTypeScriptGroups}
									className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									Show All
								</span>
							</label>
							{allTypeGroups.map((groupName) => (
								<label
									key={groupName}
									className="flex items-center gap-2 py-1 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={filters.typeScriptGroups.includes(groupName)}
										onChange={() => toggleTypeScriptGroup(groupName)}
										className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
									/>
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{groupName}
									</span>
								</label>
							))}
							{/* "Other" option for non-well-known scripts. */}
							<label className="flex items-center gap-2 py-1 cursor-pointer">
								<input
									type="checkbox"
									checked={filters.typeScriptGroups.includes(OTHER_SCRIPTS_GROUP)}
									onChange={() => toggleTypeScriptGroup(OTHER_SCRIPTS_GROUP)}
									className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									{OTHER_SCRIPTS_GROUP}
								</span>
							</label>
							{/* "None" option for transactions with outputs that have no type script. */}
							<label className="flex items-center gap-2 py-1 cursor-pointer">
								<input
									type="checkbox"
									checked={filters.typeScriptGroups.includes(NO_TYPE_SCRIPT_GROUP)}
									onChange={() => toggleTypeScriptGroup(NO_TYPE_SCRIPT_GROUP)}
									className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									{NO_TYPE_SCRIPT_GROUP}
								</span>
							</label>
						</div>
					</div>

					{/* Row 2: Block Range and Has Cell >= CKB. */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Block Range dropdown. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Block Range
							</label>
							<div ref={blockRangeDropdownRef} className="relative">
								<button
									type="button"
									onClick={() => setBlockRangeDropdownOpen(prev => !prev)}
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
									aria-haspopup="listbox"
									aria-expanded={blockRangeDropdownOpen}
								>
									{blockRangeLabel}
								</button>
								<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

								{blockRangeDropdownOpen && (
									<div
										className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 min-w-full"
										role="listbox"
									>
										{BLOCK_RANGE_OPTIONS.map((option) => (
											<div
												key={option.value}
												role="option"
												tabIndex={0}
												aria-selected={filters.blockRange.preset === option.value}
												onClick={() => handleBlockRangePresetChange(option.value)}
												onKeyDown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														handleBlockRangePresetChange(option.value);
													}
												}}
												className={`px-3 py-1.5 text-sm cursor-pointer ${
													filters.blockRange.preset === option.value
														? 'bg-nervos/10 text-nervos dark:text-nervos'
														: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
												}`}
											>
												{option.label}
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Has Cell >= CKB input. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Has Cell &ge; CKB
							</label>
							<div className="relative">
								<input
									type="number"
									min="0"
									step="any"
									value={filters.minCellCkb ?? ''}
									onChange={(e) => handleMinCkbInput(e.target.value)}
									placeholder="0"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-12 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
									CKB
								</span>
							</div>
						</div>
					</div>

					{/* Custom range inputs (when custom is selected). */}
					{filters.blockRange.preset === 'custom' && (
						<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* From Block input. */}
								<div>
									<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
										From Block
									</label>
									<input
										type="number"
										min="0"
										step="1"
										value={filters.blockRange.customStart ?? ''}
										onChange={(e) => handleCustomBlockInput('customStart', e.target.value)}
										placeholder="(optional)"
										className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
									/>
									<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
										(optional)
									</p>
								</div>

								{/* To Block input. */}
								<div>
									<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
										To Block
									</label>
									<input
										type="number"
										min="0"
										step="1"
										value={filters.blockRange.customEnd ?? ''}
										onChange={(e) => handleCustomBlockInput('customEnd', e.target.value)}
										placeholder="(optional)"
										className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
									/>
									<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
										(optional)
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
