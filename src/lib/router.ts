import Navigo from 'navigo';

/**
 * Route state representing the current view and its parameters.
 */
export type RouteState =
	| { view: 'home' }
	| { view: 'block'; id: string }
	| { view: 'transaction'; hash: string }
	| { view: 'address'; address: string }
	| { view: 'cell'; txHash: string; index: number }
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
	.on('/address/:address', (match) => {
		const address = match?.data?.address ?? '';
		routeChangeCallback?.({ view: 'address', address });
	})
	.on('/cell/:txHash/:index', (match) => {
		const txHash = match?.data?.txHash ?? '';
		const index = parseInt(match?.data?.index ?? '0', 10);
		routeChangeCallback?.({ view: 'cell', txHash, index });
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
	// Dispatch event for ArchiveContext to sync state from the new URL.
	window.dispatchEvent(new Event('spa-navigate'));
}

/**
 * Generate a link preserving network and optional height parameters.
 */
export function generateLink(path: string, height?: number): string {
	const params = new URLSearchParams();

	// Preserve network from current URL.
	const currentParams = new URLSearchParams(window.location.search);
	const network = currentParams.get('network');
	if (network) {
		params.set('network', network);
	}

	// Add height if provided.
	if (height !== undefined) {
		params.set('height', height.toString());
	}

	const queryString = params.toString();
	return queryString ? `${path}?${queryString}` : path;
}
