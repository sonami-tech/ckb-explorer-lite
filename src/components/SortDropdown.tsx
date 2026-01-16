import { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon } from './CopyButton';

export interface SortOption {
	field: string;
	label: string;
	ascLabel?: string;   // e.g., "Oldest First"
	descLabel?: string;  // e.g., "Newest First"
}

export interface SortValue {
	field: string;
	direction: 'asc' | 'desc';
}

interface SortDropdownProps {
	options: SortOption[];
	value: SortValue;
	onChange: (value: SortValue) => void;
}

/**
 * Dropdown for selecting sort field and direction.
 * Displays current sort as "Label (Direction)" and expands to show all options
 * with both ascending and descending variants.
 */
export function SortDropdown({ options, value, onChange }: SortDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(dropdownRef, () => setIsOpen(false));

	// Find current option for display.
	const currentOption = options.find(opt => opt.field === value.field);
	const currentDirectionLabel = value.direction === 'asc'
		? (currentOption?.ascLabel ?? 'Ascending')
		: (currentOption?.descLabel ?? 'Descending');
	const displayText = `${currentOption?.label ?? value.field} (${currentDirectionLabel})`;

	const handleSelect = useCallback((field: string, direction: 'asc' | 'desc') => {
		onChange({ field, direction });
		setIsOpen(false);
	}, [onChange]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent, field: string, direction: 'asc' | 'desc') => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleSelect(field, direction);
		}
	}, [handleSelect]);

	const handleToggleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setIsOpen(prev => !prev);
		} else if (e.key === 'Escape' && isOpen) {
			e.preventDefault();
			setIsOpen(false);
		}
	}, [isOpen]);

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-gray-500 dark:text-gray-400">Sort:</span>
			<div ref={dropdownRef} className="relative">
				<button
					type="button"
					onClick={() => setIsOpen(prev => !prev)}
					onKeyDown={handleToggleKeyDown}
					className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer appearance-none text-left min-w-[180px] focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
					aria-haspopup="listbox"
					aria-expanded={isOpen}
				>
					{displayText}
				</button>
				<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

				{isOpen && (
					<div
						className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 min-w-full"
						role="listbox"
					>
						{options.map((option) => (
							<div key={option.field}>
								{/* Descending option. */}
								<div
									role="option"
									tabIndex={0}
									aria-selected={value.field === option.field && value.direction === 'desc'}
									onClick={() => handleSelect(option.field, 'desc')}
									onKeyDown={(e) => handleKeyDown(e, option.field, 'desc')}
									className={`px-3 py-1.5 text-sm cursor-pointer ${
										value.field === option.field && value.direction === 'desc'
											? 'bg-nervos/10 text-nervos dark:text-nervos'
											: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
									}`}
								>
									{option.label} ({option.descLabel ?? 'Descending'})
								</div>
								{/* Ascending option. */}
								<div
									role="option"
									tabIndex={0}
									aria-selected={value.field === option.field && value.direction === 'asc'}
									onClick={() => handleSelect(option.field, 'asc')}
									onKeyDown={(e) => handleKeyDown(e, option.field, 'asc')}
									className={`px-3 py-1.5 text-sm cursor-pointer ${
										value.field === option.field && value.direction === 'asc'
											? 'bg-nervos/10 text-nervos dark:text-nervos'
											: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
									}`}
								>
									{option.label} ({option.ascLabel ?? 'Ascending'})
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
