import { useState, useEffect, useCallback, useRef, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { fetchCellData, isNullOutpoint } from '../lib/cellFetcher';
import type { RpcClient } from '../lib/rpc';
import {
	formatNumber,
	formatCkb,
	formatAbsoluteTime,
	formatRelativeTime,
	isValidHex,
} from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import { DetailRow } from '../components/DetailRow';
import { InternalLink } from '../components/InternalLink';
import { WitnessSection } from '../components/WitnessSection';
import { ArchiveHeightWarning } from '../components/ArchiveHeightWarning';
import { Pagination } from '../components/Pagination';
import { TransactionStatusIndicator } from '../components/OptionIndicator';
import { FieldValue, buildFieldState, type FieldState } from '../components/FieldValue';
import { TransactionInput, TransactionOutput, CellDepItem } from '../components/transaction';
import type { RpcTransaction, RpcTransactionWithStatus, RpcCellInput, RpcCellWithLifecycle } from '../types/rpc';
import { TRANSACTION_SECTION_PAGINATION, FEE_CALCULATION_MAX_INPUTS, MIRANA_HARDFORK_BLOCK } from '../config/defaults';

interface TransactionPageProps {
	hash: string;
}

/** Fetch cell data for a batch of inputs, returning per-index results. */
async function fetchInputCells(
	inputs: RpcCellInput[],
	startIndex: number,
	rpc: RpcClient,
	isArchiveSupported: boolean,
): Promise<{ index: number; cellData: RpcCellWithLifecycle | null; error: Error | null }[]> {
	const promises = inputs.map(async (input, paginatedIdx) => {
		const actualIndex = startIndex + paginatedIdx;
		if (isNullOutpoint(input.previous_output.tx_hash, input.previous_output.index)) {
			return { index: actualIndex, cellData: null, error: null };
		}

		try {
			const result = await fetchCellData(
				rpc,
				input.previous_output.tx_hash,
				parseInt(input.previous_output.index, 16),
				isArchiveSupported,
				true
			);
			return { index: actualIndex, cellData: result?.cell ?? null, error: null };
		} catch (error) {
			return { index: actualIndex, cellData: null, error: error as Error };
		}
	});

	return Promise.all(promises);
}

/** Merge fetch results into inputCellData and inputErrors state maps. */
function mergeInputResults(
	results: { index: number; cellData: RpcCellWithLifecycle | null; error: Error | null }[],
	setInputCellData: Dispatch<SetStateAction<Map<number, RpcCellWithLifecycle>>>,
	setInputErrors: Dispatch<SetStateAction<Map<number, Error>>>,
) {
	setInputCellData(prev => {
		const dataMap = new Map(prev);
		for (const result of results) {
			if (result.cellData) {
				dataMap.set(result.index, result.cellData);
			}
		}
		return dataMap;
	});

	setInputErrors(prev => {
		const errorMap = new Map(prev);
		for (const result of results) {
			if (result.error) {
				errorMap.set(result.index, result.error);
			}
		}
		return errorMap;
	});
}

export function TransactionPage({ hash }: TransactionPageProps) {
	const rpc = useRpc();
	const { currentNetwork, isArchiveSupported } = useNetwork();
	const [txData, setTxData] = useState<RpcTransactionWithStatus | null>(null);
	const [blockTimestamp, setBlockTimestamp] = useState<bigint | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Input cell data fetching state.
	const [inputCellData, setInputCellData] = useState<Map<number, RpcCellWithLifecycle>>(new Map());
	const [inputErrors, setInputErrors] = useState<Map<number, Error>>(new Map());
	const [inputsLoading, setInputsLoading] = useState(false);
	const [feePrefetchComplete, setFeePrefetchComplete] = useState(false);

	// Cell dependency data fetching state.
	const [cellDepData, setCellDepData] = useState<Map<number, RpcCellWithLifecycle>>(new Map());
	const [cellDepsLoading, setCellDepsLoading] = useState(false);

	// Pagination state for inputs.
	const [inputsPage, setInputsPage] = useState(1);
	const [inputsPageSize, setInputsPageSize] = useState<number>(TRANSACTION_SECTION_PAGINATION.defaultPageSize);

	// Pagination state for outputs.
	const [outputsPage, setOutputsPage] = useState(1);
	const [outputsPageSize, setOutputsPageSize] = useState<number>(TRANSACTION_SECTION_PAGINATION.defaultPageSize);

	// Pagination state for cell dependencies.
	const [cellDepsPage, setCellDepsPage] = useState(1);
	const [cellDepsPageSize, setCellDepsPageSize] = useState<number>(TRANSACTION_SECTION_PAGINATION.defaultPageSize);

	// Pagination state for header dependencies.
	const [headerDepsPage, setHeaderDepsPage] = useState(1);
	const [headerDepsPageSize, setHeaderDepsPageSize] = useState<number>(TRANSACTION_SECTION_PAGINATION.defaultPageSize);

	const networkType = currentNetwork?.type ?? 'mainnet';

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchTransaction = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		// Reset every piece of per-transaction state synchronously at fetch
		// start so a failed or in-flight fetch can't leave the previous
		// transaction's derived flags (feePrefetchComplete, page indexes,
		// per-input caches) alive under a new transaction's view. Doing this
		// up front — not after await — keeps the reset atomic with the
		// loading state and survives error paths.
		setIsLoading(true);
		setError(null);
		setBlockTimestamp(null);
		setInputCellData(new Map());
		setInputErrors(new Map());
		setCellDepData(new Map());
		setFeePrefetchComplete(false);
		setInputsPage(1);
		setOutputsPage(1);
		setCellDepsPage(1);
		setHeaderDepsPage(1);
		// fetchPageInputs and fetchCellDepData skip their finally setState
		// when their captured fetchId is stale, so a prior in-flight fetch
		// that bails leaves these flags true. Reset them here so the new
		// fetch's render starts from a clean loading-false baseline.
		setInputsLoading(false);
		setCellDepsLoading(false);

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
				throw new Error(hash);
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

	const fetchPageInputs = useCallback(async (inputs: RpcCellInput[], startIndex: number) => {
		// Capture the parent fetchTransaction's id at start; if the transaction
		// or network changes mid-flight, any new fetchTransaction increments the
		// id and this response must not commit to the now-different page.
		const fetchId = fetchIdRef.current;

		setInputsLoading(true);

		try {
			const results = await fetchInputCells(inputs, startIndex, rpc, isArchiveSupported);
			if (fetchId !== fetchIdRef.current) return;
			mergeInputResults(results, setInputCellData, setInputErrors);
		} catch (error) {
			console.error('Failed to fetch input cell data:', error);
		} finally {
			if (fetchId === fetchIdRef.current) {
				setInputsLoading(false);
			}
		}
	}, [rpc, isArchiveSupported]);

	const fetchCellDepData = useCallback(async (
		cellDeps: { out_point: { tx_hash: string; index: string }; dep_type: string }[],
		startIndex: number
	) => {
		const fetchId = fetchIdRef.current;

		setCellDepsLoading(true);

		try {
			// Fetch only current page cell deps in parallel.
			const promises = cellDeps.map(async (dep, paginatedIdx) => {
				const actualIndex = startIndex + paginatedIdx;
				try {
					const result = await fetchCellData(
						rpc,
						dep.out_point.tx_hash,
						parseInt(dep.out_point.index, 16),
						isArchiveSupported,
						true
					);
					return { index: actualIndex, cellData: result?.cell ?? null };
				} catch (error) {
					console.error(`Failed to fetch cell dep ${actualIndex}:`, error);
					return { index: actualIndex, cellData: null };
				}
			});

			const results = await Promise.all(promises);

			if (fetchId !== fetchIdRef.current) return;

			setCellDepData(prev => {
				const dataMap = new Map(prev);
				results.forEach(result => {
					if (result.cellData) {
						dataMap.set(result.index, result.cellData);
					}
				});
				return dataMap;
			});
		} catch (error) {
			console.error('Failed to fetch cell dep data:', error);
		} finally {
			if (fetchId === fetchIdRef.current) {
				setCellDepsLoading(false);
			}
		}
	}, [rpc, isArchiveSupported]);

	const handleInputsPageSizeChange = useCallback((newSize: number) => {
		setInputsPageSize(newSize);
		setInputsPage(1); // Reset to first page when size changes
	}, []);

	const handleOutputsPageSizeChange = useCallback((newSize: number) => {
		setOutputsPageSize(newSize);
		setOutputsPage(1); // Reset to first page when size changes
	}, []);

	const handleCellDepsPageSizeChange = useCallback((newSize: number) => {
		setCellDepsPageSize(newSize);
		setCellDepsPage(1); // Reset to first page when size changes
	}, []);

	const handleHeaderDepsPageSizeChange = useCallback((newSize: number) => {
		setHeaderDepsPageSize(newSize);
		setHeaderDepsPage(1);
	}, []);

	// All derived state and hooks must be called before any early returns.
	// This satisfies React Hooks rules.
	const transaction = txData?.transaction ?? null;
	// tx_status is always present when txData exists per RpcTransactionWithStatus interface.
	const tx_status = txData?.tx_status ?? { status: 'unknown' as const };

	// Check if this is a cellbase transaction.
	const isCellbase = transaction && transaction.inputs.length > 0 && isNullOutpoint(
		transaction.inputs[0].previous_output.tx_hash,
		transaction.inputs[0].previous_output.index
	);

	// Pagination for inputs.
	const shouldPaginateInputs = transaction && transaction.inputs.length > TRANSACTION_SECTION_PAGINATION.threshold;
	const inputsStartIndex = (inputsPage - 1) * inputsPageSize;
	const inputsEndIndex = shouldPaginateInputs
		? Math.min(inputsStartIndex + inputsPageSize, transaction?.inputs.length ?? 0)
		: transaction?.inputs.length ?? 0;
	const paginatedInputs = useMemo(() => {
		if (shouldPaginateInputs && transaction) {
			return transaction.inputs.slice(inputsStartIndex, inputsEndIndex);
		}
		return transaction?.inputs ?? [];
	}, [shouldPaginateInputs, transaction, inputsStartIndex, inputsEndIndex]);

	// Pagination for outputs.
	const shouldPaginateOutputs = transaction && transaction.outputs.length > TRANSACTION_SECTION_PAGINATION.threshold;
	const outputsStartIndex = (outputsPage - 1) * outputsPageSize;
	const outputsEndIndex = shouldPaginateOutputs
		? Math.min(outputsStartIndex + outputsPageSize, transaction?.outputs.length ?? 0)
		: transaction?.outputs.length ?? 0;
	const paginatedOutputs = useMemo(() => {
		if (shouldPaginateOutputs && transaction) {
			return transaction.outputs.slice(outputsStartIndex, outputsEndIndex);
		}
		return transaction?.outputs ?? [];
	}, [shouldPaginateOutputs, transaction, outputsStartIndex, outputsEndIndex]);

	// Pagination for cell dependencies.
	const shouldPaginateCellDeps = transaction && transaction.cell_deps.length > TRANSACTION_SECTION_PAGINATION.threshold;
	const cellDepsStartIndex = (cellDepsPage - 1) * cellDepsPageSize;
	const cellDepsEndIndex = shouldPaginateCellDeps
		? Math.min(cellDepsStartIndex + cellDepsPageSize, transaction?.cell_deps.length ?? 0)
		: transaction?.cell_deps.length ?? 0;
	const paginatedCellDeps = useMemo(() => {
		if (shouldPaginateCellDeps && transaction) {
			return transaction.cell_deps.slice(cellDepsStartIndex, cellDepsEndIndex);
		}
		return transaction?.cell_deps ?? [];
	}, [shouldPaginateCellDeps, transaction, cellDepsStartIndex, cellDepsEndIndex]);

	// Pagination for header dependencies.
	const shouldPaginateHeaderDeps = transaction && transaction.header_deps.length > TRANSACTION_SECTION_PAGINATION.threshold;
	const headerDepsStartIndex = (headerDepsPage - 1) * headerDepsPageSize;
	const headerDepsEndIndex = shouldPaginateHeaderDeps
		? Math.min(headerDepsStartIndex + headerDepsPageSize, transaction?.header_deps.length ?? 0)
		: transaction?.header_deps.length ?? 0;
	const paginatedHeaderDeps = useMemo(() => {
		if (shouldPaginateHeaderDeps && transaction) {
			return transaction.header_deps.slice(headerDepsStartIndex, headerDepsEndIndex);
		}
		return transaction?.header_deps ?? [];
	}, [shouldPaginateHeaderDeps, transaction, headerDepsStartIndex, headerDepsEndIndex]);

	// Calculate total output amount.
	const totalOutput = useMemo(() => {
		if (!transaction) return 0n;
		return transaction.outputs.reduce((sum, output) => sum + BigInt(output.capacity), 0n);
	}, [transaction]);

	// Calculate transaction fee (only for non-cellbase transactions).
	// Returns: bigint (calculated), null (cellbase), 'unavailable' (too many inputs), undefined (loading).
	const transactionFee = useMemo(() => {
		if (!transaction || isCellbase) return null;

		// Check input count FIRST to avoid skeleton flash for large transactions.
		if (transaction.inputs.length > FEE_CALCULATION_MAX_INPUTS) {
			return 'unavailable';
		}

		if (!feePrefetchComplete) {
			return undefined; // Loading
		}
		const inputTotal = Array.from(inputCellData.values())
			.reduce((sum, cell) => sum + BigInt(cell.output.capacity), 0n);
		return inputTotal - totalOutput;
	}, [transaction, inputCellData, feePrefetchComplete, isCellbase, totalOutput]);

	// Extract cycles from RPC response.
	const cycles = txData?.cycles ? BigInt(txData.cycles) : null;

	// Determine reason why fee is unavailable.
	const feeUnavailableReason = useMemo(() => {
		if (isCellbase) {
			return 'Cellbase transactions have no inputs and therefore no fee.';
		}

		if (transaction && transaction.inputs.length > FEE_CALCULATION_MAX_INPUTS) {
			return `Fee calculation unavailable for transactions with more than ${FEE_CALCULATION_MAX_INPUTS} inputs.`;
		}

		return null;
	}, [isCellbase, transaction]);

	// Determine reason why cycles is unavailable.
	const cyclesUnavailableReason = useMemo(() => {
		if (cycles !== null) return null;

		if (isCellbase) {
			return 'Cellbase transactions do not execute scripts.';
		}

		const blockNumber = tx_status?.block_number ? BigInt(tx_status.block_number) : null;
		if (blockNumber !== null && blockNumber < MIRANA_HARDFORK_BLOCK) {
			return 'Cycles were not recorded before the Mirana (CKB2021) hardfork.';
		}

		return 'Cycles unavailable.';
	}, [cycles, isCellbase, tx_status?.block_number]);

	// Effects: Fetch transaction data and cell dependencies.
	useEffect(() => {
		fetchTransaction();
	}, [fetchTransaction]);

	useEffect(() => {
		if (paginatedInputs.length > 0) {
			fetchPageInputs(paginatedInputs, inputsStartIndex);
		}
	}, [paginatedInputs, inputsStartIndex, fetchPageInputs]);

	// Prefetch all input cell data for fee calculation (up to FEE_CALCULATION_MAX_INPUTS).
	// This runs independently of pagination to ensure fee displays immediately.
	useEffect(() => {
		if (!transaction || isCellbase) return;
		if (transaction.inputs.length > FEE_CALCULATION_MAX_INPUTS) {
			setFeePrefetchComplete(true); // Skip prefetch, fee will show as unavailable
			return;
		}

		// Capture id so a network or hash change during prefetch can drop the
		// stale results before they merge into the current transaction's state.
		const fetchId = fetchIdRef.current;

		const prefetchAllInputs = async () => {
			const results = await fetchInputCells(transaction.inputs, 0, rpc, isArchiveSupported);
			if (fetchId !== fetchIdRef.current) return;
			mergeInputResults(results, setInputCellData, setInputErrors);
			setFeePrefetchComplete(true);
		};

		prefetchAllInputs();
	}, [transaction, isCellbase, rpc, isArchiveSupported]);

	useEffect(() => {
		if (paginatedCellDeps.length > 0) {
			fetchCellDepData(paginatedCellDeps, cellDepsStartIndex);
		}
	}, [paginatedCellDeps, cellDepsStartIndex, fetchCellDepData]);

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
				<ErrorDisplay
					error={error}
					title="Transaction Not Found"
					description="This transaction does not exist on the connected network. Verify the transaction hash is correct and that you are connected to the right network."
					onRetry={fetchTransaction}
				/>
			</div>
		);
	}

	if (!txData || !transaction) {
		return null;
	}

	const transactionFeeState: FieldState<bigint> = feeUnavailableReason !== null
		? { kind: 'uncomputable', reason: feeUnavailableReason }
		: transactionFee === undefined
			? { kind: 'loading' }
			: { kind: 'value', value: transactionFee as bigint };
	const cyclesState = buildFieldState<bigint>({
		value: cycles,
		uncomputableReason: cyclesUnavailableReason ?? 'Cycles unavailable.',
	});

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
						<TransactionStatusIndicator status={tx_status.status} />
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
					<DetailRow label="Transaction Fee">
						<FieldValue
							state={transactionFeeState}
							format={(v) => formatCkb(v)}
							width="medium"
							className="font-mono text-sm text-gray-900 dark:text-white"
						/>
					</DetailRow>
					<DetailRow label="Cycles">
						<FieldValue
							state={cyclesState}
							format={(v) => formatNumber(v)}
							width="medium"
							className="font-mono text-sm text-gray-700 dark:text-gray-300"
						/>
					</DetailRow>
				</div>
			</div>

			{/* Inputs. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Inputs ({formatNumber(transaction.inputs.length)})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{transaction.inputs.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No inputs (Cellbase transaction)
						</div>
					) : (
						paginatedInputs.map((input, paginatedIndex) => {
							const index = inputsStartIndex + paginatedIndex;
							return (
								<TransactionInput
									key={index}
									input={input}
									index={index}
									cellData={inputCellData.get(index)}
									fetchError={inputErrors.get(index)}
									isLoading={inputsLoading}
									networkType={networkType}
									miningReward={isCellbase ? totalOutput : undefined}
								/>
							);
						})
					)}
				</div>
				{shouldPaginateInputs && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={inputsPage}
							totalItems={transaction.inputs.length}
							pageSize={inputsPageSize}
							pageSizeOptions={TRANSACTION_SECTION_PAGINATION.options}
							onPageChange={setInputsPage}
							onPageSizeChange={handleInputsPageSizeChange}
						/>
					</div>
				)}
			</div>

			{/* Outputs. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Outputs ({formatNumber(transaction.outputs.length)})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{paginatedOutputs.map((output, paginatedIndex) => {
						const index = outputsStartIndex + paginatedIndex;
						return (
							<TransactionOutput
								key={index}
								output={output}
								index={index}
								txHash={hash}
								networkType={networkType}
							/>
						);
					})}
				</div>
				{shouldPaginateOutputs && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={outputsPage}
							totalItems={transaction.outputs.length}
							pageSize={outputsPageSize}
							pageSizeOptions={TRANSACTION_SECTION_PAGINATION.options}
							onPageChange={setOutputsPage}
							onPageSizeChange={handleOutputsPageSizeChange}
						/>
					</div>
				)}
			</div>

			{/* Cell Deps. */}
			{transaction.cell_deps.length > 0 && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Cell Dependencies ({formatNumber(transaction.cell_deps.length)})
						</h2>
					</div>
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{paginatedCellDeps.map((dep, paginatedIndex) => {
							const index = cellDepsStartIndex + paginatedIndex;
							return (
								<CellDepItem
									key={index}
									dep={dep}
									cellData={cellDepData.get(index)}
									isLoading={cellDepsLoading}
									networkType={networkType}
								/>
							);
						})}
					</div>
					{shouldPaginateCellDeps && (
						<div className="p-4 border-t border-gray-200 dark:border-gray-700">
							<Pagination
								currentPage={cellDepsPage}
								totalItems={transaction.cell_deps.length}
								pageSize={cellDepsPageSize}
								pageSizeOptions={TRANSACTION_SECTION_PAGINATION.options}
								onPageChange={setCellDepsPage}
								onPageSizeChange={handleCellDepsPageSizeChange}
							/>
						</div>
					)}
				</div>
			)}

			{/* Header Deps. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Header Dependencies ({formatNumber(transaction.header_deps.length)})
					</h2>
				</div>
				{transaction.header_deps.length > 0 ? (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{paginatedHeaderDeps.map((headerHash, paginatedIndex) => {
							const index = headerDepsStartIndex + paginatedIndex;
							return (
								<div key={index} className="p-4">
									<HashDisplay hash={headerHash} linkTo={generateLink(`/block/${headerHash}`)} responsive />
								</div>
							);
						})}
					</div>
				) : (
					<div className="p-4 text-sm text-gray-500 dark:text-gray-400">
						No header dependencies
					</div>
				)}
				{shouldPaginateHeaderDeps && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={headerDepsPage}
							totalItems={transaction.header_deps.length}
							pageSize={headerDepsPageSize}
							pageSizeOptions={TRANSACTION_SECTION_PAGINATION.options}
							onPageChange={setHeaderDepsPage}
							onPageSizeChange={handleHeaderDepsPageSizeChange}
						/>
					</div>
				)}
			</div>

			{/* Witnesses. */}
			<WitnessSection witnesses={transaction.witnesses} />
		</div>
	);
}

