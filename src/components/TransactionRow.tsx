/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { HashDisplay } from './CopyButton';
import { ScriptIndicatorPill } from './ScriptIndicatorPill';
import { Tooltip } from './Tooltip';
import { generateLink } from '../lib/router';
import { formatAbsoluteTime, formatCkb, formatCkbShort, formatNumber, formatRelativeTime, formatRelativeTimeShort } from '../lib/format';
import { lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { BRAND } from '../lib/badgeStyles';
import { useIsMobile } from '../hooks/ui';
import type { NetworkType } from '../config/networks';
import type { RpcTransaction } from '../types/rpc';

/**
 * Script indicator for display with optional link.
 */
export interface ScriptIndicator {
	/** Display name of the script. */
	name: string;
	/** Resource ID for linking to /resources#id (undefined if not a known script). */
	resourceId?: string;
	/** Whether this is an unknown/other script. */
	isOther?: boolean;
	/** Full code hash for unknown scripts (used in tooltip). */
	codeHash?: string;
}

/**
 * Enriched transaction data for display.
 */
export interface EnrichedTransaction {
	/** Transaction hash. */
	txHash: string;
	/** Block number. */
	blockNumber: bigint;
	/** Block timestamp in milliseconds. */
	timestamp: number;
	/** Total capacity of all outputs in shannons. */
	totalCapacity: bigint;
	/** Known lock script indicators from transaction outputs. */
	lockScripts: ScriptIndicator[];
	/** Known type script indicators from transaction outputs. */
	typeScripts: ScriptIndicator[];
	/** Number of inputs in the transaction. */
	inputCount: number;
	/** Number of outputs in the transaction. */
	outputCount: number;
	/** Whether this is a cellbase (mining reward) transaction. */
	isCellbase: boolean;
	/** Original index in the block for sorting back to block order (BlockPage only). */
	originalIndex?: number;
}

interface TransactionRowProps {
	transaction: EnrichedTransaction;
	/** Reference timestamp for relative time (e.g., archive block timestamp). */
	referenceTime?: number;
}

/**
 * Calculate total capacity of all outputs in a transaction.
 */
export function calculateTotalOutputCapacity(tx: RpcTransaction): bigint {
	return tx.outputs.reduce((sum, output) => sum + BigInt(output.capacity), 0n);
}

/**
 * Extract lock script indicators from transaction outputs.
 * Includes both well-known scripts and "Other" (unknown) scripts.
 */
export function extractLockScripts(
	tx: RpcTransaction,
	networkType: NetworkType,
): ScriptIndicator[] {
	const seen = new Set<string>();
	const indicators: ScriptIndicator[] = [];
	let hasOther = false;
	let otherCodeHash: string | undefined;

	for (const output of tx.outputs) {
		const info = lookupLockScript(
			output.lock.code_hash,
			output.lock.hash_type,
			networkType,
			output.lock.args,
		);
		if (info) {
			if (!seen.has(info.name)) {
				seen.add(info.name);
				indicators.push({
					name: info.name,
					resourceId: info.resourceId,
				});
			}
		} else {
			// Unknown lock script - track for "Other" indicator.
			if (!hasOther) {
				hasOther = true;
				otherCodeHash = output.lock.code_hash;
			}
		}
	}

	// Add single "Other" indicator if any unknown lock scripts found.
	if (hasOther) {
		indicators.push({
			name: 'Other',
			isOther: true,
			codeHash: otherCodeHash,
		});
	}

	return indicators;
}

/**
 * Extract type script indicators from transaction outputs.
 * Includes both well-known scripts and "Other" (unknown) scripts.
 */
export function extractTypeScripts(
	tx: RpcTransaction,
	networkType: NetworkType,
): ScriptIndicator[] {
	const seen = new Set<string>();
	const indicators: ScriptIndicator[] = [];
	let hasOther = false;
	let otherCodeHash: string | undefined;

	for (const output of tx.outputs) {
		if (output.type) {
			const info = lookupTypeScript(
				output.type.code_hash,
				output.type.hash_type,
				networkType,
				output.type.args,
			);
			if (info) {
				if (!seen.has(info.name)) {
					seen.add(info.name);
					indicators.push({
						name: info.name,
						resourceId: info.resourceId,
					});
				}
			} else {
				// Unknown type script - track for "Other" indicator.
				if (!hasOther) {
					hasOther = true;
					otherCodeHash = output.type.code_hash;
				}
			}
		}
	}

	// Add single "Other" indicator if any unknown type scripts found.
	if (hasOther) {
		indicators.push({
			name: 'Other',
			isOther: true,
			codeHash: otherCodeHash,
		});
	}

	return indicators;
}

/**
 * Check if a transaction is a cellbase (mining reward) transaction.
 * Cellbase inputs have tx_hash of all zeros and index 0xffffffff.
 */
export function isCellbaseTransaction(tx: RpcTransaction): boolean {
	if (tx.inputs.length === 0) return true;
	const firstInput = tx.inputs[0];
	return (
		firstInput.previous_output.tx_hash === '0x0000000000000000000000000000000000000000000000000000000000000000' &&
		firstInput.previous_output.index === '0xffffffff'
	);
}

/**
 * Transaction row component with 3-line layout.
 * Line 1: Hash + Cellbase badge (if applicable) on left, Relative time on right
 * Line 2: Block number + input/output counts on left, Total capacity on right
 * Line 3: Script indicators (lock scripts, then type scripts)
 */
export function TransactionRow({ transaction, referenceTime }: TransactionRowProps) {
	const isMobile = useIsMobile();
	const txLink = generateLink(`/tx/${transaction.txHash}`);

	// Calculate relative time from reference (for archive mode) or now.
	const relativeTime = useMemo(() => {
		if (referenceTime) {
			// Calculate relative to reference time.
			const diff = referenceTime - transaction.timestamp;
			if (diff < 0) return isMobile ? 'now' : 'just now';
			const seconds = Math.floor(diff / 1000);
			if (seconds < 60) return isMobile ? `${seconds}s` : (seconds === 1 ? '1 second ago' : `${seconds} seconds ago`);
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return isMobile ? `${minutes}m` : (minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`);
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return isMobile ? `${hours}h` : (hours === 1 ? '1 hour ago' : `${hours} hours ago`);
			const days = Math.floor(hours / 24);
			if (days < 30) return isMobile ? `${days}d` : (days === 1 ? '1 day ago' : `${days} days ago`);
			const months = Math.floor(days / 30);
			if (months < 12) return isMobile ? `${months}mo` : (months === 1 ? '1 month ago' : `${months} months ago`);
			const years = Math.floor(months / 12);
			return isMobile ? `${years}y` : (years === 1 ? '1 year ago' : `${years} years ago`);
		}
		return isMobile ? formatRelativeTimeShort(transaction.timestamp) : formatRelativeTime(transaction.timestamp);
	}, [transaction.timestamp, referenceTime, isMobile]);

	// Input/output labels.
	const inputLabel = isMobile
		? `${transaction.inputCount} in`
		: transaction.inputCount === 1 ? '1 input' : `${transaction.inputCount} inputs`;
	const outputLabel = isMobile
		? `${transaction.outputCount} out`
		: transaction.outputCount === 1 ? '1 output' : `${transaction.outputCount} outputs`;

	return (
		<div className="w-full min-h-[72px] p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">

			{/* Line 1: Hash + Cellbase badge on left, Time on right */}
			<div className="flex items-center justify-between mb-1.5">
				<div className="flex items-center gap-2">
					<HashDisplay
						hash={transaction.txHash}
						linkTo={txLink}
						responsive
						className="font-mono text-sm"
					/>
					{transaction.isCellbase && (
						isMobile ? (
							<span>⛏️</span>
						) : (
							<span className={`${BRAND} px-1.5 py-0.5 text-[10px] font-semibold rounded`}>
								Cellbase
							</span>
						)
					)}
				</div>
				<Tooltip content={formatAbsoluteTime(transaction.timestamp)}>
					<span className="text-xs text-gray-400 dark:text-gray-500">
						{relativeTime}
					</span>
				</Tooltip>
			</div>

			{/* Line 2: Block + input/output on left, Total capacity on right */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>Block {formatNumber(transaction.blockNumber)}</span>
					{/* Hide input/output count for Cellbase - it's always 1/1 and semantically misleading. */}
					{!transaction.isCellbase && (
						<>
							<span className="text-gray-300 dark:text-gray-600">•</span>
							<span>{inputLabel} / {outputLabel}</span>
						</>
					)}
				</div>
				<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
					<Tooltip content={formatCkb(transaction.totalCapacity)}>
						<span className="lg:hidden">{formatCkbShort(transaction.totalCapacity)} CKB</span>
					</Tooltip>
					<span className="hidden lg:inline">{formatCkb(transaction.totalCapacity, 2)}</span>
				</span>
			</div>

			{/* Line 3: Script indicators (well-known + Other) */}
			{(() => {
				// Combine lock and type script indicators with scriptType annotation.
				const allIndicators = [
					...transaction.lockScripts.map(s => ({ ...s, scriptType: 'lock' as const })),
					...transaction.typeScripts.map(s => ({ ...s, scriptType: 'type' as const })),
				];

				if (allIndicators.length === 0) return null;

				return (
					<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
						{allIndicators.map((indicator) => (
							<ScriptIndicatorPill
								key={indicator.isOther ? `other-${indicator.scriptType}` : indicator.name}
								name={indicator.name}
								resourceId={indicator.resourceId}
								isOther={indicator.isOther}
								scriptType={indicator.scriptType}
								codeHash={indicator.codeHash}
								size="xs"
							/>
						))}
					</div>
				);
			})()}
		</div>
	);
}
