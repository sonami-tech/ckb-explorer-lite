import { OutPoint } from '../OutPoint';
import { AddressDisplay } from '../AddressDisplay';
import { ScriptIndicatorPill } from '../ScriptIndicatorPill';
import { Tooltip } from '../Tooltip';
import { generateLink } from '../../lib/router';
import { formatCkb, formatCkbShort, formatSince } from '../../lib/format';
import { encodeAddress } from '../../lib/address';
import { extractLockScriptIndicator, extractTypeScriptIndicator } from '../../lib/scriptIndicators';
import { BRAND } from '../../lib/badgeStyles';
import type { RpcCellInput, RpcCellWithLifecycle } from '../../types/rpc';
import type { NetworkType } from '../../config/networks';

interface TransactionInputProps {
	/** The input data from the transaction. */
	input: RpcCellInput;
	/** The index of this input in the transaction. */
	index: number;
	/** The fetched cell data for this input (undefined if not yet loaded). */
	cellData: RpcCellWithLifecycle | undefined;
	/** Any error that occurred while fetching cell data. */
	fetchError: Error | undefined;
	/** Whether cell data is currently being loaded. */
	isLoading: boolean;
	/** The current network type for address encoding and script lookups. */
	networkType: NetworkType;
	/** The mining reward amount for cellbase transactions (total output). */
	miningReward?: bigint;
}

/**
 * Check if an outpoint represents a cellbase (mining reward) input.
 */
function isNullOutpoint(txHash: string, index: string): boolean {
	return txHash === '0x0000000000000000000000000000000000000000000000000000000000000000' && index === '0xffffffff';
}

/**
 * Renders a single transaction input with all possible states:
 * - Cellbase (mining reward)
 * - Loading
 * - Error
 * - Loaded with full cell data
 */
export function TransactionInput({
	input,
	index,
	cellData,
	fetchError,
	isLoading,
	networkType,
	miningReward,
}: TransactionInputProps) {
	const isCellbase = isNullOutpoint(input.previous_output.tx_hash, input.previous_output.index);

	// Cellbase input.
	if (isCellbase) {
		return (
			<div className="p-4">
				<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
					#{index}
				</div>
				{miningReward !== undefined && (
					<div className="mb-2">
						<span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
							{formatCkb(miningReward)}
						</span>
					</div>
				)}
				<div className="flex items-center gap-2">
					<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${BRAND} rounded`}>
						Cellbase
					</span>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						(Mining Reward)
					</span>
				</div>
			</div>
		);
	}

	// Loading state.
	if (isLoading && !cellData && !fetchError) {
		return (
			<div className="p-4">
				<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
					#{index}
				</div>
				<div className="flex items-center justify-between mb-2">
					<OutPoint
						txHash={input.previous_output.tx_hash}
						index={parseInt(input.previous_output.index, 16)}
					/>
					<div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
				</div>
				<div className="mb-2">
					<div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
				</div>
				<div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
			</div>
		);
	}

	// Error state.
	if (fetchError) {
		return (
			<div className="p-4">
				<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
					#{index}
				</div>
				<div className="mb-2">
					<OutPoint
						txHash={input.previous_output.tx_hash}
						index={parseInt(input.previous_output.index, 16)}
					/>
				</div>
				<div className="text-sm text-red-600 dark:text-red-400">
					Failed to load cell data
				</div>
			</div>
		);
	}

	// Data loaded.
	if (cellData) {
		const address = encodeAddress(cellData.output.lock, networkType);
		const lockIndicator = extractLockScriptIndicator(cellData.output.lock, networkType);
		const typeIndicator = cellData.output.type
			? extractTypeScriptIndicator(cellData.output.type, networkType)
			: null;

		return (
			<div className="p-4">
				<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
					#{index}
				</div>

				<div className="flex items-center justify-between mb-2">
					<OutPoint
						txHash={input.previous_output.tx_hash}
						index={parseInt(input.previous_output.index, 16)}
					/>
					<span className="font-mono text-sm font-medium text-gray-900 dark:text-white ml-2">
						<Tooltip content={formatCkb(cellData.output.capacity)}>
							<span className="lg:hidden">{formatCkbShort(cellData.output.capacity)} CKB</span>
						</Tooltip>
						<span className="hidden lg:inline">{formatCkb(cellData.output.capacity)}</span>
					</span>
				</div>

				<div className="mb-2">
					<AddressDisplay
						address={address}
						linkTo={generateLink(`/address/${address}`)}
					/>
				</div>

				<div className="flex flex-wrap gap-2 items-center">
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

	// Fallback: show just outpoint (no cell data available).
	return (
		<div className="p-4">
			<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
				#{index}
			</div>
			<OutPoint
				txHash={input.previous_output.tx_hash}
				index={parseInt(input.previous_output.index, 16)}
			/>
		</div>
	);
}
