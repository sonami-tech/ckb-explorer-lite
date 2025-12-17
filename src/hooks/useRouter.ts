import { useState, useEffect } from 'react';
import { router, setRouteChangeCallback, type RouteState } from '../lib/router';

/**
 * Hook to access the current route state.
 * Returns the current route and triggers re-renders on navigation.
 */
export function useRouter(): RouteState {
	const [route, setRoute] = useState<RouteState>({ view: 'home' });

	useEffect(() => {
		setRouteChangeCallback(setRoute);
		router.resolve();

		return () => {
			setRouteChangeCallback(() => {});
		};
	}, []);

	return route;
}
