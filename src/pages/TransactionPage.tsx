import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatCkb,
	formatAbsoluteTime,
	formatRelativeTime,
	isValidHex,
	truncateHex,
} from '../lib/format';
import { encodeAddress } from '../lib/address';
import { lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { navigate, generateLink } from '../lib/router';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import { OutPoint } from '../components/OutPoint';
import { DetailRow } from '../components/DetailRow';
import { AddressDisplay } from '../components/AddressDisplay';
import { InternalLinkIcon } from '../components/InternalLinkIcon';
import { InternalLink } from '../components/InternalLink';
import { WitnessSection } from '../components/WitnessSection';
import { ArchiveHeightWarning } from '../components/ArchiveHeightWarning';
import { ScriptIndicatorPill } from '../components/ScriptIndicatorPill';
import type { RpcTransaction, RpcTransactionWithStatus, RpcScript, RpcCellInput, RpcCellWithLifecycle, RpcCellOutput } from '../types/rpc';
import type { NetworkType } from '../config/networks';
import {
	BRAND,
	DEP_TYPE,
	getStatusStyle,
} from '../lib/badgeStyles';

interface TransactionPageProps {
	hash: string;
}

/** Script indicator for display. */
interface ScriptIndicator {
	name: string;
	resourceId?: string;
	description?: string;
	isKnown: boolean;
}

/** Helper to check if outpoint is null (cellbase). */
function isNullOutpoint(txHash: string, index: string): boolean {
	return txHash === '0x0000000000000000000000000000000000000000000000000000000000000000' && index === '0xffffffff';
}

/** Extract lock script indicator from script. */
function extractLockScriptIndicator(lock: RpcScript, networkType: NetworkType): ScriptIndicator {
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
	};
}

/** Extract type script indicator from script. */
function extractTypeScriptIndicator(typeScript: RpcScript, networkType: NetworkType): ScriptIndicator {
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
	};
}

