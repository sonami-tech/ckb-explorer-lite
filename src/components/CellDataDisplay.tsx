import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { CELL_DATA_CONFIG } from '../config';
import { navigate, generateLink } from '../lib/router';
import { formatNumber, formatBytes } from '../lib/format';
import {
	decodeByFormat,
	formatTokenAmount,
	type DecodedData,
	type DepGroupData,
	type DecodeFormat,
	type TextData,
} from '../lib/decode';
import { lookupTypeScript, lookupCellFormat } from '../lib/wellKnown';
import { useUrlParam } from '../hooks/useUrlParam';
import { useTruncation } from '../hooks/ui';
import { CopyButton, DownloadButton, ModalButton, ChevronButton, SizeBadge } from './CopyButton';
import { DataModal } from './DataModal';
import { OutPoint } from './OutPoint';
import { DAO_DEPOSIT, DAO_WITHDRAW } from '../lib/badgeStyles';

type ViewMode = 'auto' | 'raw' | 'udt' | 'dao' | 'dep_group' | 'uint32' | 'uint64' | 'int64' | 'uint128' | 'ascii' | 'utf8';

/** Valid decode parameter values for URL. */
const VALID_DECODE_PARAMS: ViewMode[] = ['raw', 'udt', 'dao', 'dep_group', 'uint32', 'uint64', 'int64', 'uint128', 'ascii', 'utf8'];

