import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { CELL_DATA_CONFIG } from '../config';
import { navigate, generateLink } from '../lib/router';
import { formatNumber } from '../lib/format';
import {
	decodeByFormat,
	formatTokenAmount,
	type DecodedData,
	type DepGroupData,
} from '../lib/decode';
import { lookupTypeScript, lookupCellFormat } from '../lib/knownScripts';
import { TruncatedData } from './TruncatedData';
import { OutPoint } from './OutPoint';
import { Tooltip } from './Tooltip';

type ViewMode = 'auto' | 'raw' | 'sudt' | 'xudt' | 'dao' | 'dep_group';

interface CellDataSectionProps {
	/** The hex data to display. */
	data: string;
	/** Type script for auto-detection. */
	typeScript?: { code_hash: string; hash_type: string; args: string } | null;
	/** Cell outpoint for format lookup (used when type script is null). */
	outpoint?: { txHash: string; index: number };
	/** Additional CSS classes for the container. */
	className?: string;
}

/**
 * Complete Cell Data section with header dropdown for decode options.
 * Renders the full card including header with "Decode Data" dropdown.
 */
export function CellDataSection({
	data,
	typeScript,
	outpoint,
	className = '',
}: CellDataSectionProps) {
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Detect available modes based on type script or outpoint registry.
	const detectedFormat = useMemo(() => {
		// First try type script lookup.
		if (typeScript) {
			const scriptInfo = lookupTypeScript(typeScript.code_hash, typeScript.hash_type, networkType, typeScript.args);
			if (scriptInfo?.dataFormat) {
				return scriptInfo.dataFormat;
			}
		}
		// Fall back to outpoint registry (for cells without type scripts).
		if (outpoint) {
			const format = lookupCellFormat(outpoint.txHash, outpoint.index, networkType);
			if (format) {
				return format;
			}
		}
		return null;
	}, [typeScript, outpoint, networkType]);

	// Available view modes - always show all options.
	const availableModes = useMemo(() => {
		const modes: ViewMode[] = [];
		if (detectedFormat && detectedFormat !== 'spore') {
			modes.push('auto');
		}
		modes.push('raw', 'sudt', 'xudt', 'dao', 'dep_group');
		return modes;
	}, [detectedFormat]);

	// Default to 'auto' only if auto-decode is enabled and format is detected.
	const defaultMode = (CELL_DATA_CONFIG.autoDecodeKnownTypes && detectedFormat) ? 'auto' : 'raw';
	const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

	// Close dropdown when clicking outside.
	useEffect(() => {
		if (!isDropdownOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isDropdownOpen]);

	const handleModeSelect = useCallback((mode: ViewMode) => {
		setViewMode(mode);
		setIsDropdownOpen(false);
	}, []);

	// Decode data based on current mode.
	const decoded: DecodedData = useMemo(() => {
		if (data === '0x') {
			return { type: 'raw', hex: data };
		}

		if (viewMode === 'auto') {
			// Use detected format (from type script or outpoint registry).
			if (detectedFormat) {
				return decodeByFormat(data, detectedFormat);
			}
			return { type: 'raw', hex: data };
		}

		if (viewMode === 'raw') {
			return { type: 'raw', hex: data };
		}

		return decodeByFormat(data, viewMode);
	}, [data, viewMode, detectedFormat]);

	const byteCount = (data.length - 2) / 2;
	const showDropdown = data !== '0x' && availableModes.length > 1;

	return (
		<div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
			{/* Header with byte count and decode dropdown. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold text-gray-900 dark:text-white">Cell Data</h2>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						({byteCount} bytes)
					</span>
				</div>

				{/* Decode dropdown. */}
				{showDropdown && (
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
						>
							<span className="text-gray-500 dark:text-gray-500">Decode:</span>
							<span className="font-medium">{formatModeName(viewMode, detectedFormat)}</span>
							<svg
								className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>

						{/* Dropdown menu. */}
						{isDropdownOpen && (
							<div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
								{availableModes.map((mode) => (
									<button
										key={mode}
										onClick={() => handleModeSelect(mode)}
										className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
											viewMode === mode
												? 'bg-nervos/10 text-nervos font-medium'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}`}
									>
										{formatModeName(mode, detectedFormat)}
										{viewMode === mode && (
											<svg className="inline w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										)}
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Content. */}
			<div className="p-4">
				{data === '0x' ? (
					<span className="text-sm text-gray-500 dark:text-gray-400 italic">
						This cell contains no data.
					</span>
				) : (
					<div className={`bg-gray-50 dark:bg-gray-900 p-4 rounded ${decoded.type === 'raw' ? 'overflow-x-auto' : 'overflow-visible'}`}>
						<DecodedContent decoded={decoded} />
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Render decoded content based on type.
 */
function DecodedContent({ decoded }: { decoded: DecodedData }) {
	switch (decoded.type) {
		case 'sudt':
			return <TokenAmountDisplay amount={decoded.amount} />;

		case 'xudt':
			return (
				<div className="space-y-3">
					<TokenAmountDisplay amount={decoded.amount} />
					{decoded.extensionData !== '0x' && (
						<div>
							<span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
								Extension data:
							</span>
							<TruncatedData data={decoded.extensionData} />
						</div>
					)}
				</div>
			);

		case 'dao':
			return (
				<div className="flex items-center gap-3">
					<span
						className={`px-2 py-1 rounded text-xs font-medium ${
							decoded.phase === 'deposit'
								? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
								: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
						}`}
					>
						{decoded.phase === 'deposit' ? 'Deposit' : 'Withdraw'}
					</span>
					{decoded.phase === 'withdraw' && decoded.withdrawBlockNumber !== undefined && (
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Started at block{' '}
							<button
								onClick={() => navigate(generateLink(`/block/${decoded.withdrawBlockNumber}`))}
								className="font-mono text-nervos hover:text-nervos-dark"
							>
								{formatNumber(decoded.withdrawBlockNumber)}
							</button>
						</span>
					)}
				</div>
			);

		case 'dep_group':
			return <DepGroupDisplay outpoints={decoded.outpoints} />;

		case 'raw':
		default:
			return <TruncatedData data={decoded.hex} />;
	}
}

/**
 * Format view mode name for display.
 */
function formatModeName(mode: ViewMode, detectedFormat: string | null): string {
	switch (mode) {
		case 'auto':
			return detectedFormat ? `Auto (${detectedFormat.toUpperCase()})` : 'Auto';
		case 'raw':
			return 'Raw Hex';
		case 'sudt':
			return 'SUDT';
		case 'xudt':
			return 'xUDT';
		case 'dao':
			return 'DAO';
		case 'dep_group':
			return 'Dep Group';
		default:
			return mode;
	}
}

/**
 * Render dependency group outpoints as a list of clickable links.
 */
function DepGroupDisplay({ outpoints }: { outpoints: DepGroupData['outpoints'] }) {
	if (outpoints.length === 0) {
		return (
			<span className="text-sm text-gray-500 dark:text-gray-400 italic">
				Empty dependency group
			</span>
		);
	}

	return (
		<div className="space-y-2">
			<span className="text-sm text-gray-500 dark:text-gray-400">
				{outpoints.length} cell{outpoints.length > 1 ? 's' : ''} in group:
			</span>
			<div className="space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
				{outpoints.map((op, i) => (
					<div key={i} className="flex items-center gap-2">
						<span className="text-xs text-gray-400 dark:text-gray-500 w-5">
							{i + 1}.
						</span>
						<OutPoint txHash={op.txHash} index={op.index} />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Token amount display with decimal stepper.
 * Defaults to 0 decimals. User can adjust decimal places (0-16).
 */
function TokenAmountDisplay({ amount }: { amount: bigint }) {
	const [decimals, setDecimals] = useState(0);
	const minDecimals = 0;
	const maxDecimals = 16;

	const decrement = () => setDecimals((d) => Math.max(minDecimals, d - 1));
	const increment = () => setDecimals((d) => Math.min(maxDecimals, d + 1));

	const displayAmount = formatTokenAmount(amount, decimals);

	return (
		<div className="flex items-center gap-3 flex-wrap">
			<div className="flex items-center gap-2">
				<span className="text-sm text-gray-500 dark:text-gray-400">Amount:</span>
				<span className="font-mono text-lg font-semibold">
					{displayAmount}
				</span>
			</div>

			{/* Decimal stepper. */}
			<div className="flex items-center select-none">
				<Tooltip content="Decrease decimals" interactive>
					<button
						onClick={decrement}
						disabled={decimals <= minDecimals}
						className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-l border border-gray-300 dark:border-gray-600 transition-colors"
					>
						−
					</button>
				</Tooltip>
				<span className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-gray-800 border-y border-gray-300 dark:border-gray-600 min-w-[5rem] text-center">
					{decimals} decimals
				</span>
				<Tooltip content="Increase decimals" interactive>
					<button
						onClick={increment}
						disabled={decimals >= maxDecimals}
						className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-r border border-gray-300 dark:border-gray-600 transition-colors"
					>
						+
					</button>
				</Tooltip>
			</div>
		</div>
	);
}

// Legacy export for backwards compatibility.
export { CellDataSection as CellDataDisplay };
