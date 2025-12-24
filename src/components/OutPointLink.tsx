import { navigate, generateLink } from '../lib/router';
import { truncateHex } from '../lib/format';
import { useIsMobile } from '../hooks/ui';

interface OutPointLinkProps {
	/** Transaction hash. */
	txHash: string;
	/** Output index. */
	index: number;
	/** Show full hash on desktop/tablet, truncated on mobile. Default true. */
	responsive?: boolean;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Consistent outpoint display component for cell references.
 * Format: tx_hash:index with link icon.
 * - Desktop/tablet: Full tx_hash (when responsive=true)
 * - Mobile: Truncated 8...8
 * - Click navigates to cell page.
 *
 * Note: No archive height needed - CellPage uses getCellLifecycle which
 * returns complete lifecycle info regardless of when the cell was consumed.
 */
export function OutPointLink({
	txHash,
	index,
	responsive = true,
	className = '',
}: OutPointLinkProps) {
	const isMobile = useIsMobile();
	const shouldTruncate = responsive ? isMobile : true;
	const displayHash = shouldTruncate ? truncateHex(txHash, 8, 8) : txHash;

	const handleClick = () => {
		navigate(generateLink(`/cell/${txHash}/${index}`));
	};

	return (
		<button
			onClick={handleClick}
			className={`inline-flex items-center gap-1.5 text-nervos hover:text-nervos-dark transition-colors group ${className}`}
			title={`${txHash}:${index}`}
		>
			<span className="font-mono text-sm">
				{displayHash}:{index}
			</span>
			<svg
				className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
				/>
			</svg>
		</button>
	);
}
