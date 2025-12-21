import { useState, useEffect, type RefObject } from 'react';

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
