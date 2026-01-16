/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/**
 * Breakpoint thresholds in pixels.
 * - Mobile: < 640px (Tailwind sm)
 * - Tablet: 640px - 1023px (Tailwind sm to lg)
 * - Desktop: >= 1024px (Tailwind lg)
 */
const BREAKPOINTS = {
	mobile: 640,
	desktop: 1024,
} as const;

/**
 * Responsive state provided by ResponsiveContext.
 */
interface ResponsiveState {
	/** True if viewport width is less than 640px. */
	isMobile: boolean;
	/** True if viewport width is between 640px and 1023px. */
	isTablet: boolean;
	/** True if viewport width is >= 1024px. */
	isDesktop: boolean;
	/** Current viewport width in pixels. */
	width: number;
}

const ResponsiveContext = createContext<ResponsiveState | undefined>(undefined);

/**
 * Calculate responsive state from window width.
 */
function getResponsiveState(): ResponsiveState {
	const width = document.documentElement.clientWidth;
	return {
		isMobile: width < BREAKPOINTS.mobile,
		isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
		isDesktop: width >= BREAKPOINTS.desktop,
		width,
	};
}

interface ResponsiveProviderProps {
	children: ReactNode;
}

/**
 * Provides responsive breakpoint state to all child components.
 * Uses a single window resize listener for the entire application.
 */
export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
	const [state, setState] = useState<ResponsiveState>(getResponsiveState);

	useEffect(() => {
		const handleResize = () => {
			setState(getResponsiveState());
		};

		// Sync state immediately in case viewport changed before mount.
		handleResize();

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return (
		<ResponsiveContext.Provider value={state}>
			{children}
		</ResponsiveContext.Provider>
	);
}

/**
 * Hook to access responsive breakpoint state.
 * @returns Responsive state with isMobile, isTablet, isDesktop flags.
 * @throws Error if used outside ResponsiveProvider.
 */
export function useResponsive(): ResponsiveState {
	const context = useContext(ResponsiveContext);
	if (context === undefined) {
		throw new Error('useResponsive must be used within a ResponsiveProvider');
	}
	return context;
}
