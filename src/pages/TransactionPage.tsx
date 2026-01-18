import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatCkb,
	formatAbsoluteTime,
	formatRelativeTime,
	isValidHex,
	truncateHex,
	formatSince,
} from '../lib/format';
import { encodeAddress } from '../lib/address';
import { lookupLockScript, lookupTypeScript, lookupWellKnownCell } from '../lib/wellKnown';
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
import { Tooltip } from '../components/Tooltip';
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
	/** Full hash for unknown scripts (used for tooltip). */
	fullHash?: string;
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
		fullHash: lock.code_hash,
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
		fullHash: typeScript.code_hash,
	};
}

/** Map well-known cell names to resource page IDs. */
function getWellKnownCellResourceId(name: string): string | undefined {
	// Map dep group and system cell names to their related script resource IDs.
	const resourceIdMap: Record<string, string> = {
		'SECP256K1/blake160 Dep Group': 'secp256k1',
		'SECP256K1/blake160 Lock Binary': 'secp256k1',
		'Multisig Dep Group': 'multisig',
		'Multisig Lock Binary': 'multisig',
		'NervosDAO Binary': 'dao',
		'secp256k1_data': 'secp256k1',
		'Anyone-Can-Pay Dep Group': 'acp',
		'SUDT Binary': 'sudt',
		'xUDT Binary': 'xudt',
		'Omnilock Binary': 'omnilock',
		'Spore Binary': 'spore',
		'Spore Cluster Binary': 'spore',
		'JoyID Dep Group': 'joyid',
		'CoTA Dep Group': 'cota',
		'NostrLock Binary': 'nostr',
		'RGB++ Lock Binary': 'rgbpp',
		'BTC Time Lock Binary': 'rgbpp',
		'CKBFS Dep Group': 'ckbfs',
		'iCKB Dep Group': 'ickb',
	};
	return resourceIdMap[name];
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

	// Cell dependency data fetching state.
	const [cellDepData, setCellDepData] = useState<Map<number, RpcCellWithLifecycle>>(new Map());
	const [cellDepErrors, setCellDepErrors] = useState<Map<number, Error>>(new Map());
	const [cellDepsLoading, setCellDepsLoading] = useState(false);

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

	const fetchCellDepData = useCallback(async (cellDeps: { out_point: { tx_hash: string; index: string }; dep_type: string }[]) => {
		setCellDepsLoading(true);
		setCellDepErrors(new Map());
		setCellDepData(new Map());

		try {
			// Fetch all cell deps in parallel.
			const promises = cellDeps.map(async (dep, idx) => {
				try {
					const cellData = await rpc.getCellLifecycle(
						dep.out_point.tx_hash,
						parseInt(dep.out_point.index, 16),
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

			setCellDepData(dataMap);
			setCellDepErrors(errorMap);
		} catch (error) {
			console.error('Failed to fetch cell dep data:', error);
		} finally {
			setCellDepsLoading(false);
		}
	}, [rpc]);

	useEffect(() => {
		fetchTransaction();
	}, [fetchTransaction]);

	useEffect(() => {
		if (txData?.transaction) {
			fetchInputCellData(txData.transaction.inputs);
			fetchCellDepData(txData.transaction.cell_deps);
		}
	}, [txData, fetchInputCellData, fetchCellDepData]);

	// All derived state and hooks must be called before any early returns.
	// This satisfies React Hooks rules.
	const transaction = txData?.transaction ?? null;
	const tx_status = txData?.tx_status;

	// Check if this is a cellbase transaction.
	const isCellbase = transaction && transaction.inputs.length > 0 && isNullOutpoint(
		transaction.inputs[0].previous_output.tx_hash,
		transaction.inputs[0].previous_output.index
	);

	// Calculate total output amount.
	const totalOutput = useMemo(() => {
		if (!transaction) return 0n;
		return transaction.outputs.reduce((sum, output) => sum + BigInt(output.capacity), 0n);
	}, [transaction]);

	// Calculate transaction fee (only for non-cellbase transactions).
	const transactionFee = useMemo(() => {
		if (!transaction || isCellbase) return null;
		if (inputsLoading || inputCellData.size !== transaction.inputs.length) {
			return undefined; // Loading
		}
		const inputTotal = Array.from(inputCellData.values())
			.reduce((sum, cell) => sum + BigInt(cell.output.capacity), 0n);
		return inputTotal - totalOutput;
	}, [transaction, inputCellData, inputsLoading, isCellbase, totalOutput]);

	// Extract cycles from RPC response.
	const cycles = txData?.cycles ? BigInt(txData.cycles) : null;

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

	if (!txData || !transaction) {
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
								<HashDisplay hash={tx_status.block_hash} linkTo={generateLink(`/block/${tx_status.block_hash}`)} responsive />
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
					<DetailRow label="Total Output">
						<span className="font-mono text-sm text-gray-900 dark:text-white">
							{formatCkb(totalOutput)}
						</span>
					</DetailRow>
					{!isCellbase && (
						<DetailRow label="Transaction Fee">
							{transactionFee === undefined ? (
								<div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
							) : (
								<span className="font-mono text-sm text-gray-900 dark:text-white">
									{formatCkb(transactionFee)}
								</span>
							)}
						</DetailRow>
					)}
					{cycles !== null && (
						<DetailRow label="Cycles">
							<span className="font-mono text-sm text-gray-700 dark:text-gray-300">
								{formatNumber(cycles)}
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

										{/* Line 3: Script pills and since constraint. */}
										<div className="ml-6 flex flex-wrap gap-2 items-center">
											{lockIndicator.isKnown ? (
												<ScriptIndicatorPill
													name={lockIndicator.name}
													resourceId={lockIndicator.resourceId}
													description={lockIndicator.description}
												/>
											) : (
												<Tooltip content={lockIndicator.fullHash || lockIndicator.name}>
													<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
														{lockIndicator.name}
													</span>
												</Tooltip>
											)}
											{typeIndicator && (
												typeIndicator.isKnown ? (
													<ScriptIndicatorPill
														name={typeIndicator.name}
														resourceId={typeIndicator.resourceId}
														description={typeIndicator.description}
													/>
												) : (
													<Tooltip content={typeIndicator.fullHash || typeIndicator.name}>
														<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
															{typeIndicator.name}
														</span>
													</Tooltip>
												)
											)}
											{(() => {
												const sinceFormatted = formatSince(input.since);
												if (sinceFormatted) {
													return (
														<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
															Since: {sinceFormatted}
														</span>
													);
												}
												return null;
											})()}
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
								<div className="ml-6 flex flex-wrap gap-2 items-center">
									{lockIndicator.isKnown ? (
										<ScriptIndicatorPill
											name={lockIndicator.name}
											resourceId={lockIndicator.resourceId}
											description={lockIndicator.description}
										/>
									) : (
										<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
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
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
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
						{transaction.cell_deps.map((dep, index) => {
							const cellData = cellDepData.get(index);
							const depIndex = parseInt(dep.out_point.index, 16);

							// First check if this is a well-known cell by outpoint.
							// This catches dep_groups and system cells that are identified by their location.
							const wellKnownCell = lookupWellKnownCell(dep.out_point.tx_hash, depIndex, networkType);

							// If not a well-known cell, check the type script.
							// The type script identifies what code/data this cell provides.
							const typeIndicator = !wellKnownCell && cellData?.output?.type_
								? extractTypeScriptIndicator(cellData.output.type_, networkType)
								: null;

							// Check if we have any indicator to show on line 2.
							const hasIndicator = wellKnownCell || typeIndicator;

							return (
								<div key={index} className="p-4">
									{/* Line 1: Outpoint and dep type. */}
									<div className="flex items-center gap-3">
										<OutPoint
											txHash={dep.out_point.tx_hash}
											index={depIndex}
										/>
										<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${DEP_TYPE} rounded`}>
											{dep.dep_type}
										</span>
										{cellDepsLoading && !cellData && !wellKnownCell && (
											<span className="text-xs text-gray-400 dark:text-gray-500">Loading...</span>
										)}
									</div>

									{/* Line 2: Script indicator pill (if any). */}
									{hasIndicator && (
										<div className="flex flex-wrap gap-2 items-center mt-2">
											{wellKnownCell && (
												<ScriptIndicatorPill
													name={wellKnownCell.name}
													resourceId={getWellKnownCellResourceId(wellKnownCell.name)}
													description={wellKnownCell.description}
												/>
											)}
											{typeIndicator && (
												typeIndicator.isKnown ? (
													<ScriptIndicatorPill
														name={typeIndicator.name}
														resourceId={typeIndicator.resourceId}
														description={typeIndicator.description}
													/>
												) : (
													<Tooltip content={typeIndicator.fullHash || typeIndicator.name}>
														<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
															{typeIndicator.name}
														</span>
													</Tooltip>
												)
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Header Deps. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Header Dependencies ({transaction.header_deps.length})
					</h2>
				</div>
				{transaction.header_deps.length > 0 ? (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{transaction.header_deps.map((headerHash, index) => (
							<div key={index} className="p-4">
								<HashDisplay hash={headerHash} linkTo={`/block/${headerHash}`} />
							</div>
						))}
					</div>
				) : (
					<div className="p-4 text-sm text-gray-500 dark:text-gray-400">
						No header dependencies
					</div>
				)}
			</div>

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
