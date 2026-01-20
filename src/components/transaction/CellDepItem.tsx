import { OutPoint } from '../OutPoint';
import { ScriptIndicatorPill } from '../ScriptIndicatorPill';
import { lookupWellKnownCell } from '../../lib/wellKnown';
import { extractTypeScriptIndicator, getWellKnownCellResourceId } from '../../lib/scriptIndicators';
import { DEP_TYPE } from '../../lib/badgeStyles';
import type { RpcCellWithLifecycle } from '../../types/rpc';
import type { NetworkType } from '../../config/networks';

interface CellDepItemProps {
	/** The cell dependency data. */
	dep: {
		out_point: { tx_hash: string; index: string };
		dep_type: string;
	};
	/** The fetched cell data (undefined if not yet loaded). */
	cellData: RpcCellWithLifecycle | undefined;
	/** Whether cell data is currently being loaded. */
	isLoading: boolean;
	/** The current network type for script lookups. */
	networkType: NetworkType;
}

/**
 * Renders a single cell dependency with outpoint, dep type, and script indicator.
 */
export function CellDepItem({
	dep,
	cellData,
	isLoading,
	networkType,
}: CellDepItemProps) {
	const depIndex = parseInt(dep.out_point.index, 16);

	// First check if this is a well-known cell by outpoint.
	const wellKnownCell = lookupWellKnownCell(dep.out_point.tx_hash, depIndex, networkType);

	// If not a well-known cell, check the type script.
	const typeIndicator = !wellKnownCell && cellData?.output?.type
		? extractTypeScriptIndicator(cellData.output.type, networkType)
		: null;

	// Check if we have any indicator to show.
	const hasIndicator = wellKnownCell || typeIndicator;

	return (
		<div className="p-4">
			{/* Line 1: Outpoint and dep type. */}
			<div className="flex items-center gap-3">
				<OutPoint
					txHash={dep.out_point.tx_hash}
					index={depIndex}
				/>
				<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${DEP_TYPE} rounded`}>
					{dep.dep_type}
				</span>
				{isLoading && !cellData && !wellKnownCell && (
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
						<ScriptIndicatorPill
							name={typeIndicator.name}
							resourceId={typeIndicator.resourceId}
							description={typeIndicator.description}
							isOther={!typeIndicator.isKnown}
							scriptType="type"
							codeHash={typeIndicator.fullHash}
						/>
					)}
				</div>
			)}
		</div>
	);
}
