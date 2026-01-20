import { useCallback, useState, useRef } from 'react';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon } from './CopyButton';
import { FilterModalShell } from './FilterModalShell';
import { TYPE_SCRIPT_GROUPS, LOCK_SCRIPT_GROUPS } from '../lib/scriptGroups';
import {
	DEFAULT_LIVE_CELL_FILTERS,
	DEFAULT_LIVE_CELL_SORT,
	BLOCK_RANGE_OPTIONS,
	SORT_OPTIONS,
	HAS_DATA_OPTIONS,
	type LiveCellFilters,
	type LiveCellSort,
	type PresentScripts,
} from './LiveCellFilters';
import type { BlockRangeFilter } from './AddressTransactionFilters';

export interface LiveCellFilterModalProps {
	isOpen: boolean;
	onClose: () => void;

	// Current applied state (read on open to initialize pending).
	filters: LiveCellFilters;
	sort: LiveCellSort;

	// Present scripts with counts (null when > threshold, no counts available).
	presentScripts: PresentScripts | null;

	// Single handler to apply all changes.
	onApply: (filters: LiveCellFilters, sort: LiveCellSort) => void;
}

/**
 * Full-screen modal for Live Cells filter/sort UI.
 * Uses FilterModalShell for consistent modal behavior.
 *
 * Features:
 * - Sort options as radio buttons (Newest/Oldest First)
 * - Lock script checkboxes with optional counts
 * - Type script checkboxes with optional counts
 * - Has Data tri-state dropdown (All/With Data/Without Data)
 * - Minimum Cell CKB input
 * - Block range dropdown with custom option
 *
 * Uses pending state pattern: changes are collected and applied on "Apply" button.
 */
