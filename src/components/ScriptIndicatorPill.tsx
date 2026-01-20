/**
 * Unified script indicator pill component for consistent display of scripts.
 * Uses category-based colors for visual differentiation between script types.
 * Supports both well-known scripts and "Other" (unknown) scripts.
 */

import { generateLink } from '../lib/router';
import { truncateHex } from '../lib/format';
import { getScriptCategoryStyle, SCRIPT_CAT_OTHER } from '../lib/badgeStyles';
import { TooltipLink } from './TooltipLink';
import { Tooltip } from './Tooltip';

interface ScriptIndicatorPillProps {
	/** Script name to display (ignored if isOther is true). */
	name: string;
	/** Resource ID for linking to /resources#id. */
	resourceId?: string;
	/** Description shown in tooltip on hover. */
	description?: string;
	/** Size variant: 'sm' for section headers, 'xs' for compact lists. */
	size?: 'sm' | 'xs';
	/** Additional CSS classes. */
	className?: string;
	/** Whether this is an unknown/other script (not in well-known registry). */
	isOther?: boolean;
	/** Script type: 'lock' or 'type' (used for Other tooltip). */
	scriptType?: 'lock' | 'type';
	/** Full code hash (used for Other tooltip). */
	codeHash?: string;
}

/**
 * Display a script as a colored pill badge.
 * For well-known scripts: links to resources page when resourceId is provided.
 * For unknown scripts: shows "Other" with tooltip containing script type and truncated hash.
 */
export function ScriptIndicatorPill({
	name,
	resourceId,
	description,
	size = 'xs',
	className = '',
	isOther = false,
	scriptType,
	codeHash,
}: ScriptIndicatorPillProps) {
	// Size-based styling.
	const sizeClasses = size === 'sm'
		? 'text-sm px-2.5 py-0.5'
		: 'text-xs px-2 py-0.5';

	// Handle "Other" (unknown) scripts.
	if (isOther) {
		const tooltipLines: string[] = [];
		if (scriptType === 'lock') {
			tooltipLines.push('Unknown Lock Script');
		} else if (scriptType === 'type') {
			tooltipLines.push('Unknown Type Script');
		} else {
			tooltipLines.push('Unknown Script');
		}
		if (codeHash) {
			tooltipLines.push(truncateHex(codeHash, 8, 6));
		}
		const tooltipContent = tooltipLines.join('\n');

		const pillClasses = `inline-flex items-center rounded-full font-medium ${sizeClasses} ${SCRIPT_CAT_OTHER} cursor-default ${className}`;

		return (
			<Tooltip content={tooltipContent}>
				<span className={pillClasses}>
					Other
				</span>
			</Tooltip>
		);
	}

	// Well-known script handling.
	const categoryStyle = getScriptCategoryStyle(name);
	const hasLink = !!resourceId;
	const resourceUrl = hasLink ? generateLink(`/resources#${resourceId}`) : undefined;

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

	// No link, just plain pill (with tooltip if description provided).
	if (description) {
		return (
			<Tooltip content={description}>
				<span className={pillClasses}>
					{name}
				</span>
			</Tooltip>
		);
	}

	return (
		<span className={pillClasses}>
			{name}
		</span>
	);
}
