import { PAGE_SIZE_CONFIG } from '../config/defaults';

/**
 * Get stored page size from localStorage with validation.
 * @param storageKey - The localStorage key to read from.
 * @returns The stored page size if valid, otherwise the default.
 */
export function getStoredPageSize(storageKey: string): number {
	const stored = localStorage.getItem(storageKey);
	const parsed = parseInt(stored ?? '', 10);
	if (PAGE_SIZE_CONFIG.options.includes(parsed as 5 | 10 | 20 | 50 | 100)) {
		return parsed;
	}
	return PAGE_SIZE_CONFIG.default;
}

/**
 * Store page size in localStorage.
 * @param storageKey - The localStorage key to write to.
 * @param size - The page size to store.
 */
export function setStoredPageSize(storageKey: string, size: number): void {
	localStorage.setItem(storageKey, size.toString());
}
