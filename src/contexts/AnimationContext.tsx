/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useCallback,
	type ReactNode,
} from 'react';

interface AnimationContextValue {
	isPlaying: boolean;
	setIsPlaying: (playing: boolean) => void;
	toggle: () => void;
}

const AnimationContext = createContext<AnimationContextValue | null>(null);

const STORAGE_KEY = 'ckb-explorer-animation';

function getStoredState(): boolean | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'true') return true;
	if (stored === 'false') return false;
	return null;
}

function getDefaultEnabled(): boolean {
	if (typeof window === 'undefined') return true;
	// Default to on for desktop/tablet (>= 768px), off for mobile.
	return window.innerWidth >= 768;
}

export function AnimationProvider({ children }: { children: ReactNode }) {
	const [isPlaying, setIsPlayingState] = useState<boolean>(() => {
		const stored = getStoredState();
		return stored !== null ? stored : getDefaultEnabled();
	});

	const setIsPlaying = useCallback((playing: boolean) => {
		setIsPlayingState(playing);
		localStorage.setItem(STORAGE_KEY, String(playing));
	}, []);

	const toggle = useCallback(() => {
		setIsPlaying(!isPlaying);
	}, [isPlaying, setIsPlaying]);

	return (
		<AnimationContext.Provider value={{ isPlaying, setIsPlaying, toggle }}>
			{children}
		</AnimationContext.Provider>
	);
}

export function useAnimation(): AnimationContextValue {
	const context = useContext(AnimationContext);
	if (!context) {
		throw new Error('useAnimation must be used within an AnimationProvider.');
	}
	return context;
}