export function TransactionPage({ hash }: TransactionPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const [txData, setTxData] = useState<RpcTransactionWithStatus | null>(null);
	const [blockTimestamp, setBlockTimestamp] = useState<bigint | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Input cell data fetching state.
	const [inputCellData, setInputCellData] = useState<Map<number, RpcCellWithLifecycle>>(new Map());
	const [inputErrors, setInputErrors] = useState<Map<number, Error>>(new Map());
	const [inputsLoading, setInputsLoading] = useState(false);

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

			const result = await rpc.getTransaction(hash);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (!result || !result.transaction) {
				// Transaction not found - try as block hash and redirect if found.
				const blockResult = await rpc.getBlockByHash(hash);
				if (fetchId !== fetchIdRef.current) return;
				if (blockResult) {
					navigate(generateLink(`/block/${hash}`));
					return;
				}
				throw new Error(`Transaction not found: ${hash}`);
			}

			setTxData(result as RpcTransactionWithStatus & { transaction: RpcTransaction });

			// Fetch block header for timestamp if transaction is committed.
			if (result.tx_status.block_hash) {
				const blockResult = await rpc.getBlockByHash(result.tx_status.block_hash);
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
	}, [rpc, hash]);

	const fetchInputCellData = useCallback(async (inputs: RpcCellInput[]) => {
		setInputsLoading(true);
		setInputErrors(new Map());
		setInputCellData(new Map());

		try {
			// Filter out cellbase inputs.
			const regularInputs = inputs.filter(
				input => !isNullOutpoint(input.previous_output.tx_hash, input.previous_output.index)
			);

			// Fetch all inputs in parallel.
			const promises = regularInputs.map(async (input, idx) => {
				try {
					const cellData = await rpc.getCellLifecycle(
						input.previous_output.tx_hash,
						parseInt(input.previous_output.index, 16),
						true
					);
					return { index: idx, cellData, error: null };
				} catch (error) {
					return { index: idx, cellData: null, error: error as Error };
				}
			});

			const results = await Promise.all(promises);

			const dataMap = new Map<number, RpcCellWithLifecycle>();
			const errorMap = new Map<number, Error>();

			results.forEach(result => {
				if (result.cellData) {
					dataMap.set(result.index, result.cellData);
				} else if (result.error) {
					errorMap.set(result.index, result.error);
				}
			});

			setInputCellData(dataMap);
			setInputErrors(errorMap);
		} catch (error) {
			console.error('Failed to fetch input cell data:', error);
		} finally {
			setInputsLoading(false);
		}
	}, [rpc]);

	useEffect(() => {
		fetchTransaction();
	}, [fetchTransaction]);

	useEffect(() => {
		if (txData?.transaction) {
			fetchInputCellData(txData.transaction.inputs);
		}
	}, [txData, fetchInputCellData]);

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
				<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<InternalLink href={generateLink('/')} className="hover:text-nervos">
						Home
					</InternalLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">Transaction</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Transaction Details
				</h1>
			</div>

			<ArchiveHeightWarning />

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
								<HashDisplay hash={tx_status.block_hash} linkTo={generateLink(`/block/${tx_status.block_hash}`)} />
								{tx_status.block_number && (
									<span className="text-gray-500 dark:text-gray-400">
										({formatNumber(BigInt(tx_status.block_number))})
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
							const isCellbase = isNullOutpoint(input.previous_output.tx_hash, input.previous_output.index);

							// Cellbase input.
							if (isCellbase) {
								return (
									<div key={index} className="p-4">
										<div className="flex items-center gap-3">
											<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
												#{index}
											</span>
											<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${BRAND} rounded`}>
												Cellbase
											</span>
											<span className="text-sm text-gray-500 dark:text-gray-400">
												Mining reward
											</span>
										</div>
									</div>
								);
							}

							// Regular input.
							const cellData = inputCellData.get(index);
							const fetchError = inputErrors.get(index);

							// Loading state.
							if (inputsLoading && !cellData && !fetchError) {
								return (
									<div key={index} className="p-4">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
													#{index}
												</span>
												<OutPoint
													txHash={input.previous_output.tx_hash}
													index={parseInt(input.previous_output.index, 16)}
												/>
											</div>
											<div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
										</div>
										<div className="ml-6 mb-2">
											<div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
										</div>
										<div className="ml-6">
											<div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
										</div>
									</div>
								);
							}

							// Error state.
							if (fetchError) {
								return (
									<div key={index} className="p-4">
										<div className="flex items-center gap-2 mb-2">
											<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
												#{index}
											</span>
											<OutPoint
												txHash={input.previous_output.tx_hash}
												index={parseInt(input.previous_output.index, 16)}
											/>
										</div>
										<div className="ml-6 text-sm text-red-600 dark:text-red-400">
											Failed to load cell data
										</div>
									</div>
								);
							}

							// Data loaded.
							if (cellData) {
								const address = encodeAddress(cellData.output.lock, networkType);
								const lockIndicator = extractLockScriptIndicator(cellData.output.lock, networkType);
								const typeIndicator = cellData.output.type ? extractTypeScriptIndicator(cellData.output.type, networkType) : null;

								return (
									<div key={index} className="p-4">
										{/* Line 1: Index, outpoint, icons, capacity. */}
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
													#{index}
												</span>
												<OutPoint
													txHash={input.previous_output.tx_hash}
													index={parseInt(input.previous_output.index, 16)}
												/>
												<InternalLinkIcon
													linkTo={generateLink(`/cell/${input.previous_output.tx_hash}/${parseInt(input.previous_output.index, 16)}`)}
													tooltip="View cell"
												/>
											</div>
											<span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
												{formatCkb(cellData.output.capacity)}
											</span>
										</div>

										{/* Line 2: Address. */}
										<div className="ml-6 mb-2">
											<AddressDisplay
												address={address}
												linkTo={generateLink(`/address/${address}`)}
											/>
										</div>

										{/* Line 3: Script pills. */}
										<div className="ml-6 flex flex-wrap gap-1.5">
											{lockIndicator.isKnown ? (
												<ScriptIndicatorPill
													name={lockIndicator.name}
													resourceId={lockIndicator.resourceId}
													description={lockIndicator.description}
												/>
											) : (
												<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
													{lockIndicator.name}
												</span>
											)}
											{typeIndicator && (
												typeIndicator.isKnown ? (
													<ScriptIndicatorPill
														name={typeIndicator.name}
														resourceId={typeIndicator.resourceId}
														description={typeIndicator.description}
													/>
												) : (
													<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
														{typeIndicator.name}
													</span>
												)
											)}
										</div>
									</div>
								);
							}

							// Fallback: show just outpoint.
							return (
								<div key={index} className="p-4">
									<div className="flex items-center gap-3">
										<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
											#{index}
										</span>
										<OutPoint
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
						const address = encodeAddress(output.lock, networkType);
						const lockIndicator = extractLockScriptIndicator(output.lock, networkType);
						const typeIndicator = output.type ? extractTypeScriptIndicator(output.type, networkType) : null;

						return (
							<div key={index} className="p-4">
								{/* Line 1: Index, outpoint, icons, capacity. */}
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<span className="text-xs font-medium text-gray-400 dark:text-gray-500">
											#{index}
										</span>
										<OutPoint txHash={hash} index={index} />
										<InternalLinkIcon
											linkTo={generateLink(`/cell/${hash}/${index}`)}
											tooltip="View cell"
										/>
									</div>
									<span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
										{formatCkb(output.capacity)}
									</span>
								</div>

								{/* Line 2: Address. */}
								<div className="ml-6 mb-2">
									<AddressDisplay
										address={address}
										linkTo={generateLink(`/address/${address}`)}
									/>
								</div>

								{/* Line 3: Script pills. */}
								<div className="ml-6 flex flex-wrap gap-1.5">
									{lockIndicator.isKnown ? (
										<ScriptIndicatorPill
											name={lockIndicator.name}
											resourceId={lockIndicator.resourceId}
											description={lockIndicator.description}
										/>
									) : (
										<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
											{lockIndicator.name}
										</span>
									)}
									{typeIndicator && (
										typeIndicator.isKnown ? (
											<ScriptIndicatorPill
												name={typeIndicator.name}
												resourceId={typeIndicator.resourceId}
												description={typeIndicator.description}
											/>
										) : (
											<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
												{typeIndicator.name}
											</span>
										)
									)}
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
									<OutPoint
										txHash={dep.out_point.tx_hash}
										index={parseInt(dep.out_point.index, 16)}
									/>
									<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${DEP_TYPE} rounded`}>
										{dep.dep_type}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Witnesses. */}
			<WitnessSection witnesses={transaction.witnesses} />
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(status)}`}>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}
