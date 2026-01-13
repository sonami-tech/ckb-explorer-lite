import Navigo from 'navigo';

/**
 * Route state representing the current view and its parameters.
 */
export type RouteState =
	| { view: 'home' }
	| { view: 'block'; id: string }
	| { view: 'transaction'; hash: string }
	| { view: 'address'; address: string }
	| { view: 'address-transactions'; address: string }
	| { view: 'address-cells'; address: string }
	| { view: 'cell'; txHash: string; index: number }
	| { view: 'resources' }
	| { view: 'not-found' };

export type RouteChangeCallback = (state: RouteState) => void;

let routeChangeCallback: RouteChangeCallback | null = null;

export const router = new Navigo('/');

// Configure routes.
router
	.on('/', () => {
		routeChangeCallback?.({ view: 'home' });
	})
	.on('/block/:id', (match) => {
		const id = match?.data?.id ?? '';
		routeChangeCallback?.({ view: 'block', id });
	})
	.on('/tx/:hash', (match) => {
		const hash = match?.data?.hash ?? '';
		routeChangeCallback?.({ view: 'transaction', hash });
	})
	.on('/address/:address/transactions', (match) => {
		const address = match?.data?.address ?? '';
		routeChangeCallback?.({ view: 'address-transactions', address });
	})
	.on('/address/:address/cells', (match) => {
		const address = match?.data?.address ?? '';
		routeChangeCallback?.({ view: 'address-cells', address });
	})
	.on('/address/:address', (match) => {
		const address = match?.data?.address ?? '';
		routeChangeCallback?.({ view: 'address', address });
	})
	.on('/cell/:txHash/:index', (match) => {
		const txHash = match?.data?.txHash ?? '';
		const index = parseInt(match?.data?.index ?? '0', 10);
		routeChangeCallback?.({ view: 'cell', txHash, index });
	})
	.on('/resources', () => {
		routeChangeCallback?.({ view: 'resources' });
	})
	.notFound(() => {
		routeChangeCallback?.({ view: 'not-found' });
	});

/**
 * Set the callback to be invoked when the route changes.
 */
export function setRouteChangeCallback(callback: RouteChangeCallback): void {
	routeChangeCallback = callback;
}

/**
 * Navigate to a route programmatically.
 * Dispatches a custom event for contexts to sync state from the new URL.
 */
export function navigate(path: string): void {
	router.navigate(path);
	window.scrollTo(0, 0);
	// Dispatch event for ArchiveContext to sync state from the new URL.
	window.dispatchEvent(new Event('spa-navigate'));
}

/**
 * Generate a link preserving network and height, with optional additional params.
 *
 * @param path - The path to navigate to.
 * @param params - Optional additional query parameters. Use undefined to omit a param.
 * @returns The full path with query string.
 */
export function generateLink(
	path: string,
	params?: Record<string, string | number | undefined>,
): string {
	const urlParams = new URLSearchParams();

	// Preserve network from current URL.
	const currentParams = new URLSearchParams(window.location.search);
	const network = currentParams.get('network');
	if (network) {
		urlParams.set('network', network);
	}

	// Preserve height from current URL.
	const height = currentParams.get('height');
	if (height) {
		urlParams.set('height', height);
	}

	// Add any additional params provided.
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				urlParams.set(key, String(value));
			}
		}
	}

	const queryString = urlParams.toString();
	return queryString ? `${path}?${queryString}` : path;
}
