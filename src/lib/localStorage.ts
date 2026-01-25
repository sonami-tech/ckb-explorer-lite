import { PAGE_SIZE_CONFIG } from '../config/defaults';

/**
 * Safe localStorage getItem that handles errors (e.g., private browsing mode).
 * @param key - The localStorage key to read.
 * @returns The stored value or null if unavailable.
 */
export function safeGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Safe localStorage setItem that handles errors (e.g., quota exceeded, private browsing).
 * @param key - The localStorage key to write.
 * @param value - The value to store.
 */
export function safeSetItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Silently fail - localStorage unavailable or quota exceeded.
	}
}

/**
 * Get stored page size from localStorage with validation.
 * @param storageKey - The localStorage key to read from.
 * @returns The stored page size if valid, otherwise the default.
 */
export function getStoredPageSize(storageKey: string): number {
	const stored = safeGetItem(storageKey);
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
	safeSetItem(storageKey, size.toString());
}
