/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { HashDisplay } from './CopyButton';
import { generateLink } from '../lib/router';
import { formatCkb, formatNumber, formatRelativeTime, truncateHex } from '../lib/format';
import { lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { getScriptCategoryStyle } from '../lib/badgeStyles';
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
 * Extract known lock script indicators from transaction outputs.
 */
export function extractLockScripts(
	tx: RpcTransaction,
	networkType: NetworkType,
): ScriptIndicator[] {
	const seen = new Set<string>();
	const indicators: ScriptIndicator[] = [];

	for (const output of tx.outputs) {
		const info = lookupLockScript(
			output.lock.code_hash,
			output.lock.hash_type,
			networkType,
			output.lock.args,
		);
		const name = info?.name ?? truncateHex(output.lock.code_hash, 6, 4);
		if (!seen.has(name)) {
			seen.add(name);
			indicators.push({
				name,
				resourceId: info?.resourceId,
			});
		}
	}

	return indicators;
}

/**
 * Extract known type script indicators from transaction outputs.
 */
export function extractTypeScripts(
	tx: RpcTransaction,
	networkType: NetworkType,
): ScriptIndicator[] {
	const seen = new Set<string>();
	const indicators: ScriptIndicator[] = [];

	for (const output of tx.outputs) {
		if (output.type) {
			const info = lookupTypeScript(
				output.type.code_hash,
				output.type.hash_type,
				networkType,
				output.type.args,
			);
			const name = info?.name ?? truncateHex(output.type.code_hash, 6, 4);
			if (!seen.has(name)) {
				seen.add(name);
				indicators.push({
					name,
					resourceId: info?.resourceId,
				});
			}
		}
	}

	return indicators;
}


/**
 * Transaction row component with 3-line layout.
 * Line 1: Transaction hash (full on desktop, truncated on mobile)
 * Line 2: Block number · Time · Total capacity
 * Line 3: Script indicators (lock scripts, then type scripts)
 */
export function TransactionRow({ transaction, referenceTime }: TransactionRowProps) {
	const txLink = generateLink(`/tx/${transaction.txHash}`);
	const resourcesLink = generateLink('/resources');

	// Calculate relative time from reference (for archive mode) or now.
	const relativeTime = useMemo(() => {
		if (referenceTime) {
			// Calculate relative to reference time.
			const diff = referenceTime - transaction.timestamp;
			if (diff < 0) return 'just now';
			const seconds = Math.floor(diff / 1000);
			if (seconds < 60) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
			const days = Math.floor(hours / 24);
			if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
			const months = Math.floor(days / 30);
			if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
			const years = Math.floor(months / 12);
			return years === 1 ? '1 year ago' : `${years} years ago`;
		}
		return formatRelativeTime(transaction.timestamp);
	}, [transaction.timestamp, referenceTime]);

	return (
		<div className="py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
			{/* Line 1: Transaction hash */}
			<div className="mb-1">
				<HashDisplay
					hash={transaction.txHash}
					linkTo={txLink}
					responsive
					className="font-mono text-sm"
				/>
			</div>

			{/* Line 2: Block · Time · Total Capacity */}
			<div className="flex flex-wrap items-center justify-between text-sm">
				<div className="flex items-center gap-x-2 text-gray-600 dark:text-gray-400">
					<span>Block {formatNumber(transaction.blockNumber)}</span>
					<span className="text-gray-400 dark:text-gray-600">·</span>
					<span>{relativeTime}</span>
				</div>
				<span className="text-gray-600 dark:text-gray-400">
					{formatCkb(transaction.totalCapacity, 2)}
				</span>
			</div>

			{/* Line 3: Script indicators (only well-known) */}
			{(() => {
				// Filter to only well-known scripts (those with resourceId).
				const wellKnownIndicators = [
					...transaction.lockScripts.filter(s => s.resourceId).map(s => ({ ...s, isLock: true })),
					...transaction.typeScripts.filter(s => s.resourceId).map(s => ({ ...s, isLock: false })),
				];

				if (wellKnownIndicators.length === 0) return null;

				return (
					<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
						{wellKnownIndicators.map((indicator) => {
							const categoryStyle = getScriptCategoryStyle(indicator.name);
							const prefix = indicator.isLock ? 'Lock' : 'Type';
							const content = (
								<>
									<span className="hidden sm:inline">{prefix}: </span>
									{indicator.name}
								</>
							);

							return (
								<a
									key={`${indicator.isLock ? 'lock' : 'type'}-${indicator.name}`}
									href={`${resourcesLink}#${indicator.resourceId}`}
									className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle} hover:opacity-80 transition-opacity`}
								>
									{content}
								</a>
							);
						})}
					</div>
				);
			})()}
		</div>
	);
}