/** Parse decode param from URL, returning null if invalid. */
function parseDecodeParam(value: string | null): ViewMode | null {
	if (value && VALID_DECODE_PARAMS.includes(value as ViewMode)) {
		return value as ViewMode;
	}
	return null;
}

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
	const [isModalOpen, setIsModalOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Read decode param from URL.
	const [decodeParam, setDecodeParam] = useUrlParam('decode');
	const urlMode = parseDecodeParam(decodeParam);

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
	// Order: auto (if detected), raw, protocol formats, integer formats, text formats.
	const availableModes = useMemo(() => {
		const modes: ViewMode[] = [];
		if (detectedFormat && detectedFormat !== 'spore') {
			modes.push('auto');
		}
		modes.push('raw', 'udt', 'dao', 'dep_group');
		// Integer formats.
		modes.push('uint32', 'uint64', 'int64', 'uint128');
		// Text formats come last.
		modes.push('ascii', 'utf8');
		return modes;
	}, [detectedFormat]);

	// Determine view mode: URL param > auto-detect > raw.
	// URL param takes precedence if valid.
	// Otherwise, default to 'auto' if format detected and auto-decode enabled, else 'raw'.
	const defaultMode = (CELL_DATA_CONFIG.autoDecodeKnownTypes && detectedFormat) ? 'auto' : 'raw';
	const effectiveMode: ViewMode = urlMode ?? defaultMode;

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
		// Update URL param. Use null for default mode to keep URL clean.
		setDecodeParam(mode === defaultMode ? null : mode);
		setIsDropdownOpen(false);
	}, [setDecodeParam, defaultMode]);

	// Decode data based on current mode.
	const decoded: DecodedData = useMemo(() => {
		if (data === '0x') {
			return { type: 'raw', hex: data };
		}

		if (effectiveMode === 'auto') {
			// Use detected format (from type script or outpoint registry).
			if (detectedFormat) {
				return decodeByFormat(data, detectedFormat);
			}
			return { type: 'raw', hex: data };
		}

		if (effectiveMode === 'raw') {
			return { type: 'raw', hex: data };
		}

		return decodeByFormat(data, effectiveMode as DecodeFormat);
	}, [data, effectiveMode, detectedFormat]);

	const byteCount = (data.length - 2) / 2;
	const showDropdown = data !== '0x' && availableModes.length > 1;

	return (
		<div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
			{/* Header with byte count, action buttons, and decode dropdown. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold text-gray-900 dark:text-white">Cell Data</h2>
					<span className="text-size-meta">
						({formatBytes(byteCount)})
					</span>
				</div>

				<div className="flex items-center gap-2">
					{/* Action buttons for full cell data. */}
					{data !== '0x' && (
						<div className="flex items-center gap-1">
							<CopyButton text={data} />
							<DownloadButton data={data} filename="cell-data" />
							<ModalButton onClick={() => setIsModalOpen(true)} />
						</div>
					)}

					{/* Decode dropdown. */}
					{showDropdown && (
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
						>
							<span className="text-gray-500 dark:text-gray-500">Decode:</span>
							<span className="font-medium">{formatModeName(effectiveMode, detectedFormat)}</span>
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
							<div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
								{availableModes.map((mode) => (
									<button
										key={mode}
										onClick={() => handleModeSelect(mode)}
										className={`w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
											effectiveMode === mode
												? 'bg-nervos/10 text-nervos font-medium'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}`}
									>
										{formatModeName(mode, detectedFormat)}
										{effectiveMode === mode && (
											<svg className="inline w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			</div>

			{/* Content. */}
			<div className="p-4">
				{data === '0x' ? (
					<span className="text-sm text-gray-500 dark:text-gray-400 italic">
						This cell contains no data.
					</span>
				) : (
					<div className={`bg-gray-50 dark:bg-gray-900 p-4 rounded ${decoded.type === 'raw' ? 'overflow-x-auto' : 'overflow-visible'}`}>
						<DecodedContent
							decoded={decoded}
							onOpenModal={() => setIsModalOpen(true)}
						/>
					</div>
				)}
			</div>

			{/* Modal for full data view. */}
			<DataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title="Cell Data"
				byteCount={byteCount}
				data={data}
			>
				<code className="font-mono text-sm break-all block whitespace-pre-wrap min-w-0 max-w-full" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
					{data}
				</code>
			</DataModal>
		</div>
	);
}

/**
 * Render decoded content based on type.
 */
function DecodedContent({
	decoded,
	onOpenModal,
}: {
	decoded: DecodedData;
	onOpenModal: () => void;
}) {
	switch (decoded.type) {
		case 'udt':
			return (
				<div className="space-y-3">
					<TokenAmountDisplay amount={decoded.amount} />
					{decoded.extraData !== '0x' && (
						<SubDataSection label="Extra data" data={decoded.extraData} />
					)}
				</div>
			);

		case 'dao':
			return (
				<div className="flex items-center gap-3">
					<span
						className={`px-2 py-1 rounded text-xs font-medium ${
							decoded.phase === 'deposit' ? DAO_DEPOSIT : DAO_WITHDRAW
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

		case 'integer':
			return <IntegerDisplay value={decoded.value} format={decoded.format} extraData={decoded.extraData} />;

		case 'text':
			return <TextDisplay text={decoded.text} encoding={decoded.encoding} hasBinaryChars={decoded.hasBinaryChars} onOpenModal={onOpenModal} />;

		case 'error':
			return <ErrorDisplay message={decoded.message} hex={decoded.hex} />;

		case 'raw':
		default:
			// Raw hex display with truncation; chevron opens modal.
			return (
				<RawHexDisplay
					data={decoded.hex}
					onOpenModal={onOpenModal}
				/>
			);
	}
}

/**
 * Raw hex display with truncation.
 * Shows truncated hex by default, with chevron to open modal for full view.
 */
function RawHexDisplay({
	data,
	onOpenModal,
}: {
	data: string;
	onOpenModal: () => void;
}) {
	const { displayData, isTruncated } = useTruncation(data);

	return (
		<div>
			<code className="font-mono text-sm break-all block">
				{displayData}
			</code>
			{isTruncated && (
				<div className="mt-2 flex justify-center">
					<ChevronButton isExpanded={false} onClick={onOpenModal} />
				</div>
			)}
		</div>
	);
}

/**
 * Format view mode name for display.
 */
function formatModeName(mode: ViewMode, detectedFormat: string | null): string {
	switch (mode) {
		case 'auto':
			// Use the same formatting as the explicit mode for consistency.
			return detectedFormat ? `Auto (${formatModeName(detectedFormat as ViewMode, null)})` : 'Auto';
		case 'raw':
			return 'Raw Hex';
		case 'udt':
		case 'sudt':
		case 'xudt':
			// All UDT formats display the same name.
			return 'UDT (Token Amount)';
		case 'dao':
			return 'DAO';
		case 'dep_group':
			return 'Dep Group';
		case 'uint32':
			return 'uint32 (4 bytes)';
		case 'uint64':
			return 'uint64 (8 bytes)';
		case 'int64':
			return 'int64 (signed)';
		case 'uint128':
			return 'uint128 (16 bytes)';
		case 'ascii':
			return 'ASCII Text';
		case 'utf8':
			return 'UTF-8 Text';
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
 * Token amount display with copy button.
 * Uses two-line format: label with size and copy button, then value below.
 */
function TokenAmountDisplay({ amount }: { amount: bigint }) {
	// Format with thousand separators for display.
	const displayAmount = formatTokenAmount(amount, 0);
	// Raw value for copying (no formatting).
	const rawValue = amount.toString();

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					Amount <SizeBadge bytes={16} parens={false} />:
				</span>
				<CopyButton text={rawValue} />
			</div>
			<span className="font-mono text-lg font-semibold block">
				{displayAmount}
			</span>
		</div>
	);
}

/**
 * Sub-data section with label row (label + size + buttons) and content row (hex).
 * Used for Extra data, Extension data, Raw data in errors.
 */
function SubDataSection({ label, data }: { label: string; data: string }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { displayData, byteCount } = useTruncation(data);

	return (
		<div className="space-y-1">
			{/* Label row with size and buttons. */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					{label} <SizeBadge bytes={byteCount} parens={false} />:
				</span>
				<div className="flex items-center gap-1">
					<CopyButton text={data} />
					<DownloadButton data={data} filename={label.toLowerCase().replace(/\s+/g, '-')} />
					<ModalButton onClick={() => setIsModalOpen(true)} />
				</div>
			</div>
			{/* Content row. */}
			<code className="font-mono text-sm break-all block">
				{displayData}
			</code>
			{/* Modal for full data view. */}
			<DataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={label}
				byteCount={byteCount}
				data={data}
			>
				<code className="font-mono text-sm break-all block whitespace-pre-wrap min-w-0 max-w-full" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
					{data}
				</code>
			</DataModal>
		</div>
	);
}

/**
 * Integer value display with extra data support.
 * Uses two-line format: label with size and copy button, then value below.
 */
function IntegerDisplay({
	value,
	format,
	extraData,
}: {
	value: bigint;
	format: 'uint32' | 'uint64' | 'int64' | 'uint128';
	extraData: string;
}) {
	// Format the value with thousand separators.
	const displayValue = value.toLocaleString();
	// Raw value for copying.
	const rawValue = value.toString();

	// Get byte size for format.
	const byteSize = format === 'uint32' ? 4 : format === 'uint128' ? 16 : 8;

	return (
		<div className="space-y-3">
			{/* Value section with label row and value below. */}
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-sm text-gray-500 dark:text-gray-400">
						Value <SizeBadge bytes={byteSize} parens={false} />:
					</span>
					<CopyButton text={rawValue} />
				</div>
				<span className="font-mono text-lg font-semibold block">
					{displayValue}
				</span>
			</div>
			{extraData !== '0x' && (
				<SubDataSection label="Extra data" data={extraData} />
			)}
		</div>
	);
}

/**
 * Error display for decode failures.
 */
function ErrorDisplay({ message, hex }: { message: string; hex: string }) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
				<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<span className="text-sm font-medium">{message}</span>
			</div>
			<SubDataSection label="Raw data" data={hex} />
		</div>
	);
}

/**
 * Text display for ASCII/UTF-8 decoded content.
 * Shows warning if binary characters were encountered.
 * Truncates long text with chevron to open modal for full view.
 * Uses dangerouslySetInnerHTML since text is already HTML-escaped by the decoder.
 */
function TextDisplay({
	text,
	encoding,
	hasBinaryChars,
	onOpenModal,
}: {
	text: TextData['text'];
	encoding: TextData['encoding'];
	hasBinaryChars: TextData['hasBinaryChars'];
	onOpenModal: () => void;
}) {
	// Truncate long text (threshold matches hex truncation ~2000 chars).
	const TEXT_TRUNCATE_LIMIT = 2000;
	const isTruncated = text.length > TEXT_TRUNCATE_LIMIT;
	const displayText = isTruncated ? text.slice(0, TEXT_TRUNCATE_LIMIT) + '…' : text;

	return (
		<div className="space-y-2">
			{hasBinaryChars && (
				<div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
					<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<span className="text-sm">
						Contains non-printable characters (shown as [XX] placeholders).
					</span>
				</div>
			)}
			<div className="space-y-1">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					{encoding === 'ascii' ? 'ASCII' : 'UTF-8'} text:
				</span>
				<pre
					className="font-mono text-sm whitespace-pre-wrap break-all"
					dangerouslySetInnerHTML={{ __html: displayText }}
				/>
			</div>
			{isTruncated && (
				<div className="mt-2 flex justify-center">
					<ChevronButton isExpanded={false} onClick={onOpenModal} />
				</div>
			)}
		</div>
	);
}

// Legacy export for backwards compatibility.
export { CellDataSection as CellDataDisplay };
