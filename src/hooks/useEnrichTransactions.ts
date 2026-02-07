import { useCallback } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { useArchive } from '../contexts/ArchiveContext';
import {
	calculateTotalOutputCapacity,
	extractLockScripts,
	extractTypeScripts,
	isCellbaseTransaction,
	type EnrichedTransaction,
} from '../components/TransactionRow';
import type { NetworkType } from '../config/networks';

/** Minimal transaction info needed for enrichment. */
export interface MinimalTransactionInfo {
	tx_hash: string;
	block_number: string;
}

/**
 * Hook that provides a callback to enrich transactions with full details.
 * Fetches full transaction data and block headers for timestamps.
 *
 * @param networkType - The current network type for script lookups.
 * @returns A callback function that enriches transactions.
 */
export function useEnrichTransactions(
	networkType: NetworkType,
): (groupedTxs: MinimalTransactionInfo[]) => Promise<EnrichedTransaction[]> {
	const rpc = useRpc();
	const { archiveHeight } = useArchive();

	return useCallback(async (
		groupedTxs: MinimalTransactionInfo[],
	): Promise<EnrichedTransaction[]> => {
		if (groupedTxs.length === 0) return [];

		// Fetch full transactions in parallel.
		const fullTxPromises = groupedTxs.map(async (gtx) => {
			const txWithStatus = await rpc.getTransaction(gtx.tx_hash, archiveHeight);
			return { grouped: gtx, full: txWithStatus };
		});

		const results = await Promise.all(fullTxPromises);

		// Fetch block headers for timestamps.
		const uniqueBlocks = [...new Set(groupedTxs.map(tx => tx.block_number))];
		const headerPromises = uniqueBlocks.map(async (blockNum) => {
			const header = await rpc.getHeaderByNumber(BigInt(blockNum), archiveHeight);
			return { blockNumber: blockNum, timestamp: header ? Number(BigInt(header.timestamp)) : Date.now() };
		});
		const headers = await Promise.all(headerPromises);
		const timestampMap = new Map(headers.map(h => [h.blockNumber, h.timestamp]));

		// Build enriched transactions.
		return results.map(({ grouped, full }) => {
			const timestamp = timestampMap.get(grouped.block_number) ?? Date.now();

			return {
				txHash: grouped.tx_hash,
				blockNumber: BigInt(grouped.block_number),
				timestamp,
				totalCapacity: full?.transaction ? calculateTotalOutputCapacity(full.transaction) : 0n,
				lockScripts: full?.transaction ? extractLockScripts(full.transaction, networkType) : [],
				typeScripts: full?.transaction ? extractTypeScripts(full.transaction, networkType) : [],
				inputCount: full?.transaction?.inputs.length ?? 0,
				outputCount: full?.transaction?.outputs.length ?? 0,
				isCellbase: full?.transaction ? isCellbaseTransaction(full.transaction) : false,
			};
		});
	}, [rpc, archiveHeight, networkType]);
}
