import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to read and write a URL query parameter.
 * Syncs with URL on navigation events (popstate, spa-navigate).
 *
 * @param key - The query parameter key.
 * @returns Tuple of [value, setValue] where value is null if not present.
 */
export function useUrlParam(key: string): [string | null, (value: string | null) => void] {
	// Read initial value from URL.
	const getValueFromUrl = useCallback(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get(key);
	}, [key]);

	const [value, setValue] = useState<string | null>(getValueFromUrl);

	// Sync from URL on navigation events.
	useEffect(() => {
		const syncFromUrl = () => {
			setValue(getValueFromUrl());
		};

		window.addEventListener('popstate', syncFromUrl);
		window.addEventListener('spa-navigate', syncFromUrl);

		return () => {
			window.removeEventListener('popstate', syncFromUrl);
			window.removeEventListener('spa-navigate', syncFromUrl);
		};
	}, [getValueFromUrl]);

	// Update URL when value changes.
	const setValueAndUrl = useCallback((newValue: string | null) => {
		setValue(newValue);

		const url = new URL(window.location.href);
		if (newValue !== null && newValue !== '') {
			url.searchParams.set(key, newValue);
		} else {
			url.searchParams.delete(key);
		}
		window.history.replaceState({}, '', url.toString());
	}, [key]);

	return [value, setValueAndUrl];
}
