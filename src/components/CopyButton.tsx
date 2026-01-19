import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { useIsMobile, useClickOutside } from '../hooks/ui';
import { formatBytes } from '../lib/format';
import { Tooltip } from './Tooltip';
import { TooltipLink } from './TooltipLink';
import { hexToBytes } from '../lib/bytes';

interface CopyButtonProps {
	text: string;
	className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		await copyToClipboard(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [text]);

	return (
		<Tooltip content={copied ? 'Copied!' : 'Copy to clipboard'} interactive>
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
		</Tooltip>
	);
}

/**
 * Hash display with consistent truncation, tooltip, copy, and optional navigation.
 * - Default truncation: 8+8 format (0x12345678...12345678)
 * - Never wraps (whitespace-nowrap)
 * - Hover shows full hash in tooltip
 * - Text click navigates if linkTo is set, otherwise does nothing
 * - Copy icon copies to clipboard
 */
interface HashDisplayProps {
	hash: string;
	/** URL to navigate to when text is clicked. If not set, text click does nothing. */
	linkTo?: string;
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
	linkTo,
	truncate = true,
	responsive = false,
	breakpoint = 640,
	prefixLen = 8,
	suffixLen = 8,
	className = '',
}: HashDisplayProps) {
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile(breakpoint);

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
		await copyToClipboard(hash);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [hash]);

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

	return (
		<span
			className={`inline-flex items-center gap-1 font-mono text-sm whitespace-nowrap ${className}`}
		>
			{/* Hash text: TooltipLink if linkTo is set, otherwise plain text with tooltip. */}
			{linkTo ? (
				<TooltipLink tooltip={hash} href={linkTo} className={textClassName}>
					{displayHash}
				</TooltipLink>
			) : (
				<Tooltip content={hash}>
					<span>{displayHash}</span>
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

/**
 * Size badge showing formatted byte count.
 * Shows tooltip with exact byte count when abbreviated (>= 1024 bytes).
 */
interface SizeBadgeProps {
	/** Size in bytes. */
	bytes: number;
	/** Additional CSS classes. */
	className?: string;
	/** Show parentheses around the size. Default: true. */
	parens?: boolean;
}

export function SizeBadge({ bytes, className = '', parens = true }: SizeBadgeProps) {
	const formatted = formatBytes(bytes);
	const exactText = `${bytes.toLocaleString()} bytes`;
	// Show tooltip only when abbreviated (KB, MB, etc.).
	const isAbbreviated = bytes >= 1024;

	const content = (
		<span className={`text-size-meta ${className}`}>
			{parens ? `(${formatted})` : formatted}
		</span>
	);

	if (isAbbreviated) {
		return <Tooltip content={exactText}>{content}</Tooltip>;
	}

	return content;
}

/**
 * Trigger file download.
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Download button with dropdown for hex/binary format selection.
 */
interface DownloadButtonProps {
	/** Hex data to download. */
	data: string;
	/** Base filename without extension. */
	filename?: string;
	/** Additional CSS classes. */
	className?: string;
}

export function DownloadButton({ data, filename = 'data', className = '' }: DownloadButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(dropdownRef, () => setIsOpen(false));

	const handleDownloadHex = useCallback(() => {
		const blob = new Blob([data], { type: 'text/plain' });
		downloadBlob(blob, `${filename}.hex`);
		setIsOpen(false);
	}, [data, filename]);

	const handleDownloadBinary = useCallback(() => {
		const bytes = hexToBytes(data);
		// Copy to fresh ArrayBuffer to satisfy TypeScript's Blob type requirements.
		const buffer = new ArrayBuffer(bytes.length);
		new Uint8Array(buffer).set(bytes);
		const blob = new Blob([buffer], { type: 'application/octet-stream' });
		downloadBlob(blob, `${filename}.bin`);
		setIsOpen(false);
	}, [data, filename]);

	return (
		<div ref={dropdownRef} className={`relative inline-flex ${className}`}>
			<Tooltip content="Download" interactive disabled={isOpen}>
				<span
					role="button"
					tabIndex={0}
					onClick={() => setIsOpen(!isOpen)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							setIsOpen(!isOpen);
						}
					}}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
				>
					<svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
				</span>
			</Tooltip>

			{isOpen && (
				<div className="absolute top-full right-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 min-w-[120px]">
					<button
						onClick={handleDownloadHex}
						className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						Hex (.hex)
					</button>
					<button
						onClick={handleDownloadBinary}
						className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						Binary (.bin)
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Modal button for opening data in full-screen view.
 */
interface ModalButtonProps {
	/** Click handler. */
	onClick: () => void;
	/** Additional CSS classes. */
	className?: string;
}

export function ModalButton({ onClick, className = '' }: ModalButtonProps) {
	return (
		<Tooltip content="View full data" interactive>
			<span
				role="button"
				tabIndex={0}
				onClick={onClick}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onClick();
					}
				}}
				className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex ${className}`}
			>
				<svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
				</svg>
			</span>
		</Tooltip>
	);
}

/**
 * Chevron button for inline expand/collapse.
 */
interface ChevronButtonProps {
	/** Whether the content is currently expanded. */
	isExpanded: boolean;
	/** Click handler. */
	onClick: (e?: React.MouseEvent) => void;
	/** Additional CSS classes. */
	className?: string;
}

export function ChevronButton({ isExpanded, onClick, className = '' }: ChevronButtonProps) {
	return (
		<Tooltip content={isExpanded ? 'Collapse' : 'Expand'} interactive>
			<span
				role="button"
				tabIndex={0}
				onClick={(e) => onClick(e)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onClick();
					}
				}}
				className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex ${className}`}
			>
				<svg
					className={`w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</span>
		</Tooltip>
	);
}

interface ChevronDownIconProps {
	/** Size class for the icon (default: 'w-4 h-4'). */
	size?: string;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Chevron down icon for dropdown selects.
 * Used with absolute positioning inside a relative container.
 */
export function ChevronDownIcon({ size = 'w-4 h-4', className = '' }: ChevronDownIconProps) {
	return (
		<svg
			className={`${size} text-gray-400 pointer-events-none ${className}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
		</svg>
	);
}
