import { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon } from './CopyButton';
import { TYPE_SCRIPT_GROUPS } from '../lib/scriptGroups';
import { FilterModalShell } from './FilterModalShell';
import {
	DEFAULT_ADDRESS_FILTERS,
	DEFAULT_ADDRESS_SORT,
	type AddressPageFilters,
	type AddressPageSort,
	type BlockRangeFilter,
} from './AddressTransactionFilters';

export interface AddressFilterModalProps {
	isOpen: boolean;
	onClose: () => void;

	// Current applied state (read on open to initialize pending).
	filters: AddressPageFilters;
	sort: AddressPageSort;

	// Single handler to apply all changes.
	onApply: (filters: AddressPageFilters, sort: AddressPageSort) => void;
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
 * Full-screen modal for mobile filter/sort UI on the Address page.
 * Uses FilterModalShell for consistent modal behavior.
 * Features:
 * - Sort options as radio buttons
 * - Filter sections for min cell CKB, type script, and block range
 * - Pending state pattern: changes are staged until Apply is clicked
 */
export function AddressFilterModal({
	isOpen,
	onClose,
	filters,
	sort,
	onApply,
}: AddressFilterModalProps) {
	const [blockRangeDropdownOpen, setBlockRangeDropdownOpen] = useState(false);

	const blockRangeDropdownRef = useRef<HTMLDivElement>(null);
	const blockRangeButtonRef = useRef<HTMLButtonElement>(null);

	// Track whether the modal was open on the previous render.
	const wasOpenRef = useRef(false);

	// Dropdown positions for portal rendering.
	const [blockRangeDropdownPos, setBlockRangeDropdownPos] = useState({ top: 0, left: 0, width: 0 });

	// Pending state for staging changes before apply.
	const [pendingFilters, setPendingFilters] = useState<AddressPageFilters>(filters);
	const [pendingSort, setPendingSort] = useState<AddressPageSort>(sort);

	useClickOutside(blockRangeDropdownRef, () => setBlockRangeDropdownOpen(false));

	// Update dropdown position when it opens.
	useEffect(() => {
		if (blockRangeDropdownOpen && blockRangeButtonRef.current) {
			const rect = blockRangeButtonRef.current.getBoundingClientRect();
			setBlockRangeDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
		}
	}, [blockRangeDropdownOpen]);

	// Sync pending state when modal transitions from closed to open.
	// This is a legitimate use case: we intentionally sync state when isOpen changes from false to true.
	// The cascading render is acceptable because it only happens once per modal open.
	/* eslint-disable react-hooks/refs -- tracking previous isOpen state requires render-time ref access */
	if (isOpen && !wasOpenRef.current) {
		setPendingFilters(filters);
		setPendingSort(sort);
	}
	wasOpenRef.current = isOpen;
	/* eslint-enable react-hooks/refs */

	// Handler for apply button.
	const handleApply = useCallback(() => {
		onApply(pendingFilters, pendingSort);
		onClose();
	}, [pendingFilters, pendingSort, onApply, onClose]);

	// Handler for clear all button.
	const handleClearAll = useCallback(() => {
		setPendingFilters(DEFAULT_ADDRESS_FILTERS);
		setPendingSort(DEFAULT_ADDRESS_SORT);
	}, []);

	// Update a single filter field.
	const updateFilter = useCallback(<K extends keyof AddressPageFilters>(
		key: K,
		value: AddressPageFilters[K]
	) => {
		setPendingFilters(prev => ({ ...prev, [key]: value }));
	}, []);

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
			setPendingFilters(prev => ({
				...prev,
				blockRange: {
					preset: 'custom',
					customStart: prev.blockRange.customStart,
					customEnd: prev.blockRange.customEnd,
				},
			}));
		} else {
			updateFilter('blockRange', { preset, customStart: null, customEnd: null });
		}
		setBlockRangeDropdownOpen(false);
	}, [updateFilter]);

	// Handle custom block number input.
	const handleCustomBlockInput = useCallback((
		field: 'customStart' | 'customEnd',
		value: string
	) => {
		if (value === '') {
			setPendingFilters(prev => ({
				...prev,
				blockRange: { ...prev.blockRange, [field]: null },
			}));
		} else {
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed) && parsed >= 0) {
				setPendingFilters(prev => ({
					...prev,
					blockRange: { ...prev.blockRange, [field]: parsed },
				}));
			}
		}
	}, []);

	// Get current labels.
	const blockRangeLabel = BLOCK_RANGE_OPTIONS.find(
		opt => opt.value === pendingFilters.blockRange.preset
	)?.label ?? 'All blocks';

	// Get all type script groups sorted alphabetically.
	const allTypeGroups = Object.keys(TYPE_SCRIPT_GROUPS).sort((a, b) => a.localeCompare(b));

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
				<div className="space-y-1">
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
					{allTypeGroups.map((groupName) => (
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
						</label>
					))}
				</div>
			</section>

			{/* Block range section. */}
			<section className="mb-6">
				<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
					Block Range
				</h3>
				<div className="relative">
					<button
						ref={blockRangeButtonRef}
						type="button"
						onClick={() => setBlockRangeDropdownOpen(prev => !prev)}
						className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
						aria-haspopup="listbox"
						aria-expanded={blockRangeDropdownOpen}
					>
						{blockRangeLabel}
					</button>
					<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
				</div>

				{/* Custom range inputs (when custom is selected). */}
				{pendingFilters.blockRange.preset === 'custom' && (
					<div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
						<div className="space-y-4">
							{/* From Block input. */}
							<div>
								<label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
									From Block
								</label>
								<input
									type="number"
									inputMode="numeric"
									min="0"
									step="1"
									value={pendingFilters.blockRange.customStart ?? ''}
									onChange={(e) => handleCustomBlockInput('customStart', e.target.value)}
									placeholder="(optional)"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
							</div>

							{/* To Block input. */}
							<div>
								<label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
									To Block
								</label>
								<input
									type="number"
									inputMode="numeric"
									min="0"
									step="1"
									value={pendingFilters.blockRange.customEnd ?? ''}
									onChange={(e) => handleCustomBlockInput('customEnd', e.target.value)}
									placeholder="(optional)"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
							</div>
						</div>
					</div>
				)}
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

			{/* Block range dropdown (portaled to avoid clipping). */}
			{blockRangeDropdownOpen && createPortal(
				<div
					ref={blockRangeDropdownRef}
					className="fixed py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-[100]"
					style={{
						top: `${blockRangeDropdownPos.top}px`,
						left: `${blockRangeDropdownPos.left}px`,
						width: `${blockRangeDropdownPos.width}px`,
					}}
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
				</div>,
				document.body
			)}
		</FilterModalShell>
	);
}
