import { useState, useEffect } from 'react';
import { parseAddress, AddressFormat } from '../lib/address';
import type { RpcScript } from '../types/rpc';

/**
 * Result of parsing an address into its script components.
 */
export interface AddressScriptResult {
	/** The parsed lock script, or null if parsing failed. */
	script: RpcScript | null;
	/** The address format (Full, Short, etc.). */
	format: AddressFormat;
	/** The network prefix (ckb, ckt). */
	prefix: string;
	/** Any error that occurred during parsing. */
	error: Error | null;
	/** Whether parsing is complete. */
	isReady: boolean;
}

/**
 * Parse a CKB address and extract its lock script.
 * Handles short format rejection and error states.
 *
 * @param address - The CKB address to parse.
 * @returns Parsed script data, format info, and error state.
 */
export function useAddressScript(address: string): AddressScriptResult {
	const [script, setScript] = useState<RpcScript | null>(null);
	const [format, setFormat] = useState<AddressFormat>(AddressFormat.Full);
	const [prefix, setPrefix] = useState<string>('');
	const [error, setError] = useState<Error | null>(null);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		// Reset state when address changes.
		setScript(null);
		setError(null);
		setIsReady(false);

		try {
			const parsed = parseAddress(address);
			if (!parsed.script) {
				throw new Error('Short format addresses are not supported. Please use the full format address.');
			}
			setScript(parsed.script);
			setFormat(parsed.format);
			setPrefix(parsed.prefix);
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Invalid address format.'));
		} finally {
			setIsReady(true);
		}
	}, [address]);

	return { script, format, prefix, error, isReady };
}
