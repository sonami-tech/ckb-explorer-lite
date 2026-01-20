import { useCallback, useState, useRef } from 'react';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon } from './CopyButton';
import { FilterModalShell } from './FilterModalShell';
import { TYPE_SCRIPT_GROUPS, LOCK_SCRIPT_GROUPS } from '../lib/scriptGroups';
import { DEFAULT_BLOCK_FILTERS } from './TransactionFilters';
import type { BlockPageFilters, PresentScripts } from './TransactionFilters';
import type { SortOption, SortValue } from './SortDropdown';

export interface BlockFilterModalProps {
	isOpen: boolean;
	onClose: () => void;

	// Current applied state (read on open to initialize pending).
	sortOptions: SortOption[];
	sortValue: SortValue;
	filters: BlockPageFilters;
	presentScripts: PresentScripts;

	// Default values for reset.
	defaultSort?: SortValue;

	// Single handler to apply all changes.
	onApply: (filters: BlockPageFilters, sort: SortValue) => void;
}

/**
 * Cellbase filter options.
 */
const CELLBASE_OPTIONS: { value: BlockPageFilters['cellbase']; label: string }[] = [
	{ value: 'all', label: 'Show All' },
	{ value: 'only', label: 'Cellbase Only' },
	{ value: 'exclude', label: 'Exclude Cellbase' },
];

/**
 * Default sort value for the block filter modal.
 */
const DEFAULT_SORT: SortValue = { field: 'index', direction: 'desc' };

/**
 * Full-screen modal for mobile filter/sort UI.
 * Uses FilterModalShell for consistent modal behavior.
 * Features:
 * - Sort options as radio buttons
 * - Filter sections for cellbase, minimum values, and scripts
 * - Pending state pattern: changes are collected and applied on "Apply" button
 */
