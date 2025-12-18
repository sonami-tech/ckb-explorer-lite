import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatCkb,
	truncateHex,
	isValidHex,
} from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import type { RpcTransaction, RpcTransactionWithStatus } from '../types/rpc';

interface TransactionPageProps {
	hash: string;
}

export function TransactionPage({ hash }: TransactionPageProps) {
	const rpc = useRpc();
	const { isArchiveSupported } = useNetwork();
	const { archiveHeight } = useArchive();
	const [txData, setTxData] = useState<RpcTransactionWithStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchTransaction = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);

		try {
			if (!isValidHex(hash) || hash.length !== 66) {
				throw new Error('Invalid transaction hash format.');
			}

			const result = await rpc.getTransaction(hash, archiveHeight);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (!result || !result.transaction) {
				// Transaction not found - try as block hash and redirect if found.
				const blockResult = await rpc.getBlockByHash(hash, archiveHeight);
				if (fetchId !== fetchIdRef.current) return;
				if (blockResult) {
					navigate(generateLink(`/block/${hash}`, archiveHeight));
					return;
				}
				throw new Error(`Transaction not found: ${hash}`);
			}

			setTxData(result as RpcTransactionWithStatus & { transaction: RpcTransaction });
		} catch (err) {
			// Ignore stale errors if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch transaction.'));
		} finally {
			// Only update loading state if this is still the current fetch.
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, hash, archiveHeight]);

	useEffect(() => {
		fetchTransaction();
	}, [fetchTransaction]);

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
				<ErrorDisplay error={error} title="Transaction not found" onRetry={fetchTransaction} />
			</div>
		);
	}

	if (!txData) {
		return null;
	}

	const { transaction, tx_status } = txData;

	// Guard against null transaction (should not happen after fetch check, but TypeScript needs this).
	if (!transaction) {
		return null;
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Transaction</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Transaction Details
				</h1>
			</div>

			{/* Transaction details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Transaction Hash">
						<HashDisplay hash={hash} truncate={false} />
					</DetailRow>
					<DetailRow label="Status">
						<StatusBadge status={tx_status.status} />
					</DetailRow>
					{tx_status.block_hash && (
						<DetailRow label="Block">
							<div className="flex items-center gap-2">
								<HashDisplay hash={tx_status.block_hash} />
								<button
									onClick={() => navigate(generateLink(`/block/${tx_status.block_hash}`, archiveHeight))}
									className="text-nervos hover:text-nervos-dark"
									title="Go to block"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</button>
								{tx_status.block_number && (
									<span className="text-gray-500 dark:text-gray-400">
										(#{formatNumber(BigInt(tx_status.block_number))})
									</span>
								)}
							</div>
						</DetailRow>
					)}
					<DetailRow label="Version">
						{parseInt(transaction.version, 16)}
					</DetailRow>
				</div>
			</div>

			{/* Inputs. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Inputs ({transaction.inputs.length})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{transaction.inputs.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No inputs (Cellbase transaction)
						</div>
					) : (
						transaction.inputs.map((input, index) => {
							// Check if this is a cellbase input (null outpoint).
							// Cellbase inputs have tx_hash of all zeros and index 0xffffffff.
							const isNullOutpoint =
								input.previous_output.tx_hash === '0x0000000000000000000000000000000000000000000000000000000000000000' &&
								input.previous_output.index === '0xffffffff';

							if (isNullOutpoint) {
								return (
									<div key={index} className="p-4">
										<div className="flex items-center gap-2 mb-2">
											<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
												#{index}
											</span>
											<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-nervos/10 text-nervos rounded">
												Cellbase
											</span>
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											Mining reward - no previous output
										</div>
									</div>
								);
							}

							// Calculate historical block height for viewing consumed inputs.
							// The cell was consumed in this transaction, so view it at the previous block.
							// For block 0 (genesis), clamp to 0 since there's no block -1.
							const consumingBlockNumber = tx_status.block_number
								? parseInt(tx_status.block_number, 16)
								: null;
							const historicalHeight = consumingBlockNumber !== null
								? Math.max(0, consumingBlockNumber - 1)
								: archiveHeight;

							const handlePreviousOutputClick = () => {
								if (!isArchiveSupported && consumingBlockNumber !== null) {
									alert(
										'Archive mode is required to view consumed cells.\n\n' +
										'This cell was consumed in this transaction and no longer exists at the current block height. ' +
										'Connect to an archive node to view historical cell state.'
									);
									return;
								}
								// Navigate to cell page with height param. ArchiveContext syncs from URL automatically.
								navigate(generateLink(
									`/cell/${input.previous_output.tx_hash}/${parseInt(input.previous_output.index, 16)}`,
									historicalHeight
								));
							};

							return (
								<div key={index} className="p-4">
									<div className="flex items-center gap-2 mb-2">
										<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
											#{index}
										</span>
									</div>
									<div className="text-sm">
										<span className="text-gray-500 dark:text-gray-400">Previous Output: </span>
										<button
											onClick={handlePreviousOutputClick}
											className="text-nervos hover:underline font-mono inline-flex items-center gap-1"
											title={
												isArchiveSupported && consumingBlockNumber !== null
													? `View cell at block #${formatNumber(BigInt(historicalHeight!))} (before consumption)`
													: !isArchiveSupported
														? 'Archive mode required to view consumed cells'
														: undefined
											}
										>
											{truncateHex(input.previous_output.tx_hash, 8, 8)}:{parseInt(input.previous_output.index, 16)}
											{/* Historical view indicator. */}
											{consumingBlockNumber !== null && (
												<span title={isArchiveSupported ? 'Historical view' : 'Archive required'}>
													<svg
														className={`w-3.5 h-3.5 ${isArchiveSupported ? 'text-amber-500' : 'text-gray-400'}`}
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</span>
											)}
										</button>
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
										Since: {input.since}
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Outputs. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Outputs ({transaction.outputs.length})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{transaction.outputs.map((output, index) => (
						<div key={index} className="p-4">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
										#{index}
									</span>
									<button
										onClick={() => navigate(generateLink(`/cell/${hash}/${index}`, archiveHeight))}
										className="text-nervos hover:underline text-sm"
									>
										View Cell
									</button>
								</div>
								<span className="font-mono text-sm">
									{formatCkb(output.capacity)}
								</span>
							</div>
							<div className="space-y-1 text-sm">
								<div>
									<span className="text-gray-500 dark:text-gray-400">Lock: </span>
									<span className="font-mono text-xs">
										{output.lock.hash_type}:{truncateHex(output.lock.code_hash, 6, 6)}
									</span>
								</div>
								{output.type && (
									<div>
										<span className="text-gray-500 dark:text-gray-400">Type: </span>
										<span className="font-mono text-xs">
											{output.type.hash_type}:{truncateHex(output.type.code_hash, 6, 6)}
										</span>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Cell Deps. */}
			{transaction.cell_deps.length > 0 && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Cell Dependencies ({transaction.cell_deps.length})
						</h2>
					</div>
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{transaction.cell_deps.map((dep, index) => (
							<div key={index} className="p-4 text-sm">
								<button
									onClick={() => navigate(generateLink(
										`/cell/${dep.out_point.tx_hash}/${parseInt(dep.out_point.index, 16)}`,
										archiveHeight
									))}
									className="text-nervos hover:underline font-mono"
								>
									{truncateHex(dep.out_point.tx_hash, 8, 8)}:{parseInt(dep.out_point.index, 16)}
								</button>
								<span className="ml-2 text-gray-500 dark:text-gray-400">
									({dep.dep_type})
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Witnesses. */}
			{transaction.witnesses.length > 0 && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<details>
						<summary className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
							<span className="font-semibold text-gray-900 dark:text-white">
								Witnesses ({transaction.witnesses.length})
							</span>
						</summary>
						<div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
							{transaction.witnesses.map((witness, index) => (
								<div key={index} className="p-4">
									<span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
										#{index}
									</span>
									<pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
										{witness}
									</pre>
								</div>
							))}
						</div>
					</details>
				</div>
			)}
		</div>
	);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col md:flex-row md:items-center p-4 gap-2">
			<span className="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<div className="flex-1 text-sm text-gray-900 dark:text-white break-all">
				{children}
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const statusStyles: Record<string, string> = {
		committed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
		pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
		proposed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
		rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
		unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
	};

	return (
		<span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[status] || statusStyles.unknown}`}>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}
