/**
 * Script grouping and lookup utilities for transaction filtering.
 *
 * Provides:
 * - Type script groups for multi-select filtering (BlockPage)
 * - Individual type scripts for single-select filtering (AddressPage)
 * - Filterable lock scripts (excluding default SECP256K1/blake160)
 * - Utility functions for code hash lookup
 *
 * All data is derived from wellKnown.ts to avoid duplication.
 */

import type { NetworkType } from '../config/networks';
import {
	KNOWN_TYPE_SCRIPTS,
	KNOWN_LOCK_SCRIPTS,
	toRegistryNetwork,
	type ScriptInfo,
	type RegistryNetwork,
} from './wellKnown';

/**
 * Derive script groups from a script registry.
 * Scans all scripts for their `groups` field and builds a map of groupName -> scriptNames[].
 * This automatically picks up multi-group membership (e.g., Spore in both 'Spore' and 'NFT').
 */
function deriveScriptGroups(
	scripts: Record<RegistryNetwork, Record<string, ScriptInfo>>
): Record<string, string[]> {
	const groups: Record<string, Set<string>> = {};

	// Scan both mainnet and testnet to collect all group memberships.
	for (const network of ['mainnet', 'testnet'] as const) {
		for (const [, info] of Object.entries(scripts[network])) {
			if (info.groups) {
				for (const groupName of info.groups) {
					if (!groups[groupName]) {
						groups[groupName] = new Set();
					}
					groups[groupName].add(info.name);
				}
			}
		}
	}

	// Convert sets to arrays.
	const result: Record<string, string[]> = {};
	for (const [groupName, scriptNames] of Object.entries(groups)) {
		result[groupName] = Array.from(scriptNames);
	}
	return result;
}

/**
 * Derive type script groups from KNOWN_TYPE_SCRIPTS.
 */
function deriveTypeScriptGroups(): Record<string, string[]> {
	return deriveScriptGroups(KNOWN_TYPE_SCRIPTS);
}

/**
 * Derive lock script groups from KNOWN_LOCK_SCRIPTS.
 */
function deriveLockScriptGroups(): Record<string, string[]> {
	return deriveScriptGroups(KNOWN_LOCK_SCRIPTS);
}

/**
 * Derive type script names from KNOWN_TYPE_SCRIPTS.
 * Extracts all unique script names that have groups defined.
 */
function deriveTypeScripts(): string[] {
	const scripts = new Set<string>();

	for (const network of ['mainnet', 'testnet'] as const) {
		for (const [, info] of Object.entries(KNOWN_TYPE_SCRIPTS[network])) {
			if (info.groups) {
				scripts.add(info.name);
			}
		}
	}

	return Array.from(scripts);
}

/**
 * Type script groups for BlockPage multi-select filtering.
 * Each group contains related scripts that can be filtered together with OR logic.
 * Derived from KNOWN_TYPE_SCRIPTS groups field.
 */
export const TYPE_SCRIPT_GROUPS: Record<string, string[]> = deriveTypeScriptGroups();

/**
 * Lock script groups for BlockPage multi-select filtering.
 * Groups like RGB++, Multisig, ACP contain related lock scripts.
 * Derived from KNOWN_LOCK_SCRIPTS groups field.
 */
export const LOCK_SCRIPT_GROUPS: Record<string, string[]> = deriveLockScriptGroups();

/**
 * Individual type script names for AddressPage single-select filtering.
 * These can be passed directly to the indexer filter.
 * Derived from KNOWN_TYPE_SCRIPTS where groups are defined.
 */
export const TYPE_SCRIPTS: string[] = deriveTypeScripts();

/**
 * Filterable lock script names for BlockPage multi-select filtering.
 * Excludes SECP256K1/blake160 since it is the default and would match most transactions.
 * Also excludes iCKB scripts since they are protocol scripts, not user-facing locks.
 */
export const FILTERABLE_LOCK_SCRIPTS: string[] = [
	'Multisig',
	'Omnilock',
	'Anyone-Can-Pay',
	'JoyID',
	'Nostr Lock',
	'RGB++ Lock',
	'BTC Time Lock',
	'PW Lock',
];

// Direct access to type scripts by code hash.
const TYPE_SCRIPT_INFO = KNOWN_TYPE_SCRIPTS;
const LOCK_SCRIPT_INFO = KNOWN_LOCK_SCRIPTS;

/**
 * Get the type script groups for a code hash.
 * Returns an array of group names (e.g., ["Spore", "NFT"]) or null if not found.
 * A script can belong to multiple groups.
 */
export function getTypeScriptGroup(codeHash: string, network: NetworkType): string[] | null {
	const registryNetwork = toRegistryNetwork(network);
	const info = TYPE_SCRIPT_INFO[registryNetwork][codeHash];
	if (!info || !info.groups || info.groups.length === 0) {
		return null;
	}
	return info.groups;
}

/**
 * Get the filterable lock script name for a code hash.
 * Returns the script name (e.g., "Multisig", "Omnilock") or null if not found.
 * Excludes SECP256K1/blake160 since it is not filterable.
 */
export function getFilterableLockScript(codeHash: string, network: NetworkType): string | null {
	const registryNetwork = toRegistryNetwork(network);
	const info = LOCK_SCRIPT_INFO[registryNetwork][codeHash];
	if (!info) {
		return null;
	}
	// Only return if it's in the filterable list.
	if (FILTERABLE_LOCK_SCRIPTS.includes(info.name)) {
		return info.name;
	}
	return null;
}

/**
 * Get the lock script groups for a code hash.
 * Returns an array of group names (e.g., ["RGB++"]) or null if not found.
 * A script can belong to multiple groups.
 */
export function getLockScriptGroups(codeHash: string, network: NetworkType): string[] | null {
	const registryNetwork = toRegistryNetwork(network);
	const info = LOCK_SCRIPT_INFO[registryNetwork][codeHash];
	if (!info || !info.groups || info.groups.length === 0) {
		return null;
	}
	return info.groups;
}

/**
 * Get all code hashes for a type script group.
 * Returns an array of code hashes, or an empty array if the group is not found.
 */
export function getCodeHashesForGroup(groupName: string, network: NetworkType): string[] {
	const registryNetwork = toRegistryNetwork(network);
	const codeHashes: string[] = [];

	for (const [codeHash, info] of Object.entries(TYPE_SCRIPT_INFO[registryNetwork])) {
		if (info.groups && info.groups.includes(groupName)) {
			codeHashes.push(codeHash);
		}
	}

	return codeHashes;
}

/**
 * Get the code hash for a type script by name.
 * Returns the code hash or null if not found.
 */
export function getCodeHashForScript(scriptName: string, network: NetworkType): string | null {
	const registryNetwork = toRegistryNetwork(network);

	for (const [codeHash, info] of Object.entries(TYPE_SCRIPT_INFO[registryNetwork])) {
		if (info.name === scriptName) {
			return codeHash;
		}
	}

	return null;
}

/**
 * Get the code hash for a filterable lock script by name.
 * Returns the code hash or null if not found.
 */
export function getCodeHashForLockScript(scriptName: string, network: NetworkType): string | null {
	const registryNetwork = toRegistryNetwork(network);

	for (const [codeHash, info] of Object.entries(LOCK_SCRIPT_INFO[registryNetwork])) {
		if (info.name === scriptName && FILTERABLE_LOCK_SCRIPTS.includes(info.name)) {
			return codeHash;
		}
	}

	return null;
}
