import { Tooltip } from './Tooltip';
import {
	STATUS_SUCCESS,
	STATUS_ERROR,
	STATUS_WARNING,
	HASH_TYPE,
	HASH_DATA,
	INACTIVE,
} from '../lib/badgeStyles';

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
 * Each option has a tooltip that appears on hover.
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
	// Default styling for active/inactive states.
	const activeClass = option.activeClass || 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
	const inactiveClass = INACTIVE;

	return (
		<Tooltip content={option.tooltip} placement="bottom">
			<span
				className={`
					px-2 py-0.5 text-xs font-medium rounded cursor-help
					transition-colors duration-150
					${isActive ? activeClass : inactiveClass}
				`}
			>
				{option.label}
			</span>
		</Tooltip>
	);
}

// Pre-configured indicators for common use cases.

/** Cell status options. */
const CELL_STATUS_OPTIONS: OptionConfig[] = [
	{
		value: 'live',
		label: 'Live',
		tooltip: 'Cell exists and has not been spent.',
		activeClass: STATUS_SUCCESS,
	},
	{
		value: 'dead',
		label: 'Dead',
		tooltip: 'Cell has been consumed (spent) in a transaction.',
		activeClass: STATUS_ERROR,
	},
	{
		value: 'unknown',
		label: 'Unknown',
		tooltip: 'Cell does not exist at the selected block height.',
		activeClass: STATUS_WARNING,
	},
];

/** Hash type options for scripts. */
const HASH_TYPE_OPTIONS: OptionConfig[] = [
	{
		value: 'type',
		label: 'type',
		tooltip: 'Code cell identified by type script hash.',
		activeClass: HASH_TYPE,
	},
	{
		value: 'data',
		label: 'data',
		tooltip: 'Code cell identified by data hash (legacy).',
		activeClass: HASH_DATA,
	},
	{
		value: 'data1',
		label: 'data1',
		tooltip: 'Code cell identified by data hash (CKB2021).',
		activeClass: HASH_DATA,
	},
	{
		value: 'data2',
		label: 'data2',
		tooltip: 'Code cell identified by data hash (CKB2023).',
		activeClass: HASH_DATA,
	},
];

/** Convenience component for cell status. */
export function CellStatusIndicator({ status }: { status: 'live' | 'dead' | 'unknown' }) {
	return <OptionIndicator options={CELL_STATUS_OPTIONS} activeValue={status} />;
}

/** Convenience component for hash type. */
export function HashTypeIndicator({ hashType }: { hashType: string }) {
	return <OptionIndicator options={HASH_TYPE_OPTIONS} activeValue={hashType} />;
}
