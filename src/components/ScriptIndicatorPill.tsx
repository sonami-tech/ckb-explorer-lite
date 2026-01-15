/**
 * Unified script indicator pill component for consistent display of well-known scripts.
 * Uses category-based colors for visual differentiation between script types.
 */

import { navigate, generateLink } from '../lib/router';
import { getScriptCategoryStyle } from '../lib/badgeStyles';
import { Tooltip } from './Tooltip';

interface ScriptIndicatorPillProps {
	/** Script name to display. */
	name: string;
	/** Resource ID for linking to /resources#id. */
	resourceId?: string;
	/** Description shown in tooltip on hover. */
	description?: string;
	/** Size variant: 'sm' for section headers, 'xs' for compact lists. */
	size?: 'sm' | 'xs';
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Display a well-known script as a colored pill badge.
 * Links to resources page when resourceId is provided.
 * Shows tooltip with description on hover when available.
 */
export function ScriptIndicatorPill({
	name,
	resourceId,
	description,
	size = 'xs',
	className = '',
}: ScriptIndicatorPillProps) {
	const categoryStyle = getScriptCategoryStyle(name);
	const hasLink = !!resourceId;
	const resourceUrl = hasLink ? generateLink(`/resources#${resourceId}`) : undefined;

	// Size-based styling.
	const sizeClasses = size === 'sm'
		? 'text-sm px-2.5 py-0.5'
		: 'text-xs px-2 py-0.5';

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (!resourceUrl) return;
		// Allow modifier keys to open in new tab.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(resourceUrl);
	};

	const pill = (
		<span
			className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${categoryStyle} ${hasLink ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'} ${className}`}
		>
			{name}
		</span>
	);

	// Wrap in link if resourceId is provided.
	const linkedPill = hasLink ? (
		<a href={resourceUrl} onClick={handleClick}>
			{pill}
		</a>
	) : (
		pill
	);

	// Wrap in tooltip if description is provided.
	if (description) {
		return (
			<Tooltip content={description} placement="bottom" interactive={hasLink}>
				{linkedPill}
			</Tooltip>
		);
	}

	return linkedPill;
}
