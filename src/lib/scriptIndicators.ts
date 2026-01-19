import { lookupLockScript, lookupTypeScript } from './wellKnown';
import { truncateHex } from './format';
import type { RpcScript } from '../types/rpc';
import type { NetworkType } from '../config/networks';

/**
 * Extended script indicator with unknown script handling.
 * Used in TransactionPage for detailed input/output display.
 */
export interface ScriptIndicatorWithUnknown {
	/** Display name (script name or truncated hash). */
	name: string;
	/** Resource ID for linking to /resources#id. */
	resourceId?: string;
	/** Description for tooltip. */
	description?: string;
	/** Whether this is a known/registered script. */
	isKnown: boolean;
	/** Full code hash for unknown scripts (used in tooltip). */
	fullHash?: string;
}

/**
 * Extract lock script indicator from a lock script.
 * Returns known script info or truncated hash for unknown scripts.
 */
export function extractLockScriptIndicator(
	lock: RpcScript,
	networkType: NetworkType,
): ScriptIndicatorWithUnknown {
	const info = lookupLockScript(lock.code_hash, lock.hash_type, networkType, lock.args);
	if (info) {
		return {
			name: info.name,
			resourceId: info.resourceId,
			description: info.description,
			isKnown: true,
		};
	}
	return {
		name: truncateHex(lock.code_hash, 8, 4),
		isKnown: false,
		fullHash: lock.code_hash,
	};
}

/**
 * Extract type script indicator from a type script.
 * Returns known script info or truncated hash for unknown scripts.
 */
export function extractTypeScriptIndicator(
	typeScript: RpcScript,
	networkType: NetworkType,
): ScriptIndicatorWithUnknown {
	const info = lookupTypeScript(typeScript.code_hash, typeScript.hash_type, networkType, typeScript.args);
	if (info) {
		return {
			name: info.name,
			resourceId: info.resourceId,
			description: info.description,
			isKnown: true,
		};
	}
	return {
		name: truncateHex(typeScript.code_hash, 8, 4),
		isKnown: false,
		fullHash: typeScript.code_hash,
	};
}

/**
 * Map well-known cell names to resource page IDs.
 * Used for linking cell dependencies to the resources page.
 */
export function getWellKnownCellResourceId(name: string): string | undefined {
	const resourceIdMap: Record<string, string> = {
		'SECP256K1/blake160 Dep Group': 'secp256k1',
		'SECP256K1/blake160 Lock Binary': 'secp256k1',
		'Multisig Dep Group': 'multisig',
		'Multisig Lock Binary': 'multisig',
		'NervosDAO Binary': 'dao',
		'secp256k1_data': 'secp256k1',
		'Anyone-Can-Pay Dep Group': 'acp',
		'SUDT Binary': 'sudt',
		'xUDT Binary': 'xudt',
		'Omnilock Binary': 'omnilock',
		'Spore Binary': 'spore',
		'Spore Cluster Binary': 'spore',
		'JoyID Dep Group': 'joyid',
		'CoTA Dep Group': 'cota',
		'NostrLock Binary': 'nostr',
		'RGB++ Lock Binary': 'rgbpp',
		'BTC Time Lock Binary': 'rgbpp',
		'CKBFS Dep Group': 'ckbfs',
		'iCKB Dep Group': 'ickb',
	};
	return resourceIdMap[name];
}
