import { useState, useCallback } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { useIsMobile } from '../hooks/ui';
import { Tooltip } from './Tooltip';
import { TooltipLink } from './TooltipLink';

/**
 * Address display with consistent truncation, tooltip, copy, and optional navigation.
 * - Mobile: ALWAYS uses 8+4 JS truncation (ckb1qzda...xwsq), regardless of truncate prop
 * - Desktop/tablet with truncate=true: CSS ellipsis when address overflows container
 * - Desktop/tablet with truncate=false: Full address wraps to show complete content
 * - Hover shows full address in tooltip
 * - Text click navigates if linkTo is set, otherwise does nothing
 * - Copy icon copies to clipboard
 */
interface AddressDisplayProps {
	address: string;
	/** URL to navigate to when text is clicked. If not set, text click does nothing. */
	linkTo?: string;
	/** Desktop/tablet only: false allows wrapping to show full address. Mobile always truncates. */
	truncate?: boolean;
	/** Characters to show at start when truncating. Default: 8. */
	prefixLen?: number;
	/** Characters to show at end when truncating. Default: 4. */
	suffixLen?: number;
	className?: string;
}

export function AddressDisplay({
	address,
	linkTo,
	truncate = true,
	prefixLen = 8,
	suffixLen = 4,
	className = '',
}: AddressDisplayProps) {
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile();

	// Mobile: ALWAYS use JS truncation for consistent 8...4 format, regardless of truncate prop.
	// Desktop/tablet: behavior controlled by truncate prop.
	const shouldTruncate = isMobile;

	// Truncate if enabled and address is long enough to need it.
	// Format: prefixLen chars + ... + suffixLen chars.
	const needsTruncation = shouldTruncate && address.length > prefixLen + suffixLen + 3;
	const displayAddress = needsTruncation
		? `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
		: address;

	const handleCopy = useCallback(async () => {
		await copyToClipboard(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [address]);

	const handleCopyKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	// Text styling: nervos color if linkable, default color otherwise.
	const textClassName = linkTo
		? 'cursor-pointer text-nervos hover:text-nervos-dark transition-colors'
		: '';

	// On desktop/tablet, use CSS truncation with ellipsis.
	// overflow-hidden + text-ellipsis truncates with "..." only when text overflows container.
	// max-w-full ensures element respects parent width boundaries.
	const textOverflowClass = !isMobile && truncate
		? 'overflow-hidden text-ellipsis max-w-full'
		: '';

	// When truncate is enabled, use whitespace-nowrap to keep address on one line.
	// When truncate is false (e.g., AddressPage), allow wrapping to show full address.
	const wrapClass = truncate ? 'whitespace-nowrap' : 'break-all';

	return (
		<span
			className={`inline-flex items-center gap-1 font-mono text-sm min-w-0 max-w-full ${wrapClass} ${className}`}
		>
			{/* Address text: TooltipLink if linkTo is set, otherwise plain text with tooltip. */}
			{linkTo ? (
				<TooltipLink
					tooltip={address}
					href={linkTo}
					className={`${textClassName} ${textOverflowClass}`}
				>
					{displayAddress}
				</TooltipLink>
			) : (
				<Tooltip content={address}>
					<span className={textOverflowClass}>{displayAddress}</span>
				</Tooltip>
			)}

			{/* Copy button icon. */}
			<Tooltip content={copied ? 'Copied!' : 'Copy to clipboard'} interactive>
				<span
					role="button"
					tabIndex={0}
					onClick={handleCopy}
					onKeyDown={handleCopyKeyDown}
					className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
				>
					{copied ? (
						<svg className="w-3.5 h-3.5 text-nervos" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					) : (
						<svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					)}
				</span>
			</Tooltip>
		</span>
	);
}
