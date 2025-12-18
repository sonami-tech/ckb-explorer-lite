import { useState, useEffect } from 'react';
import { CopyButton } from './CopyButton';

interface TruncatedDataProps {
	/** The data to display. */
	data: string;
	/** Desktop character limit before truncation. Default 128. */
	desktopLimit?: number;
	/** Mobile character limit before truncation. Default 64. */
	mobileLimit?: number;
	/** Breakpoint for mobile/desktop in pixels. Default 640 (sm). */
	breakpoint?: number;
	/** Show copy button. Default true. */
	showCopy?: boolean;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Insert a word break opportunity at the midpoint of a string.
 * Allows the browser to wrap long strings without affecting copy/paste.
 */
function insertWordBreak(text: string): React.ReactNode {
	if (text.length < 10) return text;

	const midpoint = Math.floor(text.length / 2);
	return (
		<>
			{text.slice(0, midpoint)}
			<wbr />
			{text.slice(midpoint)}
		</>
	);
}

/**
 * Responsive data display component.
 * Shows first N characters + "..." if data exceeds limit.
 * Desktop: 128 chars, Mobile: 64 chars by default.
 * Inserts word break opportunity at 50% for natural wrapping.
 */
export function TruncatedData({
	data,
	desktopLimit = 128,
	mobileLimit = 64,
	breakpoint = 640,
	showCopy = true,
	className = '',
}: TruncatedDataProps) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, [breakpoint]);

	const limit = isMobile ? mobileLimit : desktopLimit;
	const isTruncated = data.length > limit;
	const displayData = isTruncated ? `${data.slice(0, limit)}...` : data;

	return (
		<div className={`flex items-start gap-2 ${className}`}>
			<span className="font-mono text-sm break-all">{insertWordBreak(displayData)}</span>
			{showCopy && <CopyButton text={data} />}
		</div>
	);
}
