import { useEffect, useCallback, useRef, useState } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { formatCkb, formatNumber } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { fromHex } from '../lib/rpc';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import { TruncatedData } from '../components/TruncatedData';
import { DetailRow } from '../components/DetailRow';
import { OutPoint } from '../components/OutPoint';
import { CellStatusIndicator, HashTypeIndicator } from '../components/OptionIndicator';
import type { RpcCellWithLifecycle, RpcCellOutput } from '../types/rpc';

interface CellPageProps {
	txHash: string;
	index: number;
}

export function CellPage({ txHash, index }: CellPageProps) {
	const rpc = useRpc();
	const [cellData, setCellData] = useState<RpcCellWithLifecycle | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Track fetch ID to ignore stale responses during navigation.
	const fetchIdRef = useRef(0);

	const fetchCell = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);

		try {
			// Use getCellLifecycle which returns complete lifecycle info.
			// No archive height needed - it returns the full history.
			const result = await rpc.getCellLifecycle(txHash, index, true);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (result === null) {
				// Cell never existed.
				throw new Error(
					`Cell not found: ${txHash}:${index}. ` +
					`This cell does not exist in the blockchain.`
				);
			}

			setCellData(result);
		} catch (err) {
			// Ignore stale errors if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch cell.'));
		} finally {
			// Only update loading state if this is still the current fetch.
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, txHash, index]);

	useEffect(() => {
		fetchCell();
	}, [fetchCell]);

	if (isLoading) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<SkeletonDetail />
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<ErrorDisplay error={error} title="Cell not found" onRetry={fetchCell} />
			</div>
		);
	}

	// Derive status from lifecycle data.
	const status = cellData?.consumed_block_number === null ? 'live' : 'dead';
	const createdBlock = cellData ? Number(fromHex(cellData.created_block_number)) : null;
	const consumedBlock = cellData?.consumed_block_number
		? Number(fromHex(cellData.consumed_block_number))
		: null;

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Cell</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Cell Details
				</h1>
			</div>

			{/* Cell details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="OutPoint">
						<OutPoint txHash={txHash} index={index} linkTo="transaction" showCopy />
					</DetailRow>
					<DetailRow label="Status">
						<CellStatusIndicator status={status} />
					</DetailRow>
					{cellData && (
						<DetailRow label="Capacity">
							<span className="text-lg font-semibold text-nervos">
								{formatCkb(cellData.output.capacity)}
							</span>
						</DetailRow>
					)}
					{createdBlock !== null && (
						<DetailRow label="Created at Block">
							<div className="flex items-center gap-2">
								<button
									onClick={() => navigate(generateLink(`/block/${createdBlock}`))}
									className="font-mono text-nervos hover:text-nervos-dark"
								>
									{formatNumber(createdBlock)}
								</button>
								<button
									onClick={() => navigate(generateLink(`/block/${createdBlock}`))}
									className="text-nervos hover:text-nervos-dark"
									title="View block"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</button>
							</div>
						</DetailRow>
					)}
					{consumedBlock !== null && (
						<DetailRow label="Consumed at Block">
							<div className="flex items-center gap-2">
								<button
									onClick={() => navigate(generateLink(`/block/${consumedBlock}`))}
									className="font-mono text-nervos hover:text-nervos-dark"
								>
									{formatNumber(consumedBlock)}
								</button>
								<button
									onClick={() => navigate(generateLink(`/block/${consumedBlock}`))}
									className="text-nervos hover:text-nervos-dark"
									title="View block"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</button>
							</div>
						</DetailRow>
					)}
				</div>
			</div>

			{/* Lock Script. */}
			{cellData && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">Lock Script</h2>
					</div>
					<ScriptDetails script={cellData.output.lock} />
				</div>
			)}

			{/* Type Script. */}
			{cellData?.output.type && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">Type Script</h2>
					</div>
					<ScriptDetails script={cellData.output.type} />
				</div>
			)}

			{/* Cell Data. */}
			{cellData && cellData.output_data !== null && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 dark:text-white">Cell Data</h2>
						<span className="text-sm text-gray-500 dark:text-gray-400">
							{((cellData.output_data.length - 2) / 2)} bytes
						</span>
					</div>
					<div className="p-4">
						{cellData.output_data === '0x' ? (
							<span className="text-sm text-gray-500 dark:text-gray-400 italic">
								Empty data
							</span>
						) : (
							<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-x-auto">
								<TruncatedData data={cellData.output_data} />
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function ScriptDetails({ script }: { script: RpcCellOutput['lock'] }) {
	return (
		<div className="divide-y divide-gray-200 dark:divide-gray-700">
			<DetailRow label="Code Hash">
				<HashDisplay hash={script.code_hash} responsive />
			</DetailRow>
			<DetailRow label="Hash Type">
				<HashTypeIndicator hashType={script.hash_type} />
			</DetailRow>
			<DetailRow label="Args">
				{script.args === '0x' ? (
					<span className="text-gray-500 dark:text-gray-400 italic">Empty</span>
				) : (
					<TruncatedData data={script.args} />
				)}
			</DetailRow>
		</div>
	);
}

