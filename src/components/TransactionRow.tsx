/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { HashDisplay } from './CopyButton';
import { generateLink } from '../lib/router';
import { formatCkb, formatNumber, formatRelativeTime } from '../lib/format';
import { lookupTypeScript } from '../lib/wellKnown';
import type { NetworkType } from '../config/networks';
import type { RpcTransaction, RpcScript, RpcGroupedTransactionInfo } from '../types/rpc';

/**
 * Transaction direction based on cells array from grouped transaction info.
 */
export type TransactionDirection = 'received' | 'sent' | 'transfer';

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
	/** Direction relative to the queried address. */
	direction: TransactionDirection;
	/** Amount received (only for 'received' direction). */
	receivedAmount?: bigint;
	/** Known type script names from transaction outputs. */
	typeScripts: string[];
}

interface TransactionRowProps {
	transaction: EnrichedTransaction;
	/** Reference timestamp for relative time (e.g., archive block timestamp). */
	referenceTime?: number;
}

/**
 * Determine transaction direction from cells array.
 */
export function getDirection(cells: RpcGroupedTransactionInfo['cells']): TransactionDirection {
	const hasInput = cells.some(([type]) => type === 'input');
	const hasOutput = cells.some(([type]) => type === 'output');

	if (hasOutput && !hasInput) return 'received';
	if (hasInput && !hasOutput) return 'sent';
	return 'transfer';
}

/**
 * Calculate received amount for a transaction.
 * Sums capacities of outputs that match the queried lock script.
 */
export function calculateReceivedAmount(
	tx: RpcTransaction,
	lockScript: RpcScript,
): bigint {
	let total = 0n;
	for (const output of tx.outputs) {
		if (
			output.lock.code_hash === lockScript.code_hash &&
			output.lock.hash_type === lockScript.hash_type &&
			output.lock.args === lockScript.args
		) {
			total += BigInt(output.capacity);
		}
	}
	return total;
}

/**
 * Extract known type script names from transaction outputs.
 */
export function extractTypeScripts(
	tx: RpcTransaction,
	networkType: NetworkType,
): string[] {
	const seen = new Set<string>();
	const names: string[] = [];

	for (const output of tx.outputs) {
		if (output.type) {
			const info = lookupTypeScript(
				output.type.code_hash,
				output.type.hash_type,
				networkType,
				output.type.args,
			);
			if (info && !seen.has(info.name)) {
				seen.add(info.name);
				names.push(info.name);
			}
		}
	}

	return names;
}

/**
 * Get color class for direction badge.
 */
function getDirectionColor(direction: TransactionDirection): string {
	switch (direction) {
		case 'received':
			return 'text-green-600 dark:text-green-400';
		case 'sent':
			return 'text-red-600 dark:text-red-400';
		case 'transfer':
			return 'text-gray-600 dark:text-gray-400';
	}
}

/**
 * Get label for direction.
 */
function getDirectionLabel(direction: TransactionDirection): string {
	switch (direction) {
		case 'received':
			return 'Received';
		case 'sent':
			return 'Sent';
		case 'transfer':
			return 'Transfer';
	}
}

/**
 * Get color class for type script indicator.
 * Uses semantic colors from badgeStyles.ts conventions.
 */
function getTypeScriptColor(name: string): string {
	// Tokens - blue
	if (['SUDT', 'xUDT', 'iCKB'].includes(name)) {
		return 'text-blue-600 dark:text-blue-400';
	}
	// DAO - green
	if (name === 'NervosDAO') {
		return 'text-green-600 dark:text-green-400';
	}
	// NFTs - purple
	if (['Spore', 'Spore Cluster', 'CoTA'].includes(name)) {
		return 'text-purple-600 dark:text-purple-400';
	}
	// Other - teal
	return 'text-teal-600 dark:text-teal-400';
}

/**
 * Transaction row component with 3-line layout.
 * Line 1: Transaction hash (full on desktop, truncated on mobile)
 * Line 2: Block number · Time · Direction/Amount
 * Line 3: Type script indicators
 */
export function TransactionRow({ transaction, referenceTime }: TransactionRowProps) {
	const txLink = generateLink(`/tx/${transaction.txHash}`);

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

	const directionColor = getDirectionColor(transaction.direction);
	const directionLabel = getDirectionLabel(transaction.direction);

	// Format amount for received transactions.
	const amountDisplay = transaction.direction === 'received' && transaction.receivedAmount !== undefined
		? `+${formatCkb(transaction.receivedAmount, 2)}`
		: null;

	// Limit type scripts to 3, show "+N more" if more.
	const visibleTypes = transaction.typeScripts.slice(0, 3);
	const moreCount = transaction.typeScripts.length - 3;

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

			{/* Line 2: Block · Time · Direction/Amount */}
			<div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-600 dark:text-gray-400">
				<span>Block {formatNumber(transaction.blockNumber)}</span>
				<span className="text-gray-400 dark:text-gray-600">·</span>
				<span>{relativeTime}</span>
				<span className="text-gray-400 dark:text-gray-600">·</span>
				<span className={directionColor}>
					{directionLabel}
					{amountDisplay && ` ${amountDisplay}`}
				</span>
			</div>

			{/* Line 3: Type script indicators (only if any) */}
			{visibleTypes.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-2 mt-1 text-sm">
					{visibleTypes.map((name, i) => (
						<span key={name}>
							{i > 0 && <span className="text-gray-400 dark:text-gray-600 mr-2">·</span>}
							<span className={getTypeScriptColor(name)}>{name}</span>
						</span>
					))}
					{moreCount > 0 && (
						<span className="text-gray-500 dark:text-gray-500">
							<span className="text-gray-400 dark:text-gray-600 mr-2">·</span>
							+{moreCount} more
						</span>
					)}
				</div>
			)}
		</div>
	);
}
