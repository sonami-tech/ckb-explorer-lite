import { useCallback } from 'react';
import { Tooltip } from './Tooltip';
import { navigate } from '../lib/router';

/**
 * Internal navigation icon (→) for secondary navigation targets.
 * Used when text links to one resource but we need a separate link to another.
 * For example: address text links to address page, but icon links to specific cell.
 */
interface InternalLinkIconProps {
	/** URL to navigate to when clicked. */
	linkTo: string;
	/** Tooltip text describing the navigation target. */
	tooltip: string;
	className?: string;
}

export function InternalLinkIcon({
	linkTo,
	tooltip,
	className = '',
}: InternalLinkIconProps) {
	const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
		// Allow modifier keys to open in new tab.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(linkTo);
	}, [linkTo]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			navigate(linkTo);
		}
	}, [linkTo]);

	return (
		<Tooltip content={tooltip} interactive>
			<a
				href={linkTo}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex text-nervos hover:text-nervos-dark ${className}`}
			>
				<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
				</svg>
			</a>
		</Tooltip>
	);
}
