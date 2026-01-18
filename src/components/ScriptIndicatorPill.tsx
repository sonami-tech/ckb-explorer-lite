/**
 * Unified script indicator pill component for consistent display of well-known scripts.
 * Uses category-based colors for visual differentiation between script types.
 */

import { generateLink } from '../lib/router';
import { getScriptCategoryStyle } from '../lib/badgeStyles';
import { TooltipLink } from './TooltipLink';

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

	const pillClasses = `inline-flex items-center rounded-full font-medium ${sizeClasses} ${categoryStyle} ${hasLink ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'} ${className}`;

	// If has link and description, use TooltipLink for touch-aware behavior.
	if (hasLink && resourceUrl && description) {
		return (
			<TooltipLink tooltip={description} href={resourceUrl} placement="bottom" className={pillClasses}>
				{name}
			</TooltipLink>
		);
	}

	// If has link but no description, use plain link.
	if (hasLink && resourceUrl) {
		return (
			<a href={resourceUrl} className={pillClasses}>
				{name}
			</a>
		);
	}

	// No link, just plain pill.
	return (
		<span className={pillClasses}>
			{name}
		</span>
	);
}
