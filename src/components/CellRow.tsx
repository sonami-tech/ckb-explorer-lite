/**
 * Cell row component for Live Cells page.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 0x1234...abcd:0  [copy]                         3 hours ago │
 * │ Block 12,345,678 • 128 B                       1,234.56 CKB │
 * │ [RGB++] [UDT]                                               │
 * └─────────────────────────────────────────────────────────────┘
 */

import { generateLink, navigate } from '../lib/router';
import { formatAbsoluteTime, formatCkb, formatCkbShort, formatNumber, formatRelativeTime, formatRelativeTimeShort } from '../lib/format';
import { Tooltip } from './Tooltip';
import { getTypeScriptGroup, getLockScriptGroups, FILTERABLE_LOCK_SCRIPTS, isOtherLockScript, isOtherTypeScript } from '../lib/scriptGroups';
import { ScriptIndicatorPill } from './ScriptIndicatorPill';
import { HashDisplay } from './CopyButton';
import { useIsMobile } from '../hooks/ui';
import type { NetworkType } from '../config/networks';
import type { RpcCell } from '../types/rpc';

interface CellRowProps {
	cell: RpcCell;
	networkType: NetworkType;
	/** Block timestamp in milliseconds (optional). */
	timestamp?: number;
}

/**
 * Display a single cell as a clickable row.
 * Navigates to the cell detail page on click.
 */
export function CellRow({ cell, networkType, timestamp }: CellRowProps) {
	const isMobile = useIsMobile();
	const txHash = cell.out_point.tx_hash;
	const index = Number(cell.out_point.index);
	const blockNumber = BigInt(cell.block_number);
	const capacity = cell.output.capacity;

	// Calculate data size if present (non-empty).
	const hasData = cell.output_data !== '0x' && cell.output_data.length > 2;
	const dataSize = hasData ? (cell.output_data.length - 2) / 2 : 0;

	// Get type script group names and check for "Other".
	const typeGroups = cell.output.type
		? getTypeScriptGroup(cell.output.type.code_hash, networkType)
		: null;
	const hasOtherTypeScript = cell.output.type && isOtherTypeScript(cell.output.type.code_hash, networkType);

	// Get lock script group names (only show non-default locks) and check for "Other".
	const lockGroups = getLockScriptGroups(cell.output.lock.code_hash, networkType);
	// Filter to only show filterable lock scripts (exclude SECP256K1/blake160).
	const displayLockGroups = lockGroups?.filter(g =>
		FILTERABLE_LOCK_SCRIPTS.some(name => g.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(g.toLowerCase()))
	) ?? [];
	const hasOtherLockScript = isOtherLockScript(cell.output.lock.code_hash, networkType);

	// Cell link.
	const cellLink = generateLink(`/cell/${txHash}/${index}`);

	// Handle row click.
	const handleClick = () => {
		navigate(cellLink);
	};

	// Handle keyboard navigation.
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			navigate(cellLink);
		}
	};

	// Build OutPoint display string for HashDisplay.
	const outPointDisplay = `${txHash}:${index}`;

	// Combine all script badges.
	interface Badge {
		key: string;
		name: string;
		isOther?: boolean;
		scriptType?: 'lock' | 'type';
		codeHash?: string;
	}
	const allBadges: Badge[] = [
		...displayLockGroups.map(group => ({ key: `lock-${group}`, name: group })),
		...(typeGroups?.map(group => ({ key: `type-${group}`, name: group })) ?? []),
	];
	// Add "Other" badges for unknown scripts.
	if (hasOtherLockScript) {
		allBadges.push({
			key: 'other-lock',
			name: 'Other',
			isOther: true,
			scriptType: 'lock',
			codeHash: cell.output.lock.code_hash,
		});
	}
	if (hasOtherTypeScript && cell.output.type) {
		allBadges.push({
			key: 'other-type',
			name: 'Other',
			isOther: true,
			scriptType: 'type',
			codeHash: cell.output.type.code_hash,
		});
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
		>
			{/* Row 1: OutPoint with copy button on left, relative time on right */}
			<div className="flex items-center justify-between mb-1.5">
				<HashDisplay
					hash={outPointDisplay}
					linkTo={cellLink}
					responsive
					className="font-mono text-sm"
				/>
				{timestamp !== undefined && (
					<Tooltip content={formatAbsoluteTime(timestamp)}>
						<span className="text-xs text-gray-400 dark:text-gray-500">
							{isMobile ? formatRelativeTimeShort(timestamp) : formatRelativeTime(timestamp)}
						</span>
					</Tooltip>
				)}
			</div>

			{/* Row 2: Block number • data bytes on left, Capacity on right */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>Block {formatNumber(blockNumber)}</span>
					{hasData && (
						<>
							<span className="text-gray-300 dark:text-gray-600">•</span>
							<span>{formatNumber(dataSize)} B</span>
						</>
					)}
				</div>
				<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
					<Tooltip content={formatCkb(capacity)}>
						<span className="lg:hidden">{formatCkbShort(capacity)} CKB</span>
					</Tooltip>
					<span className="hidden lg:inline">{formatCkb(capacity, 2)}</span>
				</span>
			</div>

			{/* Row 3: Script indicator pills (if any) */}
			{allBadges.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
					{allBadges.map(badge => (
						<ScriptIndicatorPill
							key={badge.key}
							name={badge.name}
							isOther={badge.isOther}
							scriptType={badge.scriptType}
							codeHash={badge.codeHash}
							size="xs"
						/>
					))}
				</div>
			)}
		</div>
	);
}
