import { TooltipIconLink } from './TooltipLink';

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
	return (
		<TooltipIconLink tooltip={tooltip} href={linkTo} className={className}>
			<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
			</svg>
		</TooltipIconLink>
	);
}
