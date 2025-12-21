import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { formatCkb } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import { TruncatedData } from '../components/TruncatedData';
import { DetailRow } from '../components/DetailRow';
import type { RpcLiveCell, RpcCellOutput } from '../types/rpc';

interface CellPageProps {
	txHash: string;
	index: number;
}

export function CellPage({ txHash, index }: CellPageProps) {
	const rpc = useRpc();
	const { archiveHeight } = useArchive();
	const [cellData, setCellData] = useState<RpcLiveCell | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchCell = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);

		try {
			const result = await rpc.getLiveCell(txHash, index, archiveHeight);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (result.status === 'unknown' && !result.cell) {
				// Cell not found - may have been spent or never existed.
				throw new Error(
					`Cell not found: ${txHash}:${index}. ` +
					`This cell may have been consumed in a later transaction, or it may not exist.`
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
	}, [rpc, txHash, index, archiveHeight]);

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

	const cell = cellData?.cell;
	const status = cellData?.status;

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
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Cell Details
					</h1>
					<StatusBadge status={status || 'unknown'} />
				</div>
			</div>

			{/* Cell details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="OutPoint">
						<div className="flex items-center gap-2">
							<HashDisplay hash={txHash} />
							<span className="text-gray-500">:</span>
							<span className="font-mono">{index}</span>
							<button
								onClick={() => navigate(generateLink(`/tx/${txHash}`, archiveHeight))}
								className="text-nervos hover:text-nervos-dark"
								title="Go to transaction"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</button>
						</div>
					</DetailRow>
					<DetailRow label="Status">
						<div className="flex items-center gap-2">
							<StatusBadge status={status || 'unknown'} />
							{status === 'dead' && (
								<span className="text-sm text-gray-500 dark:text-gray-400">
									(Cell has been consumed)
								</span>
							)}
						</div>
					</DetailRow>
					{cell && (
						<DetailRow label="Capacity">
							<span className="text-lg font-semibold text-nervos">
								{formatCkb(cell.output.capacity)}
							</span>
						</DetailRow>
					)}
				</div>
			</div>

			{/* Lock Script. */}
			{cell && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">Lock Script</h2>
					</div>
					<ScriptDetails script={cell.output.lock} />
				</div>
			)}

			{/* Type Script. */}
			{cell?.output.type && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">Type Script</h2>
					</div>
					<ScriptDetails script={cell.output.type} />
				</div>
			)}

			{/* Cell Data. */}
			{cell?.data && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 dark:text-white">Cell Data</h2>
						<span className="text-sm text-gray-500 dark:text-gray-400">
							{((cell.data.content.length - 2) / 2)} bytes
						</span>
					</div>
					<div className="p-4">
						{cell.data.content === '0x' ? (
							<span className="text-sm text-gray-500 dark:text-gray-400 italic">
								Empty data
							</span>
						) : (
							<>
								<div className="mb-2 flex items-center gap-2">
									<span className="text-sm text-gray-500 dark:text-gray-400">Data Hash:</span>
									<HashDisplay hash={cell.data.hash} />
								</div>
								<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-x-auto">
									<TruncatedData data={cell.data.content} />
								</div>
							</>
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
				<HashDisplay hash={script.code_hash} />
			</DetailRow>
			<DetailRow label="Hash Type">
				<span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
					{script.hash_type}
				</span>
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

function StatusBadge({ status }: { status: string }) {
	const statusStyles: Record<string, string> = {
		live: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
		dead: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
		unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
	};

	return (
		<span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[status] || statusStyles.unknown}`}>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}
