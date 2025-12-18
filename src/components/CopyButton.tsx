import { useState, useCallback, useEffect } from 'react';

interface CopyButtonProps {
	text: string;
	className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback for older browsers.
			const textarea = document.createElement('textarea');
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}, [text]);

	return (
		<span
			role="button"
			tabIndex={0}
			onClick={handleCopy}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleCopy();
				}
			}}
			className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex ${className}`}
			title={copied ? 'Copied!' : 'Copy to clipboard'}
		>
			{copied ? (
				<svg className="w-4 h-4 text-nervos" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			)}
		</span>
	);
}

/**
 * Hash display with consistent truncation, tooltip, and click-to-copy.
 * - Default truncation: 8+8 format (0x12345678...12345678)
 * - Never wraps (whitespace-nowrap)
 * - Hover shows full hash in tooltip
 * - Click copies to clipboard and shows "Copied!" confirmation
 */
interface HashDisplayProps {
	hash: string;
	/** Set to false to show full hash without truncation. */
	truncate?: boolean;
	/** Responsive mode: full on desktop/tablet, truncated on mobile only. Overrides truncate. */
	responsive?: boolean;
	/** Breakpoint for mobile in pixels. Default 640 (sm). Only used when responsive=true. */
	breakpoint?: number;
	/** Characters to show after 0x prefix. Default: 8. */
	prefixLen?: number;
	/** Characters to show at end. Default: 8. */
	suffixLen?: number;
	className?: string;
}

export function HashDisplay({
	hash,
	truncate = true,
	responsive = false,
	breakpoint = 640,
	prefixLen = 8,
	suffixLen = 8,
	className = '',
}: HashDisplayProps) {
	const [copied, setCopied] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Handle responsive mode - detect mobile screen size.
	useEffect(() => {
		if (!responsive) return;

		const checkMobile = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, [responsive, breakpoint]);

	// Determine if truncation should be applied.
	// Responsive mode: truncate only on mobile. Otherwise use truncate prop.
	const shouldTruncate = responsive ? isMobile : truncate;

	// Truncate if enabled and hash is long enough to need it.
	// Format: 0x + prefixLen chars + ... + suffixLen chars.
	const needsTruncation = shouldTruncate && hash.length > 2 + prefixLen + suffixLen + 3;
	const displayHash = needsTruncation
		? `${hash.slice(0, 2 + prefixLen)}...${hash.slice(-suffixLen)}`
		: hash;

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(hash);
			setCopied(true);
			setShowTooltip(true);
			setTimeout(() => {
				setCopied(false);
				setShowTooltip(false);
			}, 2000);
		} catch {
			// Fallback for older browsers.
			const textarea = document.createElement('textarea');
			textarea.value = hash;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			setCopied(true);
			setShowTooltip(true);
			setTimeout(() => {
				setCopied(false);
				setShowTooltip(false);
			}, 2000);
		}
	}, [hash]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	return (
		<span
			className={`inline-flex items-center gap-1 font-mono text-sm whitespace-nowrap ${className}`}
		>
			{/* Hash text with tooltip. */}
			<span
				role="button"
				tabIndex={0}
				onClick={handleCopy}
				onKeyDown={handleKeyDown}
				onMouseEnter={() => !copied && setShowTooltip(true)}
				onMouseLeave={() => !copied && setShowTooltip(false)}
				className="relative cursor-pointer hover:text-nervos transition-colors"
			>
				{displayHash}

				{/* Tooltip - shows full hash on hover, "Copied!" after click. */}
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
							hash
						)}
						{/* Tooltip arrow. */}
						<span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
					</span>
				)}
			</span>

			{/* Copy button icon for visual affordance. */}
			<span
				role="button"
				tabIndex={0}
				onClick={handleCopy}
				onKeyDown={handleKeyDown}
				className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
				title={copied ? 'Copied!' : 'Copy to clipboard'}
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
		</span>
	);
}
