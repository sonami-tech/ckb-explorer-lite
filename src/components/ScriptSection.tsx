/**
 * ScriptSection component for displaying Lock Script and Type Script details.
 * Includes known script detection with badge, tooltip, and documentation link.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { lookupLockScript, lookupTypeScript, type ScriptInfo } from '../lib/knownScripts';
import { HashDisplay } from './CopyButton';
import { HashTypeIndicator } from './OptionIndicator';
import { TruncatedData } from './TruncatedData';
import { DetailRow } from './DetailRow';

interface Script {
	code_hash: string;
	hash_type: string;
	args: string;
}

interface ScriptSectionProps {
	/** Section title. */
	title: 'Lock Script' | 'Type Script';
	/** The script to display. */
	script: Script;
}

/**
 * Display a script section with known script detection.
 */
export function ScriptSection({ title, script }: ScriptSectionProps) {
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';

	// Look up script info based on type.
	const scriptInfo = title === 'Lock Script'
		? lookupLockScript(script.code_hash, script.hash_type, networkType, script.args)
		: lookupTypeScript(script.code_hash, script.hash_type, networkType, script.args);

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
			{/* Header with optional known script badge. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
				{scriptInfo && <ScriptBadge info={scriptInfo} />}
			</div>

			{/* Script details. */}
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				<DetailRow label="Code Hash">
					<HashDisplay hash={script.code_hash} responsive />
				</DetailRow>
				<DetailRow label="Hash Type">
					<HashTypeIndicator hashType={script.hash_type} />
				</DetailRow>
				<DetailRow label="Args">
					{script.args === '0x' ? (
						<span className="text-gray-500 dark:text-gray-400 italic">Empty</span>
					) : (
						<TruncatedData data={script.args} />
					)}
				</DetailRow>
			</div>
		</div>
	);
}

/**
 * Badge showing known script name with tooltip and documentation link.
 * Desktop: hover shows tooltip, click navigates.
 * Touch: first tap shows tooltip, second tap navigates.
 */
function ScriptBadge({ info }: { info: ScriptInfo }) {
	const [isHovered, setIsHovered] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const badgeRef = useRef<HTMLAnchorElement | HTMLSpanElement>(null);
	const tooltipRef = useRef<HTMLSpanElement>(null);

	const hasLink = !!info.sourceUrl;
	const showTooltip = isHovered || isPinned;

	// Detect if device supports hover.
	const supportsHover = typeof window !== 'undefined' &&
		window.matchMedia('(hover: hover)').matches;

	// Unpin tooltip when clicking outside.
	useEffect(() => {
		if (!isPinned) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (
				badgeRef.current &&
				!badgeRef.current.contains(e.target as Node) &&
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

	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	const handleClick = useCallback((e: React.MouseEvent) => {
		if (hasLink && !supportsHover && !isPinned) {
			// Touch device, first tap: show tooltip, prevent navigation.
			e.preventDefault();
			setIsPinned(true);
		}
		// Desktop or second tap: allow navigation.
	}, [hasLink, supportsHover, isPinned]);

	const badge = (
		<span
			className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-nervos/10 text-nervos ${hasLink ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
		>
			{info.name}
			{hasLink && (
				<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
			)}
		</span>
	);

	const tooltip = showTooltip && (
		<span
			ref={tooltipRef}
			className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-2 text-xs font-normal bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
			role="tooltip"
		>
			{info.description}
			{/* Tooltip arrow. */}
			<span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
		</span>
	);

	if (hasLink) {
		return (
			<a
				ref={badgeRef as React.RefObject<HTMLAnchorElement>}
				href={info.sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="relative"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onClick={handleClick}
			>
				{badge}
				{tooltip}
			</a>
		);
	}

	return (
		<span
			ref={badgeRef as React.RefObject<HTMLSpanElement>}
			className="relative"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{badge}
			{tooltip}
		</span>
	);
}
