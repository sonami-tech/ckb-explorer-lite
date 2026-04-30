import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { useStats } from '../contexts/StatsContext';
import {
	getNetworkFromPrefix,
	getFormatDescription,
	getAlternateAddress,
	AddressFormat,
} from '../lib/address';
import { formatNumber, formatCkb } from '../lib/format';
import { scriptToLockHash } from '../lib/lockHash';
import { navigate, generateLink } from '../lib/router';
import { fromHex } from '../lib/rpc';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { DetailRow } from '../components/DetailRow';
import { AddressDisplay } from '../components/AddressDisplay';
import { InternalLink } from '../components/InternalLink';
import { ScriptSection } from '../components/ScriptSection';
import { ScriptLink } from '../components/ScriptLink';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import { TransactionRow, type EnrichedTransaction } from '../components/TransactionRow';
import { useAddressScript } from '../hooks/useAddressScript';
import { useEnrichTransactions, type MinimalTransactionInfo } from '../hooks/useEnrichTransactions';
import type { IndexerSearchKey } from '../types/rpc';
import type { StatsAllAddressResponse } from '../types/stats';

interface AddressPageProps {
	address: string;
}

export function AddressPage({ address }: AddressPageProps) {
	const rpc = useRpc();
	const { currentNetwork, isArchiveSupported } = useNetwork();
	const { archiveHeight } = useArchive();
	const { statsClient, isStatsAvailable } = useStats();
	const networkType = currentNetwork?.type ?? 'mainnet';

	// Parse address using hook.
	const { script, format: addressFormat, prefix: networkPrefix, error: parseError, isReady } = useAddressScript(address);

	// Transaction enrichment callback.
	const enrichTransactions = useEnrichTransactions(networkType);

	// Data state.
	const [balance, setBalance] = useState<bigint | null>(null);
	const [cellCount, setCellCount] = useState<bigint | null>(null);
	const [transactionCount, setTransactionCount] = useState<bigint | null>(null);
	const [recentTransactions, setRecentTransactions] = useState<EnrichedTransaction[]>([]);
	const [referenceTimestamp, setReferenceTimestamp] = useState<number | undefined>(undefined);
	const [daoStats, setDaoStats] = useState<StatsAllAddressResponse['dao'] | null>(null);
	const [typedStats, setTypedStats] = useState<StatsAllAddressResponse['typed'] | null>(null);

	// UI state.
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchIdRef = useRef(0);

	// Fetch all data.
	const fetchData = useCallback(async () => {
		if (!script) return;

		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);
		setDaoStats(null);
		setTypedStats(null);

		try {
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
			};

			// Fetch archive block timestamp if in archive mode.
			let archiveTimestamp: number | undefined;
			if (archiveHeight !== undefined) {
				const archiveHeader = await rpc.getHeaderByNumber(BigInt(archiveHeight), archiveHeight);
				if (archiveHeader) {
					archiveTimestamp = Number(BigInt(archiveHeader.timestamp));
				}
			}

			// RPC fallback path — used when stats server is unavailable or errors.
			// Count methods are archive-fork extensions; skip them on non-archive networks.
			async function fetchDataViaRpc() {
				const [rpcBalanceResult, rpcCellsCountResult, rpcTxCountResult, groupedTxsResult] = await Promise.all([
					rpc.getCellsCapacity(searchKey, archiveHeight),
					isArchiveSupported ? rpc.getCellsCount(searchKey, archiveHeight) : Promise.resolve(null),
					isArchiveSupported ? rpc.getTransactionsCount(searchKey, archiveHeight) : Promise.resolve(null),
					rpc.getGroupedTransactions(searchKey, 'desc', PAGE_SIZE_CONFIG.preview, undefined, archiveHeight),
				]);

				if (fetchId !== fetchIdRef.current) return;

				setBalance(rpcBalanceResult);
				setCellCount(rpcCellsCountResult ? BigInt(rpcCellsCountResult.count) : null);
				setTransactionCount(rpcTxCountResult ? BigInt(rpcTxCountResult.count) : null);
				setReferenceTimestamp(archiveTimestamp);

				const enriched = await enrichTransactions(groupedTxsResult.objects);

				if (fetchId !== fetchIdRef.current) return;

				setRecentTransactions(enriched);
			}

			// Fetch data — use stats server if available, fall back to RPC on error.
			if (isStatsAvailable && statsClient && script) {
				try {
					const lockHash = scriptToLockHash(script);
					const statsResult = await statsClient.getAllAddressStats(lockHash, archiveHeight);

					if (fetchId !== fetchIdRef.current) return;

					let recentTxSource: MinimalTransactionInfo[];

					if (statsResult) {
						setBalance(fromHex(statsResult.core.capacity));
						setCellCount(fromHex(statsResult.core.live_cell_count));
						setTransactionCount(fromHex(statsResult.core.tx_count));
						setDaoStats(statsResult.dao);
						setTypedStats(statsResult.typed);
						setReferenceTimestamp(archiveTimestamp);

						if (statsResult.core.tx_history_available) {
							const txHistory = await statsClient.getAddressTransactions(
								lockHash, 0, PAGE_SIZE_CONFIG.preview, 'newest', archiveHeight,
							);
							recentTxSource = txHistory.transactions;
						} else {
							const groupedTxsResult = await rpc.getGroupedTransactions(
								searchKey, 'desc', PAGE_SIZE_CONFIG.preview, undefined, archiveHeight,
							);
							recentTxSource = groupedTxsResult.objects;
						}
					} else {
						const groupedTxsResult = await rpc.getGroupedTransactions(
							searchKey, 'desc', PAGE_SIZE_CONFIG.preview, undefined, archiveHeight,
						);
						recentTxSource = groupedTxsResult.objects;
					}

					if (fetchId !== fetchIdRef.current) return;

					const enriched = await enrichTransactions(recentTxSource);

					if (fetchId !== fetchIdRef.current) return;

					setRecentTransactions(enriched);
				} catch (statsErr) {
					console.warn('Stats server error, falling back to RPC:', statsErr);
					if (fetchId !== fetchIdRef.current) return;
					await fetchDataViaRpc();
				}
			} else {
				await fetchDataViaRpc();
			}
		} catch (err) {
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch address data.'));
		} finally {
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, script, archiveHeight, enrichTransactions, statsClient, isStatsAvailable, isArchiveSupported]);

	useEffect(() => {
		if (script) {
			fetchData();
		}
	}, [fetchData, script]);

	// Derive display values.
	const networkName = getNetworkFromPrefix(networkPrefix);
	const formatDescription = getFormatDescription(addressFormat);
	const isDeprecated = addressFormat !== AddressFormat.Full;

	// Alternate address.
	const alternateAddress = script
		? getAlternateAddress(address, script, networkType)
		: null;

	// Combine parse error with fetch error.
	const displayError = parseError ?? error;

	// Show loading while parsing or fetching.
	if (!isReady || (isReady && !parseError && isLoading)) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<SkeletonDetail />
			</div>
		);
	}

	if (displayError) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<ErrorDisplay
					error={displayError}
					title="Address Error"
					description="Unable to load address data. Check that the address format is valid and you are connected to the correct network."
					onRetry={script ? fetchData : undefined}
				/>
			</div>
		);
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
					<span aria-current="page">Address</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Address{archiveHeight !== undefined && ` @ Block ${formatNumber(archiveHeight)}`}
				</h1>
			</div>

			{/* Overview section. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Address">
						<AddressDisplay address={address} truncate={false} />
					</DetailRow>

					<DetailRow label="Network">
						<span className="text-gray-900 dark:text-white">{networkName}</span>
					</DetailRow>

					<DetailRow label="Format">
						<span className="text-gray-900 dark:text-white">
							{formatDescription}
							{isDeprecated && (
								<span className="ml-2 text-amber-600 dark:text-amber-400 text-sm">
									— Deprecated
								</span>
							)}
						</span>
					</DetailRow>

					<DetailRow label="Lock Script">
						{script ? (
							<ScriptLink
								script={script}
								scriptType="lock"
								networkType={networkType}
							/>
						) : (
							<span className="text-gray-500 dark:text-gray-400">Other</span>
						)}
					</DetailRow>

					{alternateAddress && (
						<DetailRow label={`${alternateAddress.formatLabel} Address`}>
							<AddressDisplay address={alternateAddress.address} truncate={false} />
						</DetailRow>
					)}

					<DetailRow label="Balance">
						<span className="text-lg font-semibold text-nervos">
							{balance !== null ? formatCkb(balance) : '...'}
						</span>
					</DetailRow>

					<DetailRow label="Transactions">
						<div className="flex items-center gap-3">
							<span className="font-mono text-gray-900 dark:text-white">
								{transactionCount !== null ? formatNumber(transactionCount) : 'N/A'}
							</span>
							<button
								onClick={() => navigate(generateLink(`/address/${address}/transactions`))}
								className="text-sm text-nervos hover:text-nervos-dark"
							>
								View All →
							</button>
						</div>
					</DetailRow>

					<DetailRow label="Live Cells">
						<div className="flex items-center gap-3">
							<span className="font-mono text-gray-900 dark:text-white">
								{cellCount !== null ? formatNumber(cellCount) : 'N/A'}
							</span>
							<button
								onClick={() => navigate(generateLink(`/address/${address}/cells`))}
								className="text-sm text-nervos hover:text-nervos-dark"
							>
								View All →
							</button>
						</div>
					</DetailRow>

					{isStatsAvailable && (
						<DetailRow label="Typed Cells">
							<span className="font-mono text-gray-900 dark:text-white">
								{typedStats ? formatNumber(fromHex(typedStats.typed_cell_count)) : '...'}
							</span>
						</DetailRow>
					)}
				</div>
			</div>

			{/* DAO Statistics. */}
			{isStatsAvailable && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="font-semibold text-gray-900 dark:text-white">DAO Statistics</h2>
					</div>
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						<DetailRow label="Active Deposits">
							<span className="text-nervos font-semibold">
								{daoStats ? formatCkb(fromHex(daoStats.active_deposits)) : '...'}
							</span>
						</DetailRow>
						<DetailRow label="Pending Withdrawals">
							<span className="font-mono text-gray-900 dark:text-white">
								{daoStats ? formatCkb(fromHex(daoStats.pending_withdrawals)) : '...'}
							</span>
						</DetailRow>
						<DetailRow label="Realized Compensation">
							<span className="font-mono text-gray-900 dark:text-white">
								{daoStats ? formatCkb(fromHex(daoStats.realized_compensation)) : '...'}
							</span>
						</DetailRow>
					</div>
				</div>
			)}

			{/* Lock Script. */}
			{script && (
				<ScriptSection title="Lock Script" script={script} />
			)}

			{/* Recent Transactions. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between gap-3">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Recent Transactions
						</h2>
						<button
							onClick={() => navigate(generateLink(`/address/${address}/transactions`))}
							className="text-sm text-nervos hover:text-nervos-dark whitespace-nowrap"
						>
							View All →
						</button>
					</div>
				</div>
				<div>
					{recentTransactions.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No transactions found for this address.
						</div>
					) : (
						recentTransactions.map((tx) => (
							<TransactionRow
								key={tx.txHash}
								transaction={tx}
								referenceTime={referenceTimestamp}
							/>
						))
					)}
				</div>
				{recentTransactions.length > 0 && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
						<button
							onClick={() => navigate(generateLink(`/address/${address}/transactions`))}
							className="text-sm text-nervos hover:text-nervos-dark"
						>
							View All Transactions →
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
