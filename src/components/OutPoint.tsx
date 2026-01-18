import { useState, useCallback } from 'react';
import { generateLink } from '../lib/router';
import { copyToClipboard } from '../lib/clipboard';
import { truncateHex } from '../lib/format';
import { useIsMobile } from '../hooks/ui';
import { Tooltip } from './Tooltip';
import { TooltipLink } from './TooltipLink';

interface OutPointProps {
	/** Transaction hash. */
	txHash: string;
	/** Output index. */
	index: number;
	/** Where text click navigates to. Default: 'cell'. */
	linkTo?: 'cell' | 'transaction';
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Unified outpoint display component.
 *
 * Features:
 * - No-wrap: entire structure stays on one line.
 * - Hash truncation: hash shrinks with ellipsis if container is narrow.
 * - Tooltip on hover showing full outpoint.
 * - Click on text navigates to cell or transaction page.
 * - Copy button icon copies full outpoint to clipboard.
 */
export function OutPoint({
	txHash,
	index,
	linkTo = 'cell',
	className = '',
}: OutPointProps) {
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile(640);

	const outpoint = `${txHash}:${index}`;
	const displayTxHash = isMobile ? truncateHex(txHash, 8, 8) : txHash;

	// Generate the navigation URL.
	const href = linkTo === 'cell'
		? generateLink(`/cell/${txHash}/${index}`)
		: generateLink(`/tx/${txHash}`);

	const handleCopy = useCallback(async () => {
		await copyToClipboard(outpoint);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [outpoint]);

	const handleCopyKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap max-w-full ${className}`}
		>
			{/* Hash and index container - clickable to navigate, with tooltip. */}
			<TooltipLink
				tooltip={outpoint}
				href={href}
				className="inline-flex items-baseline min-w-0 font-mono text-sm cursor-pointer text-nervos hover:text-nervos-dark transition-colors"
			>
				<span className="truncate min-w-0">
					{displayTxHash}
				</span>
				<span className="text-gray-500 flex-shrink-0">:</span>
				<span className="flex-shrink-0">{index}</span>
			</TooltipLink>

			{/* Copy button icon. */}
			<Tooltip content={copied ? 'Copied!' : 'Copy outpoint'} interactive>
				<span
					role="button"
					tabIndex={0}
					onClick={handleCopy}
					onKeyDown={handleCopyKeyDown}
					className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
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
