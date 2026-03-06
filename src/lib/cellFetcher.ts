import type { RpcClient } from './rpc';
import { toHex } from './rpc';
import type { RpcCellWithLifecycle } from '../types/rpc';

/** Check if an outpoint represents a cellbase (mining reward) input. */
export function isNullOutpoint(txHash: string, index: string): boolean {
	return txHash === '0x0000000000000000000000000000000000000000000000000000000000000000' && index === '0xffffffff';
}

export interface CellFetchResult {
	cell: RpcCellWithLifecycle;
	hasLifecycleData: boolean;
	status: 'live' | 'dead' | 'unknown';
}

/**
 * Fetch cell data with fallback for non-archive nodes.
 * On archive nodes, uses getCellLifecycle for full lifecycle info.
 * On standard nodes, falls back to getLiveCell + getTransaction.
 */
export async function fetchCellData(
	rpc: RpcClient,
	txHash: string,
	index: number,
	isArchive: boolean,
	withData?: boolean,
): Promise<CellFetchResult | null> {
	if (isArchive) {
		const cell = await rpc.getCellLifecycle(txHash, index, withData ?? true);
		if (!cell) return null;

		const status = cell.consumed_block_number === null ? 'live' : 'dead';
		return { cell, hasLifecycleData: true, status };
	}

	// Non-archive fallback: try getLiveCell first.
	const liveResult = await rpc.getLiveCell(txHash, index);

	if (liveResult.status === 'live' && liveResult.cell) {
		const cell: RpcCellWithLifecycle = {
			out_point: { tx_hash: txHash, index: toHex(index) },
			output: liveResult.cell.output,
			output_data: liveResult.cell.data?.content ?? null,
			created_block_number: '0x0',
			consumed_block_number: null,
		};
		return { cell, hasLifecycleData: false, status: 'live' };
	}

	// Cell is dead or unknown — fetch from the creating transaction.
	const txResult = await rpc.getTransaction(txHash);
	if (!txResult?.transaction) return null;

	const output = txResult.transaction.outputs[index];
	if (!output) return null;

	const cell: RpcCellWithLifecycle = {
		out_point: { tx_hash: txHash, index: toHex(index) },
		output,
		output_data: txResult.transaction.outputs_data[index] ?? null,
		created_block_number: '0x0',
		consumed_block_number: null,
	};
	return { cell, hasLifecycleData: false, status: 'dead' };
}
