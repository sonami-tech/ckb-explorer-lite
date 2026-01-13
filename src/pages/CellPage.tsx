import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { encodeAddress } from '../lib/address';
import { formatCkb } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { fromHex } from '../lib/rpc';
import { lookupWellKnownCell, lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { AddressDisplay } from '../components/AddressDisplay';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { CellDataSection } from '../components/CellDataDisplay';
import { DetailRow } from '../components/DetailRow';
import { OutPoint } from '../components/OutPoint';
import { CellStatusIndicator } from '../components/OptionIndicator';
import { ScriptSection } from '../components/ScriptSection';
import { BlockNumberDisplay } from '../components/BlockNumberDisplay';
import { WellKnownCellInfo } from '../components/WellKnownCellInfo';
import type { RpcCellWithLifecycle } from '../types/rpc';

interface CellPageProps {
	txHash: string;
	index: number;
}

export function CellPage({ txHash, index }: CellPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const [cellData, setCellData] = useState<RpcCellWithLifecycle | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const networkType = currentNetwork?.type ?? 'mainnet';

	// Look up well-known cell info by outpoint.
	const wellKnownCellInfo = useMemo(
		() => lookupWellKnownCell(txHash, index, networkType),
		[txHash, index, networkType]
	);

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

	// Derive block numbers from lifecycle data.
	const createdBlock = cellData ? Number(fromHex(cellData.created_block_number)) : null;
	const consumedBlock = cellData?.consumed_block_number
		? Number(fromHex(cellData.consumed_block_number))
		: null;

	// Derive status based on current state.
	const status = consumedBlock === null ? 'live' : 'dead';

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

			{/* Well-known cell info (if applicable). */}
			{wellKnownCellInfo && (
				<WellKnownCellInfo info={wellKnownCellInfo} />
			)}

			{/* Cell details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="OutPoint">
						<OutPoint txHash={txHash} index={index} linkTo="transaction" />
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
					{cellData && (
						<DetailRow label="Address">
							<AddressDisplay
								address={encodeAddress(cellData.output.lock, networkType)}
								linkTo={generateLink(`/address/${encodeAddress(cellData.output.lock, networkType)}`)}
							/>
						</DetailRow>
					)}
					{cellData && (
						<DetailRow label="Lock Script">
							<span className="text-gray-900 dark:text-white">
								{lookupLockScript(
									cellData.output.lock.code_hash,
									cellData.output.lock.hash_type,
									networkType,
									cellData.output.lock.args
								)?.name ?? 'Unknown'}
							</span>
						</DetailRow>
					)}
					{cellData && (
						<DetailRow label="Type Script">
							<span className="text-gray-900 dark:text-white">
								{cellData.output.type
									? (lookupTypeScript(
										cellData.output.type.code_hash,
										cellData.output.type.hash_type,
										networkType,
										cellData.output.type.args
									)?.name ?? 'Unknown')
									: 'None'}
							</span>
						</DetailRow>
					)}
					{createdBlock !== null && (
						<DetailRow label="Created at Block">
							<BlockNumberDisplay blockNumber={createdBlock} linkTo={generateLink(`/block/${createdBlock}`)} />
						</DetailRow>
					)}
					<DetailRow label="Consumed at Block">
						{consumedBlock !== null ? (
							<BlockNumberDisplay blockNumber={consumedBlock} linkTo={generateLink(`/block/${consumedBlock}`)} />
						) : (
							<span className="text-gray-400 dark:text-gray-500">—</span>
						)}
					</DetailRow>
				</div>
			</div>

			{/* Lock Script. */}
			{cellData && (
				<ScriptSection title="Lock Script" script={cellData.output.lock} />
			)}

			{/* Type Script. */}
			{cellData && (
				cellData.output.type ? (
					<ScriptSection title="Type Script" script={cellData.output.type} />
				) : (
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
						<div className="p-4 border-b border-gray-200 dark:border-gray-700">
							<h2 className="font-semibold text-gray-900 dark:text-white">Type Script</h2>
						</div>
						<div className="p-4">
							<span className="text-sm text-gray-500 dark:text-gray-400 italic">
								This cell has no type script.
							</span>
						</div>
					</div>
				)
			)}

			{/* Cell Data. */}
			{cellData && cellData.output_data !== null && (
				<CellDataSection
					data={cellData.output_data}
					typeScript={cellData.output.type}
					outpoint={{ txHash, index }}
				/>
			)}
		</div>
	);
}

