/**
 * Lock hash computation utility.
 */

import { Script as CccScript } from '@ckb-ccc/core';
import type { RpcScript } from '../types/rpc';

/**
 * Compute the lock hash for a script.
 *
 * Uses CCC's Script.hash() which serializes the script using Molecule
 * and returns the Blake2b-256 hash.
 */
export function scriptToLockHash(script: RpcScript): string {
	const cccScript = CccScript.from({
		codeHash: script.code_hash,
		hashType: script.hash_type,
		args: script.args,
	});
	return cccScript.hash();
}
