import { OutPoint } from '../OutPoint';
import { AddressDisplay } from '../AddressDisplay';
import { ScriptIndicatorPill } from '../ScriptIndicatorPill';
import { Tooltip } from '../Tooltip';
import { generateLink } from '../../lib/router';
import { formatCkb, formatCkbShort } from '../../lib/format';
import { encodeAddress } from '../../lib/address';
import { extractLockScriptIndicator, extractTypeScriptIndicator } from '../../lib/scriptIndicators';
import type { RpcCellOutput } from '../../types/rpc';
import type { NetworkType } from '../../config/networks';

interface TransactionOutputProps {
	/** The output data from the transaction. */
	output: RpcCellOutput;
	/** The index of this output in the transaction. */
	index: number;
	/** The transaction hash (for constructing the OutPoint link). */
	txHash: string;
	/** The current network type for address encoding and script lookups. */
	networkType: NetworkType;
}

/**
 * Renders a single transaction output with address, capacity, and script indicators.
 */
export function TransactionOutput({
	output,
	index,
	txHash,
	networkType,
}: TransactionOutputProps) {
	const address = encodeAddress(output.lock, networkType);
	const lockIndicator = extractLockScriptIndicator(output.lock, networkType);
	const typeIndicator = output.type
		? extractTypeScriptIndicator(output.type, networkType)
		: null;

	return (
		<div className="p-4">
			<div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
				#{index}
			</div>

			<div className="flex items-center justify-between mb-2">
				<OutPoint txHash={txHash} index={index} />
				<span className="font-mono text-sm font-medium text-gray-900 dark:text-white ml-2">
					<Tooltip content={formatCkb(output.capacity)}>
						<span className="lg:hidden">{formatCkbShort(output.capacity)} CKB</span>
					</Tooltip>
					<span className="hidden lg:inline">{formatCkb(output.capacity)}</span>
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
			</div>
		</div>
	);
}
