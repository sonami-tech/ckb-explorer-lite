import { useState, useCallback } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { formatNumber } from '../lib/format';
import { Tooltip } from './Tooltip';
import { navigate } from '../lib/router';

/**
 * Block number display with formatting, copy, and optional navigation.
 * - Displays formatted number with thousand separators (e.g., 12,345,678)
 * - Copies raw number without formatting (e.g., 12345678)
 * - Text click navigates if linkTo is set, otherwise does nothing
 */
interface BlockNumberDisplayProps {
	blockNumber: number | bigint | string;
	/** URL to navigate to when text is clicked. If not set, text click does nothing. */
	linkTo?: string;
	className?: string;
}

export function BlockNumberDisplay({
	blockNumber,
	linkTo,
	className = '',
}: BlockNumberDisplayProps) {
	const [copied, setCopied] = useState(false);

	// Convert to number for formatting, keep raw string for copying.
	const numValue = typeof blockNumber === 'string' ? BigInt(blockNumber) : blockNumber;
	const rawValue = numValue.toString();
	const displayValue = formatNumber(numValue);

	const handleCopy = useCallback(async () => {
		await copyToClipboard(rawValue);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [rawValue]);

	const handleCopyKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	// Handle text click: navigate if linkTo is set, otherwise do nothing.
	const handleTextClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
		if (!linkTo) return;
		// Allow modifier keys to open in new tab.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(linkTo);
	}, [linkTo]);

	const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (!linkTo) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			navigate(linkTo);
		}
	}, [linkTo]);

	// Text styling: nervos color if linkable, default color otherwise.
	const textClassName = linkTo
		? 'cursor-pointer text-nervos hover:text-nervos-dark transition-colors'
		: '';

	return (
		<span
			className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
		>
			{/* Block number text: link if linkTo is set, otherwise plain text. */}
			{linkTo ? (
				<a
					href={linkTo}
					onClick={handleTextClick}
					onKeyDown={handleTextKeyDown}
					className={textClassName}
				>
					{displayValue}
				</a>
			) : (
				<span>{displayValue}</span>
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
