import { useState, useCallback, useRef, useEffect } from 'react';

export interface OptionConfig {
	/** Unique identifier for the option. */
	value: string;
	/** Display label for the option. */
	label: string;
	/** Tooltip description explaining what this option means. */
	tooltip: string;
	/** Optional color class for active state. Defaults to gray. */
	activeClass?: string;
}

interface OptionIndicatorProps {
	/** Available options to display. */
	options: OptionConfig[];
	/** Currently active option value. */
	activeValue: string;
	/** Additional CSS classes for the container. */
	className?: string;
}

/**
 * Displays a group of option pills where one is active (full color) and others are dimmed.
 * Each option has a tooltip that appears on hover (desktop) or tap (touch devices).
 */
export function OptionIndicator({ options, activeValue, className = '' }: OptionIndicatorProps) {
	return (
		<div className={`inline-flex items-center gap-1.5 ${className}`}>
			{options.map((option) => (
				<OptionPill
					key={option.value}
					option={option}
					isActive={option.value === activeValue}
				/>
			))}
		</div>
	);
}

interface OptionPillProps {
	option: OptionConfig;
	isActive: boolean;
}

function OptionPill({ option, isActive }: OptionPillProps) {
	// Separate states: hover for desktop preview, pinned for click/tap persistence.
	const [isHovered, setIsHovered] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const tooltipRef = useRef<HTMLSpanElement>(null);
	const pillRef = useRef<HTMLSpanElement>(null);

	// Tooltip shows if hovered OR pinned.
	const showTooltip = isHovered || isPinned;

	// Unpin tooltip when clicking outside.
	useEffect(() => {
		if (!isPinned) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (
				pillRef.current &&
				!pillRef.current.contains(e.target as Node) &&
				tooltipRef.current &&
				!tooltipRef.current.contains(e.target as Node)
			) {
				setIsPinned(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('touchstart', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
		};
	}, [isPinned]);

	// Hover controls isHovered state (desktop behavior).
	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	// Click toggles pinned state (touch devices and accessibility).
	const handleClick = useCallback(() => {
		setIsPinned((prev) => !prev);
	}, []);

	// Default styling for active/inactive states.
	// Inactive pills use muted colors instead of opacity to avoid affecting tooltip.
	const activeClass = option.activeClass || 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
	const inactiveClass = 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600';

	return (
		<span
			ref={pillRef}
			role="button"
			tabIndex={0}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick();
				}
			}}
			className={`
				relative px-2 py-0.5 text-xs font-medium rounded cursor-help
				transition-all duration-150
				${isActive ? activeClass : inactiveClass}
			`}
		>
			{option.label}

			{/* Tooltip. */}
			{showTooltip && (
				<span
					ref={tooltipRef}
					className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-2 text-xs font-normal bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
					role="tooltip"
				>
					{option.tooltip}
					{/* Tooltip arrow. */}
					<span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
				</span>
			)}
		</span>
	);
}

// Pre-configured indicators for common use cases.

/** Cell status options. */
export const CELL_STATUS_OPTIONS: OptionConfig[] = [
	{
		value: 'live',
		label: 'Live',
		tooltip: 'Cell exists and has not been spent.',
		activeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
	},
	{
		value: 'dead',
		label: 'Dead',
		tooltip: 'Cell has been consumed (spent) in a transaction.',
		activeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
	},
];

/** Hash type options for scripts. */
export const HASH_TYPE_OPTIONS: OptionConfig[] = [
	{
		value: 'type',
		label: 'type',
		tooltip: 'Code cell identified by type script hash.',
		activeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
	},
	{
		value: 'data',
		label: 'data',
		tooltip: 'Code cell identified by data hash (legacy).',
		activeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
	},
	{
		value: 'data1',
		label: 'data1',
		tooltip: 'Code cell identified by data hash (CKB2021).',
		activeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
	},
	{
		value: 'data2',
		label: 'data2',
		tooltip: 'Code cell identified by data hash (CKB2023).',
		activeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
	},
];

/** Convenience component for cell status. */
export function CellStatusIndicator({ status }: { status: 'live' | 'dead' }) {
	return <OptionIndicator options={CELL_STATUS_OPTIONS} activeValue={status} />;
}

/** Convenience component for hash type. */
export function HashTypeIndicator({ hashType }: { hashType: string }) {
	return <OptionIndicator options={HASH_TYPE_OPTIONS} activeValue={hashType} />;
}
