import { useState, useEffect, useMemo, type RefObject } from 'react';

/**
 * Hook to detect if viewport is below a breakpoint (mobile).
 * @param breakpoint - Width in pixels. Default 640 (Tailwind sm).
 * @returns true if viewport width is less than breakpoint.
 */
export function useIsMobile(breakpoint = 640): boolean {
	const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, [breakpoint]);

	return isMobile;
}

/**
 * Hook to detect clicks outside a referenced element.
 * @param ref - React ref to the element to monitor.
 * @param callback - Function to call when click occurs outside.
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, callback: () => void): void {
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				callback();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [ref, callback]);
}

/** Breakpoint tier for responsive layouts. */
export type BreakpointTier = 'mobile' | 'tablet' | 'desktop';

/** Breakpoint thresholds in pixels. */
const BREAKPOINTS = {
	tablet: 640,   // Tailwind sm
	desktop: 1024, // Tailwind lg
} as const;

/**
 * Hook to detect current breakpoint tier.
 * @returns Current breakpoint: 'mobile' (<640), 'tablet' (640-1023), 'desktop' (>=1024).
 */
export function useBreakpoint(): BreakpointTier {
	const [tier, setTier] = useState<BreakpointTier>(() => {
		const width = window.innerWidth;
		if (width >= BREAKPOINTS.desktop) return 'desktop';
		if (width >= BREAKPOINTS.tablet) return 'tablet';
		return 'mobile';
	});

	useEffect(() => {
		const checkBreakpoint = () => {
			const width = window.innerWidth;
			if (width >= BREAKPOINTS.desktop) setTier('desktop');
			else if (width >= BREAKPOINTS.tablet) setTier('tablet');
			else setTier('mobile');
		};

		window.addEventListener('resize', checkBreakpoint);
		return () => window.removeEventListener('resize', checkBreakpoint);
	}, []);

	return tier;
}

/** Default character limits for each breakpoint tier (hex chars including 0x prefix). */
const DEFAULT_CHAR_LIMITS = {
	mobile: 130,
	tablet: 258,
	desktop: 1026,
} as const;

/** Result of useTruncation hook. */
export interface TruncationResult {
	/** The truncated display string (with ... if truncated). */
	displayData: string;
	/** Whether the data was truncated. */
	isTruncated: boolean;
	/** Size in bytes (hex string length - 2) / 2. */
	byteCount: number;
	/** Current character limit based on breakpoint. */
	charLimit: number;
}

/**
 * Hook for responsive hex data truncation.
 * @param data - Hex string to truncate.
 * @param limits - Optional custom limits per breakpoint.
 * @returns Truncation result with display data, flags, and metrics.
 */
export function useTruncation(
	data: string,
	limits: Partial<Record<BreakpointTier, number>> = {},
): TruncationResult {
	const breakpoint = useBreakpoint();

	return useMemo(() => {
		const charLimit = limits[breakpoint] ?? DEFAULT_CHAR_LIMITS[breakpoint];
		const isTruncated = data.length > charLimit;
		const displayData = isTruncated ? `${data.slice(0, charLimit)}…` : data;
		const byteCount = (data.length - 2) / 2;

		return { displayData, isTruncated, byteCount, charLimit };
	}, [data, breakpoint, limits]);
}
