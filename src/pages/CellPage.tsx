import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { encodeAddress } from '../lib/address';
import { formatCkb, calculateCellSize, formatBytes } from '../lib/format';
import { generateLink } from '../lib/router';
import { fromHex } from '../lib/rpc';
import { fetchCellData } from '../lib/cellFetcher';
import { lookupWellKnownCell } from '../lib/wellKnown';
import { ScriptLink } from '../components/ScriptLink';
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
import { InternalLink } from '../components/InternalLink';
import { ArchiveHeightWarning } from '../components/ArchiveHeightWarning';
import { FieldValue, buildFieldState } from '../components/FieldValue';
import type { RpcCellWithLifecycle } from '../types/rpc';

interface CellPageProps {
	txHash: string;
	index: number;
}

export function CellPage({ txHash, index }: CellPageProps) {
	const rpc = useRpc();
	const { currentNetwork, isArchiveSupported } = useNetwork();
	const [cellData, setCellData] = useState<RpcCellWithLifecycle | null>(null);
	const [hasLifecycleData, setHasLifecycleData] = useState(true);
	const [cellStatus, setCellStatus] = useState<'live' | 'dead' | 'unknown'>('unknown');
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
			const result = await fetchCellData(rpc, txHash, index, isArchiveSupported, true);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (result === null) {
				throw new Error(`${txHash}:${index}`);
			}

			setCellData(result.cell);
			setHasLifecycleData(result.hasLifecycleData);
			setCellStatus(result.status);
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
	}, [rpc, txHash, index, isArchiveSupported]);

	useEffect(() => {
		fetchCell();
	}, [fetchCell]);

	const createdBlock = cellData && hasLifecycleData ? Number(fromHex(cellData.created_block_number)) : null;
	const consumedBlock = cellData?.consumed_block_number && hasLifecycleData
		? Number(fromHex(cellData.consumed_block_number))
		: null;

	const cellSize = useMemo(
		() => cellData ? calculateCellSize(cellData) : null,
		[cellData]
	);

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
					title="Cell Not Found"
					description="This cell does not exist on the connected network. Verify the transaction hash and output index are correct."
					onRetry={fetchCell}
				/>
			</div>
		);
	}

	const lifecycleReason = 'Lifecycle data requires an archive node.';
	const createdBlockState = buildFieldState({
		supported: hasLifecycleData,
		supportedReason: lifecycleReason,
		value: createdBlock,
		isEmpty: () => createdBlock === null,
	});
	const consumedBlockState = buildFieldState({
		supported: hasLifecycleData,
		supportedReason: lifecycleReason,
		value: consumedBlock,
		isEmpty: () => consumedBlock === null,
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
					<span aria-current="page">Cell</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Cell Details
				</h1>
			</div>

			<ArchiveHeightWarning />

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
						<FieldValue
							state={cellStatus === 'unknown'
								? { kind: 'loading' }
								: { kind: 'value', value: cellStatus }
							}
							format={(s) => <CellStatusIndicator status={s} />}
							width="narrow"
						/>
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
							<ScriptLink
								script={cellData.output.lock}
								scriptType="lock"
								networkType={networkType}
							/>
						</DetailRow>
					)}
					{cellData && (
						<DetailRow label="Type Script">
							{cellData.output.type ? (
								<ScriptLink
									script={cellData.output.type}
									scriptType="type"
									networkType={networkType}
								/>
							) : (
								<span className="text-gray-500 dark:text-gray-400">None</span>
							)}
						</DetailRow>
					)}
					{cellSize !== null && (
						<DetailRow label="Cell Size">
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{formatBytes(cellSize)}
							</span>
						</DetailRow>
					)}
					<DetailRow label="Created at Block">
						<FieldValue
							state={createdBlockState}
							format={(block) => (
								<BlockNumberDisplay blockNumber={block} linkTo={generateLink(`/block/${block}`)} />
							)}
							formatEmpty={() => 'Unknown'}
							width="medium"
						/>
					</DetailRow>
					<DetailRow label="Consumed at Block">
						<FieldValue
							state={consumedBlockState}
							format={(block) => (
								<BlockNumberDisplay blockNumber={block} linkTo={generateLink(`/block/${block}`)} />
							)}
							formatEmpty={() => 'Not consumed'}
							width="medium"
						/>
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

