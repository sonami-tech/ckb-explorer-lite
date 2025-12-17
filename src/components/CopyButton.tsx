import { useState, useCallback } from 'react';

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
 * Truncated hash display with copy button.
 */
interface HashDisplayProps {
	hash: string;
	truncate?: boolean;
	prefixLen?: number;
	suffixLen?: number;
	className?: string;
}

export function HashDisplay({
	hash,
	truncate = true,
	prefixLen = 10,
	suffixLen = 10,
	className = '',
}: HashDisplayProps) {
	const displayHash = truncate && hash.length > prefixLen + suffixLen + 4
		? `${hash.slice(0, 2 + prefixLen)}...${hash.slice(-suffixLen)}`
		: hash;

	return (
		<span className={`inline-flex items-center gap-1 font-mono text-sm ${className}`}>
			<span title={hash} className="break-all">
				{displayHash}
			</span>
			<CopyButton text={hash} />
		</span>
	);
}
