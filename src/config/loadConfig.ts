/**
 * Runtime configuration loader.
 *
 * Fetches the redacted public config the SPA is allowed to see and narrows
 * its shape to AppConfig. Authoritative validation lives in
 * docker/10-config-from-json5.sh, which runs before this code is reachable
 * in production. The full config.json5 (with upstream URLs) is read only by
 * the entrypoint and never served to the browser; the browser sees only the
 * redacted config.public.json5.
 */

import JSON5 from 'json5';

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export interface NetworkConfig {
	slug: string;
	name: string;
	type: NetworkType;
	isArchive: boolean;
	hasStats: boolean;
}

export interface AppConfig {
	networks: NetworkConfig[];
	pollIntervalMs: number;
	cacheEnabled: boolean;
}

export async function loadConfig(): Promise<AppConfig> {
	const res = await fetch('/config.public.json5', { cache: 'no-store' });
	if (!res.ok) throw new Error(`config.public.json5 fetch failed: ${res.status}`);
	const text = await res.text();
	const raw = JSON5.parse(text);
	return narrowType(raw);
}

function narrowType(c: unknown): AppConfig {
	if (typeof c !== 'object' || c === null) throw new Error('config: root must be an object');
	const obj = c as Record<string, unknown>;

	if (!Array.isArray(obj.networks) || obj.networks.length === 0) {
		throw new Error('config: networks must be a non-empty array');
	}
	if (typeof obj.pollIntervalMs !== 'number') {
		throw new Error('config: pollIntervalMs must be a number');
	}
	if (typeof obj.cacheEnabled !== 'boolean') {
		throw new Error('config: cacheEnabled must be a boolean');
	}

	const networks = obj.networks.map((n, i) => {
		if (typeof n !== 'object' || n === null) throw new Error(`config: networks[${i}] must be an object`);
		const e = n as Record<string, unknown>;
		if (typeof e.slug !== 'string') throw new Error(`config: networks[${i}].slug must be a string`);
		if (typeof e.name !== 'string') throw new Error(`config: networks[${i}].name must be a string`);
		if (e.type !== 'mainnet' && e.type !== 'testnet' && e.type !== 'devnet') {
			throw new Error(`config: networks[${i}].type must be 'mainnet' | 'testnet' | 'devnet'`);
		}
		if (typeof e.isArchive !== 'boolean') throw new Error(`config: networks[${i}].isArchive must be a boolean`);
		if (typeof e.hasStats !== 'boolean') throw new Error(`config: networks[${i}].hasStats must be a boolean`);
		return {
			slug: e.slug,
			name: e.name,
			type: e.type as NetworkType,
			isArchive: e.isArchive,
			hasStats: e.hasStats,
		};
	});

	return { networks, pollIntervalMs: obj.pollIntervalMs, cacheEnabled: obj.cacheEnabled };
}

/**
 * Derive the browser-visible proxy path for a network's RPC endpoint.
 */
export function rpcPath(slug: string): string {
	return `/rpc/${slug}`;
}

/**
 * Derive the browser-visible proxy path for a network's stats endpoint.
 * Returns null if the network has no stats backend; consumers should hide
 * stats UI when this is null.
 */
export function statsPath(slug: string, hasStats: boolean): string | null {
	return hasStats ? `/rpc/stats/${slug}` : null;
}

/**
 * Get the display label for a network type.
 */
export function getNetworkTypeLabel(type: NetworkType): string {
	switch (type) {
		case 'mainnet':
			return 'Mainnet';
		case 'testnet':
			return 'Testnet';
		case 'devnet':
			return 'Devnet';
	}
}