export function LiveCellFilterModal({
	isOpen,
	onClose,
	filters,
	sort,
	presentScripts,
	onApply,
}: LiveCellFilterModalProps) {
	const [hasDataDropdownOpen, setHasDataDropdownOpen] = useState(false);
	const [blockRangeDropdownOpen, setBlockRangeDropdownOpen] = useState(false);

	const hasDataDropdownRef = useRef<HTMLDivElement>(null);
	const blockRangeDropdownRef = useRef<HTMLDivElement>(null);

	// Track whether the modal was open on the previous render.
	const wasOpenRef = useRef(false);

	// Internal pending state. Initialize to current applied state.
	const [pendingFilters, setPendingFilters] = useState<LiveCellFilters>(filters);
	const [pendingSort, setPendingSort] = useState<LiveCellSort>(sort);

	useClickOutside(hasDataDropdownRef, () => setHasDataDropdownOpen(false));
	useClickOutside(blockRangeDropdownRef, () => setBlockRangeDropdownOpen(false));

	// Sync pending state when modal transitions from closed to open.
	/* eslint-disable react-hooks/refs -- tracking previous isOpen state requires render-time ref access */
	if (isOpen && !wasOpenRef.current) {
		setPendingFilters(filters);
		setPendingSort(sort);
	}
	wasOpenRef.current = isOpen;
	/* eslint-enable react-hooks/refs */

	// Handle apply: commit pending state.
	const handleApply = useCallback(() => {
		onApply(pendingFilters, pendingSort);
		onClose();
	}, [pendingFilters, pendingSort, onApply, onClose]);

	// Handle clear all: reset to defaults.
	const handleClearAll = useCallback(() => {
		setPendingFilters(DEFAULT_LIVE_CELL_FILTERS);
		setPendingSort(DEFAULT_LIVE_CELL_SORT);
	}, []);

	// Update a single filter field.
	const updateFilter = useCallback(<K extends keyof LiveCellFilters>(
		key: K,
		value: LiveCellFilters[K]
	) => {
		setPendingFilters(prev => ({ ...prev, [key]: value }));
	}, []);

	// Handle number input changes for minCellCkb.
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

	// Toggle lock script group selection.
	const toggleLockScriptGroup = useCallback((groupName: string) => {
		setPendingFilters(prev => {
			const current = prev.lockScriptGroups;
			const newSelection = current.includes(groupName)
				? current.filter(g => g !== groupName)
				: [...current, groupName];
			return { ...prev, lockScriptGroups: newSelection };
		});
	}, []);

	// Clear all lock script selections (for "Show All" option).
	const clearLockScriptGroups = useCallback(() => {
		setPendingFilters(prev => ({ ...prev, lockScriptGroups: [] }));
	}, []);

	// Toggle type script group selection.
	const toggleTypeScriptGroup = useCallback((groupName: string) => {
		setPendingFilters(prev => {
			const current = prev.typeScriptGroups;
			const newSelection = current.includes(groupName)
				? current.filter(g => g !== groupName)
				: [...current, groupName];
			return { ...prev, typeScriptGroups: newSelection };
		});
	}, []);

	// Clear all type script selections (for "Show All" option).
	const clearTypeScriptGroups = useCallback(() => {
		setPendingFilters(prev => ({ ...prev, typeScriptGroups: [] }));
	}, []);

	// Handle block range preset change.
	const handleBlockRangePresetChange = useCallback((preset: BlockRangeFilter['preset']) => {
		if (preset === 'custom') {
			updateFilter('blockRange', {
				preset: 'custom',
				customStart: pendingFilters.blockRange.customStart,
				customEnd: pendingFilters.blockRange.customEnd,
			});
		} else {
			updateFilter('blockRange', { preset, customStart: null, customEnd: null });
		}
		setBlockRangeDropdownOpen(false);
	}, [pendingFilters.blockRange, updateFilter]);

	// Handle custom block number input.
	const handleCustomBlockInput = useCallback((
		field: 'customStart' | 'customEnd',
		value: string
	) => {
		if (value === '') {
			updateFilter('blockRange', { ...pendingFilters.blockRange, [field]: null });
		} else {
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed) && parsed >= 0) {
				updateFilter('blockRange', { ...pendingFilters.blockRange, [field]: parsed });
			}
		}
	}, [pendingFilters.blockRange, updateFilter]);

	// Get current labels.
	const hasDataLabel = HAS_DATA_OPTIONS.find(opt => opt.value === pendingFilters.hasData)?.label ?? 'Show All';
	const blockRangeLabel = BLOCK_RANGE_OPTIONS.find(
		opt => opt.value === pendingFilters.blockRange.preset
	)?.label ?? 'All blocks';

	// Get all known lock script groups with their counts (null if no presentScripts).
	const allLockGroups = Object.keys(LOCK_SCRIPT_GROUPS)
		.map((groupName) => {
			const count = presentScripts?.lockGroups.get(groupName);
			return [groupName, count] as const;
		})
		.sort((a, b) => a[0].localeCompare(b[0]));

	// Get all known type script groups with their counts (null if no presentScripts).
	const allTypeGroups = Object.keys(TYPE_SCRIPT_GROUPS)
		.map((groupName) => {
			const count = presentScripts?.typeGroups.get(groupName);
			return [groupName, count] as const;
		})
		.sort((a, b) => a[0].localeCompare(b[0]));

	return (
		<FilterModalShell
			isOpen={isOpen}
			onClose={onClose}
			onApply={handleApply}
			onClearAll={handleClearAll}
			applyLabel="Apply"
		>
			{/* Sort by section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Sort Order
				</h3>
				<div className="space-y-2">
					{SORT_OPTIONS.map((option) => (
						<label
							key={option.value}
							className="flex items-center gap-3 py-1 cursor-pointer"
						>
							<input
								type="radio"
								name="sort"
								checked={pendingSort.direction === option.value}
								onChange={() => setPendingSort({ direction: option.value })}
								className="w-4 h-4 text-nervos focus:ring-nervos focus:ring-2 border-gray-300 dark:border-gray-600"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{option.label}
							</span>
						</label>
					))}
				</div>
			</section>

			{/* Lock scripts section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Lock Scripts
				</h3>
				<div className="grid grid-cols-2 gap-x-6 gap-y-1">
					{/* "Show All" option - checked when no filters are selected. */}
					<label className="flex items-center gap-3 py-1 cursor-pointer">
						<input
							type="checkbox"
							checked={pendingFilters.lockScriptGroups.length === 0}
							onChange={clearLockScriptGroups}
							className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
						/>
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Show All
						</span>
					</label>
					{allLockGroups.map(([groupName, count]) => (
						<label
							key={groupName}
							className="flex items-center gap-3 py-1 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={pendingFilters.lockScriptGroups.includes(groupName)}
								onChange={() => toggleLockScriptGroup(groupName)}
								className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{groupName}
							</span>
							{/* Only show count if presentScripts is available */}
							{count !== undefined && (
								<span className="text-xs text-gray-400 dark:text-gray-500">
									({count})
								</span>
							)}
						</label>
					))}
				</div>
			</section>

			{/* Type scripts section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Type Scripts
				</h3>
				<div className="grid grid-cols-2 gap-x-6 gap-y-1">
					{/* "Show All" option - checked when no filters are selected. */}
					<label className="flex items-center gap-3 py-1 cursor-pointer">
						<input
							type="checkbox"
							checked={pendingFilters.typeScriptGroups.length === 0}
							onChange={clearTypeScriptGroups}
							className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
						/>
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Show All
						</span>
					</label>
					{allTypeGroups.map(([groupName, count]) => (
						<label
							key={groupName}
							className="flex items-center gap-3 py-1 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={pendingFilters.typeScriptGroups.includes(groupName)}
								onChange={() => toggleTypeScriptGroup(groupName)}
								className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{groupName}
							</span>
							{/* Only show count if presentScripts is available */}
							{count !== undefined && (
								<span className="text-xs text-gray-400 dark:text-gray-500">
									({count})
								</span>
							)}
						</label>
					))}
				</div>
			</section>

			{/* Has Data section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Has Data
				</h3>
				<div ref={hasDataDropdownRef} className="relative">
					<button
						type="button"
						onClick={() => setHasDataDropdownOpen(prev => !prev)}
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
						aria-haspopup="listbox"
						aria-expanded={hasDataDropdownOpen}
					>
						{hasDataLabel}
					</button>
					<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

					{hasDataDropdownOpen && (
						<div
							className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 w-full"
							role="listbox"
						>
							{HAS_DATA_OPTIONS.map((option) => (
								<div
									key={option.value}
									role="option"
									tabIndex={0}
									aria-selected={pendingFilters.hasData === option.value}
									onClick={() => {
										updateFilter('hasData', option.value);
										setHasDataDropdownOpen(false);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											updateFilter('hasData', option.value);
											setHasDataDropdownOpen(false);
										}
									}}
									className={`px-3 py-2 text-sm cursor-pointer ${
										pendingFilters.hasData === option.value
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
			</section>

			{/* Minimum Cell CKB. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Minimum Cell CKB
				</h3>
				<div className="relative">
					<input
						type="number"
						inputMode="decimal"
						min="0"
						step="any"
						value={pendingFilters.minCellCkb ?? ''}
						onChange={(e) => handleMinCkbInput(e.target.value)}
						placeholder="0"
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
					/>
					<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
						CKB
					</span>
				</div>
			</section>

			{/* Block Range. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Block Range
				</h3>
				<div ref={blockRangeDropdownRef} className="relative">
					<button
						type="button"
						onClick={() => setBlockRangeDropdownOpen(prev => !prev)}
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
						aria-haspopup="listbox"
						aria-expanded={blockRangeDropdownOpen}
					>
						{blockRangeLabel}
					</button>
					<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

					{blockRangeDropdownOpen && (
						<div
							className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 w-full"
							role="listbox"
						>
							{BLOCK_RANGE_OPTIONS.map((option) => (
								<div
									key={option.value}
									role="option"
									tabIndex={0}
									aria-selected={pendingFilters.blockRange.preset === option.value}
									onClick={() => handleBlockRangePresetChange(option.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleBlockRangePresetChange(option.value);
										}
									}}
									className={`px-3 py-2 text-sm cursor-pointer ${
										pendingFilters.blockRange.preset === option.value
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

				{/* Custom range inputs (when custom is selected). */}
				{pendingFilters.blockRange.preset === 'custom' && (
					<div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
						<div className="grid grid-cols-2 gap-4">
							{/* From Block input. */}
							<div>
								<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
									From Block
								</label>
								<input
									type="number"
									min="0"
									step="1"
									value={pendingFilters.blockRange.customStart ?? ''}
									onChange={(e) => handleCustomBlockInput('customStart', e.target.value)}
									placeholder="(optional)"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
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
									value={pendingFilters.blockRange.customEnd ?? ''}
									onChange={(e) => handleCustomBlockInput('customEnd', e.target.value)}
									placeholder="(optional)"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
							</div>
						</div>
					</div>
				)}
			</section>
		</FilterModalShell>
	);
}