export function BlockFilterModal({
	isOpen,
	onClose,
	sortOptions,
	sortValue,
	filters,
	presentScripts,
	defaultSort = DEFAULT_SORT,
	onApply,
}: BlockFilterModalProps) {
	const [cellbaseDropdownOpen, setCellbaseDropdownOpen] = useState(false);
	const cellbaseDropdownRef = useRef<HTMLDivElement>(null);

	// Track whether the modal was open on the previous render.
	const wasOpenRef = useRef(false);

	// Internal pending state. Initialize to current applied state.
	const [pendingFilters, setPendingFilters] = useState<BlockPageFilters>(filters);
	const [pendingSort, setPendingSort] = useState<SortValue>(sortValue);

	useClickOutside(cellbaseDropdownRef, () => setCellbaseDropdownOpen(false));

	// Sync pending state when modal transitions from closed to open.
	// This is a legitimate use case: we intentionally sync state when isOpen changes from false to true.
	// The cascading render is acceptable because it only happens once per modal open.
	/* eslint-disable react-hooks/refs -- tracking previous isOpen state requires render-time ref access */
	if (isOpen && !wasOpenRef.current) {
		setPendingFilters(filters);
		setPendingSort(sortValue);
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
		setPendingFilters(DEFAULT_BLOCK_FILTERS);
		setPendingSort(defaultSort);
	}, [defaultSort]);

	// Update a single filter field.
	const updateFilter = useCallback(<K extends keyof BlockPageFilters>(
		key: K,
		value: BlockPageFilters[K]
	) => {
		setPendingFilters(prev => ({ ...prev, [key]: value }));
	}, []);

	// Handle number input changes.
	const handleNumberInput = useCallback((
		key: 'minTotalCkb' | 'minInputs' | 'minOutputs',
		value: string
	) => {
		if (value === '') {
			updateFilter(key, null);
		} else {
			const parsed = parseFloat(value);
			if (!isNaN(parsed) && parsed >= 0) {
				updateFilter(key, parsed);
			}
		}
	}, [updateFilter]);

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

	// Clear all type script selections (for "Any" option).
	const clearTypeScriptGroups = useCallback(() => {
		setPendingFilters(prev => ({ ...prev, typeScriptGroups: [] }));
	}, []);

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

	// Clear all lock script selections (for "Any" option).
	const clearLockScriptGroups = useCallback(() => {
		setPendingFilters(prev => ({ ...prev, lockScriptGroups: [] }));
	}, []);

	// Handle sort option selection.
	const handleSortSelect = useCallback((field: string, direction: 'asc' | 'desc') => {
		setPendingSort({ field, direction });
	}, []);

	// Check if a sort option is selected.
	const isSortSelected = useCallback((field: string, direction: 'asc' | 'desc') => {
		return pendingSort.field === field && pendingSort.direction === direction;
	}, [pendingSort]);

	// Get current cellbase label.
	const cellbaseLabel = CELLBASE_OPTIONS.find(opt => opt.value === pendingFilters.cellbase)?.label ?? 'All';

	// Get all known type script groups with their counts (0 if not present).
	const allTypeGroups = Object.keys(TYPE_SCRIPT_GROUPS)
		.map((groupName) => [groupName, presentScripts.typeGroups.get(groupName) ?? 0] as const)
		.sort((a, b) => a[0].localeCompare(b[0]));

	// Get all known lock script groups with their counts (0 if not present).
	const allLockGroups = Object.keys(LOCK_SCRIPT_GROUPS)
		.map((groupName) => [groupName, presentScripts.lockGroups.get(groupName) ?? 0] as const)
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
					Sort By
				</h3>
				<div className="grid grid-cols-2 gap-x-6 gap-y-4">
					{sortOptions.map((option) => (
						<div key={option.field}>
							{/* Descending option. */}
							<label className="flex items-center gap-3 py-1 cursor-pointer">
								<input
									type="radio"
									name="sort"
									checked={isSortSelected(option.field, 'desc')}
									onChange={() => handleSortSelect(option.field, 'desc')}
									className="w-4 h-4 text-nervos focus:ring-nervos focus:ring-2 border-gray-300 dark:border-gray-600"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									<span className="whitespace-nowrap">{option.label}</span>{' '}
									<span className="whitespace-nowrap">({option.descLabel ?? 'Descending'})</span>
								</span>
							</label>
							{/* Ascending option. */}
							<label className="flex items-center gap-3 py-1 cursor-pointer">
								<input
									type="radio"
									name="sort"
									checked={isSortSelected(option.field, 'asc')}
									onChange={() => handleSortSelect(option.field, 'asc')}
									className="w-4 h-4 text-nervos focus:ring-nervos focus:ring-2 border-gray-300 dark:border-gray-600"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300">
									<span className="whitespace-nowrap">{option.label}</span>{' '}
									<span className="whitespace-nowrap">({option.ascLabel ?? 'Ascending'})</span>
								</span>
							</label>
						</div>
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
							<span className="text-xs text-gray-400 dark:text-gray-500">
								({count})
							</span>
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
							<span className="text-xs text-gray-400 dark:text-gray-500">
								({count})
							</span>
						</label>
					))}
				</div>
			</section>

			{/* Cellbase section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Cellbase
				</h3>
				<div ref={cellbaseDropdownRef} className="relative">
					<button
						type="button"
						onClick={() => setCellbaseDropdownOpen(prev => !prev)}
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
						aria-haspopup="listbox"
						aria-expanded={cellbaseDropdownOpen}
					>
						{cellbaseLabel}
					</button>
					<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

					{cellbaseDropdownOpen && (
						<div
							className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 w-full"
							role="listbox"
						>
							{CELLBASE_OPTIONS.map((option) => (
								<div
									key={option.value}
									role="option"
									tabIndex={0}
									aria-selected={pendingFilters.cellbase === option.value}
									onClick={() => {
										updateFilter('cellbase', option.value);
										setCellbaseDropdownOpen(false);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											updateFilter('cellbase', option.value);
											setCellbaseDropdownOpen(false);
										}
									}}
									className={`px-3 py-2 text-sm cursor-pointer ${
										pendingFilters.cellbase === option.value
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

			{/* Minimum Total CKB. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Minimum Total CKB
				</h3>
				<div className="relative">
					<input
						type="number"
						inputMode="decimal"
						min="0"
						step="any"
						value={pendingFilters.minTotalCkb ?? ''}
						onChange={(e) => handleNumberInput('minTotalCkb', e.target.value)}
						placeholder="0"
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
					/>
					<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
						CKB
					</span>
				</div>
			</section>

			{/* Minimum Inputs. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Minimum Inputs
				</h3>
				<input
					type="number"
					inputMode="numeric"
					min="0"
					step="1"
					value={pendingFilters.minInputs ?? ''}
					onChange={(e) => handleNumberInput('minInputs', e.target.value)}
					placeholder="0"
					className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
				/>
			</section>

			{/* Minimum Outputs. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Minimum Outputs
				</h3>
				<input
					type="number"
					inputMode="numeric"
					min="0"
					step="1"
					value={pendingFilters.minOutputs ?? ''}
					onChange={(e) => handleNumberInput('minOutputs', e.target.value)}
					placeholder="0"
					className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
				/>
			</section>
		</FilterModalShell>
	);
}
