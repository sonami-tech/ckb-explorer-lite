import { useState, useCallback } from 'react';
import { navigate, generateLink } from '../lib/router';
import { copyToClipboard } from '../lib/clipboard';

interface OutPointProps {
	/** Transaction hash. */
	txHash: string;
	/** Output index. */
	index: number;
	/** Where the link icon navigates to. Use 'none' to hide the link icon. */
	linkTo?: 'cell' | 'transaction' | 'none';
	/** Whether to show the copy button icon. Default false. */
	showCopy?: boolean;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Unified outpoint display component.
 *
 * Features:
 * - No-wrap: entire structure stays on one line.
 * - Hash truncation: hash shrinks with ellipsis if container is narrow.
 * - Visible tooltip on hover showing full outpoint.
 * - Click on text copies to clipboard with "Copied!" confirmation.
 * - Optional copy button icon for visual affordance.
 * - Configurable link icon (navigates to cell or transaction page).
 */
export function OutPoint({
	txHash,
	index,
	linkTo = 'cell',
	showCopy = false,
	className = '',
}: OutPointProps) {
	const [copied, setCopied] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);

	const outpoint = `${txHash}:${index}`;

	const handleCopy = useCallback(async () => {
		await copyToClipboard(outpoint);
		setCopied(true);
		setShowTooltip(true);
		setTimeout(() => {
			setCopied(false);
			setShowTooltip(false);
		}, 2000);
	}, [outpoint]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	const handleNavigate = useCallback(() => {
		if (linkTo === 'cell') {
			navigate(generateLink(`/cell/${txHash}/${index}`));
		} else if (linkTo === 'transaction') {
			navigate(generateLink(`/tx/${txHash}`));
		}
	}, [linkTo, txHash, index]);

	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap max-w-full ${className}`}
		>
			{/* Hash and index container - clickable to copy, with tooltip. */}
			<span
				role="button"
				tabIndex={0}
				onClick={handleCopy}
				onKeyDown={handleKeyDown}
				onMouseEnter={() => !copied && setShowTooltip(true)}
				onMouseLeave={() => !copied && setShowTooltip(false)}
				className="relative inline-flex items-baseline min-w-0 font-mono text-sm cursor-pointer hover:text-nervos transition-colors"
			>
				<span className="truncate min-w-0">
					{txHash}
				</span>
				<span className="text-gray-500 flex-shrink-0">:</span>
				<span className="flex-shrink-0">{index}</span>

				{/* Tooltip - shows full outpoint on hover, "Copied!" after click. */}
				{showTooltip && (
					<span
						className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
						role="tooltip"
					>
						{copied ? (
							<span className="flex items-center gap-1">
								<svg className="w-3 h-3 text-nervos" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
								Copied!
							</span>
						) : (
							outpoint
						)}
						{/* Tooltip arrow. */}
						<span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
					</span>
				)}
			</span>

			{/* Copy button icon for visual affordance. */}
			{showCopy && (
				<span
					role="button"
					tabIndex={0}
					onClick={handleCopy}
					onKeyDown={handleKeyDown}
					className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
					title={copied ? 'Copied!' : 'Copy outpoint'}
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
			)}

			{/* Link icon. */}
			{linkTo !== 'none' && (
				<button
					onClick={handleNavigate}
					className="flex-shrink-0 text-nervos hover:text-nervos-dark transition-colors"
					title={linkTo === 'cell' ? 'View cell' : 'View source transaction'}
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</button>
			)}
		</span>
	);
}
