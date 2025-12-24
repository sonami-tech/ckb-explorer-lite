import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatCkb,
	formatAbsoluteTime,
	formatRelativeTime,
	truncateAddress,
	isValidHex,
} from '../lib/format';
import { encodeAddress } from '../lib/address';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import { TruncatedData } from '../components/TruncatedData';
import { OutPointLink } from '../components/OutPointLink';
import { DetailRow } from '../components/DetailRow';
import type { RpcTransaction, RpcTransactionWithStatus } from '../types/rpc';

interface TransactionPageProps {
	hash: string;
}

export function TransactionPage({ hash }: TransactionPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const { archiveHeight } = useArchive();
	const [txData, setTxData] = useState<RpcTransactionWithStatus | null>(null);
	const [blockTimestamp, setBlockTimestamp] = useState<bigint | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const networkType = currentNetwork?.type ?? 'mainnet';

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchTransaction = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);
		setBlockTimestamp(null);

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

			// Fetch block header for timestamp if transaction is committed.
			if (result.tx_status.block_hash) {
				const blockResult = await rpc.getBlockByHash(result.tx_status.block_hash, archiveHeight);
				if (fetchId !== fetchIdRef.current) return;
				if (blockResult) {
					setBlockTimestamp(BigInt(blockResult.header.timestamp));
				}
			}
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
						<HashDisplay hash={hash} responsive />
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
					{blockTimestamp && (
						<DetailRow label="Timestamp">
							<span>{formatAbsoluteTime(blockTimestamp)}</span>
							<span className="text-gray-500 dark:text-gray-400 ml-2">
								({formatRelativeTime(blockTimestamp)})
							</span>
						</DetailRow>
					)}
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
										<div className="flex items-center gap-3">
											<span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-6">
												#{index}
											</span>
											<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-nervos/10 text-nervos rounded">
												Cellbase
											</span>
											<span className="text-sm text-gray-500 dark:text-gray-400">
												Mining reward
											</span>
										</div>
									</div>
								);
							}

							return (
								<div key={index} className="p-4">
									<div className="flex items-center gap-3">
										<span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-6">
											#{index}
										</span>
										<OutPointLink
											txHash={input.previous_output.tx_hash}
											index={parseInt(input.previous_output.index, 16)}
										/>
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
					{transaction.outputs.map((output, index) => {
						// Derive address from lock script.
						const address = encodeAddress(output.lock, networkType);

						return (
							<div key={index} className="p-4">
								{/* Top row: index, type badge, capacity. */}
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-6">
											#{index}
										</span>
										{output.type && (
											<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
												Has Type
											</span>
										)}
									</div>
									<span className="font-mono text-sm font-medium">
										{formatCkb(output.capacity)}
									</span>
								</div>
								{/* Address row with navigation. */}
								<div className="flex items-center gap-2 ml-8">
									<button
										onClick={() => navigate(generateLink(`/address/${address}`, archiveHeight))}
										className="text-nervos hover:text-nervos-dark font-mono text-sm truncate"
										title={address}
									>
										<span className="hidden sm:inline">{address}</span>
										<span className="sm:hidden">{truncateAddress(address)}</span>
									</button>
									<button
										onClick={() => navigate(generateLink(`/cell/${hash}/${index}`))}
										className="text-nervos hover:text-nervos-dark transition-colors flex-shrink-0"
										title="View cell details"
									>
										<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</button>
								</div>
							</div>
						);
					})}
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
							<div key={index} className="p-4">
								<div className="flex items-center gap-3">
									<OutPointLink
										txHash={dep.out_point.tx_hash}
										index={parseInt(dep.out_point.index, 16)}
									/>
									<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
										{dep.dep_type}
									</span>
								</div>
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
									<div className="bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
										<TruncatedData data={witness} />
									</div>
								</div>
							))}
						</div>
					</details>
				</div>
			)}
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
