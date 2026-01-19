import { Tooltip } from './Tooltip';

interface InfoIconProps {
	/** Tooltip content explaining why a value is unavailable. */
	tooltip: string;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Info icon with tooltip for explaining unavailable values.
 */
export function InfoIcon({ tooltip, className = '' }: InfoIconProps) {
	return (
		<Tooltip content={tooltip}>
			<span
				className={`inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 cursor-help ${className}`}
				aria-label="More information"
			>
				<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
					<text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">i</text>
				</svg>
			</span>
		</Tooltip>
	);
}
