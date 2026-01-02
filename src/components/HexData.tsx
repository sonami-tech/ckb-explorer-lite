import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { useTruncation, type BreakpointTier } from '../hooks/ui';
import { HEX_DATA_CONFIG } from '../config';
import { formatBytes } from '../lib/format';
import { CopyButton, DownloadButton, ModalButton, ChevronButton, SizeBadge } from './CopyButton';
import { DataModal } from './DataModal';

/** View modes for data display. */
type ViewMode = 'concise' | 'expanded' | 'modal';

/** Decoded data result from a decoder. */
export interface DecodedResult {
	/** Format identifier. */
	format: string;
	/** Human-readable label for the format. */
	label: string;
	/** Rendered content for this decode. */
	content: ReactNode;
}

/** Decoder function signature. */
export type Decoder = (data: string) => DecodedResult | null;

/** Registry of available decoders for a data type. */
export interface DecoderRegistry {
	/** Auto-detect decoder (optional). */
	auto?: Decoder;
	/** Named decoders. */
	decoders: Record<string, Decoder>;
	/** Default format to use. */
	defaultFormat: string;
}

/** Props for HexData component. */
interface HexDataProps {
	/** The hex data to display. */
	data: string;

	/** Decoder registry for format options. If not provided, only raw hex is shown. */
	registry?: DecoderRegistry;

	/** Context for styling: 'inline' for compact, 'section' for full card. */
	context?: 'inline' | 'section';

	/** Optional label for the data. */
	label?: string;

	/** Show size badge. Default: true. */
	showSize?: boolean;

	/** Allow modal view for large data. Default: true. */
	allowModal?: boolean;

	/** URL param name for persisting decode choice. */
	urlParamName?: string;

	/** Custom character limits per breakpoint. */
	charLimits?: Partial<Record<BreakpointTier, number>>;

	/** Additional CSS classes. */
	className?: string;
}

/**
 * Universal hex data display component.
 *
 * Features:
 * - Responsive truncation (mobile/tablet/desktop)
 * - Expand/collapse with warning for large data
 * - Modal view for detailed analysis
 * - Pluggable decoder registry
 * - Copy and download buttons
 *
 * Replaces TruncatedData with a more capable component.
 */
export function HexData({
	data,
	registry,
	context = 'section',
	label,
	showSize = true,
	allowModal = true,
	charLimits,
	className = '',
}: HexDataProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('concise');
	const [format, setFormat] = useState<string>(registry?.defaultFormat ?? 'raw');
	const [warnConfirmed, setWarnConfirmed] = useState(false);

	// Calculate truncation.
	const { displayData, isTruncated, byteCount } = useTruncation(data, charLimits);

	// Warning threshold for large data.
	const needsWarning = byteCount > HEX_DATA_CONFIG.warnThreshold;

	// Decode data based on current format.
	const decoded = useMemo((): DecodedResult => {
		if (!registry) {
			return { format: 'raw', label: 'Raw Hex', content: null };
		}

		if (format === 'auto' && registry.auto) {
			const result = registry.auto(data);
			if (result) return result;
		}

		const decoder = registry.decoders[format];
		if (decoder) {
			const result = decoder(data);
			if (result) return result;
		}

		// Fallback to raw.
		return { format: 'raw', label: 'Raw Hex', content: null };
	}, [data, format, registry]);

	// Get available format options.
	const formatOptions = useMemo(() => {
		if (!registry) return [];
		const options: string[] = [];
		if (registry.auto) options.push('auto');
		options.push(...Object.keys(registry.decoders));
		return options;
	}, [registry]);

	// Handlers.
	const handleExpand = useCallback(() => {
		if (viewMode === 'concise') {
			if (needsWarning && !warnConfirmed) {
				const confirmed = window.confirm(
					`This data is ${formatBytes(byteCount)}. Expanding may slow your browser. Continue?`
				);
				if (!confirmed) return;
				setWarnConfirmed(true);
			}
			setViewMode('expanded');
		} else {
			setViewMode('concise');
		}
	}, [viewMode, needsWarning, warnConfirmed, byteCount]);

	const handleOpenModal = useCallback(() => {
		setViewMode('modal');
	}, []);

	const handleCloseModal = useCallback(() => {
		setViewMode('expanded');
	}, []);

	const handleFormatChange = useCallback((newFormat: string) => {
		setFormat(newFormat);
	}, []);

	// Empty data case.
	if (data === '0x') {
		return (
			<span className={`text-sm text-gray-500 dark:text-gray-400 italic ${className}`}>
				Empty
			</span>
		);
	}

	// Inline context - compact display.
	if (context === 'inline') {
		return (
			<InlineHexData
				data={data}
				displayData={displayData}
				isTruncated={isTruncated}
				byteCount={byteCount}
				viewMode={viewMode}
				decoded={decoded}
				format={format}
				formatOptions={formatOptions}
				showSize={showSize}
				allowModal={allowModal}
				onExpand={handleExpand}
				onOpenModal={handleOpenModal}
				onCloseModal={handleCloseModal}
				onFormatChange={handleFormatChange}
				className={className}
			/>
		);
	}

	// Section context - full card.
	return (
		<SectionHexData
			data={data}
			displayData={displayData}
			isTruncated={isTruncated}
			byteCount={byteCount}
			viewMode={viewMode}
			decoded={decoded}
			format={format}
			formatOptions={formatOptions}
			label={label}
			showSize={showSize}
			allowModal={allowModal}
			onExpand={handleExpand}
			onOpenModal={handleOpenModal}
			onCloseModal={handleCloseModal}
			onFormatChange={handleFormatChange}
			className={className}
		/>
	);
}

/** Props shared by inline and section variants. */
interface HexDataVariantProps {
	data: string;
	displayData: string;
	isTruncated: boolean;
	byteCount: number;
	viewMode: ViewMode;
	decoded: DecodedResult;
	format: string;
	formatOptions: string[];
	showSize: boolean;
	allowModal: boolean;
	onExpand: () => void;
	onOpenModal: () => void;
	onCloseModal: () => void;
	onFormatChange: (format: string) => void;
	className: string;
}

/**
 * Inline variant - compact, expands below.
 */
function InlineHexData({
	data,
	displayData,
	isTruncated,
	byteCount,
	viewMode,
	decoded,
	format,
	formatOptions,
	showSize,
	allowModal,
	onExpand,
	onOpenModal,
	onCloseModal,
	onFormatChange,
	className,
}: HexDataVariantProps) {
	const isExpanded = viewMode === 'expanded';
	const showContent = isExpanded || decoded.content;

	return (
		<div className={`${className}`}>
			{/* Main row. */}
			<div className="flex items-center gap-2 flex-wrap">
				{/* Hex preview or decoded content. */}
				{showContent && decoded.content ? (
					<div className="flex-1 min-w-0">{decoded.content}</div>
				) : (
					<code className="font-mono text-sm break-all flex-1 min-w-0">
						{isExpanded ? data : displayData}
					</code>
				)}

				{/* Actions. */}
				<div className="flex items-center gap-1 flex-shrink-0">
					{showSize && <SizeBadge bytes={byteCount} />}

					{formatOptions.length > 1 && (
						<FormatDropdown
							current={format}
							options={formatOptions}
							detected={decoded.format}
							onChange={onFormatChange}
						/>
					)}

					<CopyButton text={data} />
					<DownloadButton data={data} />
					{isTruncated && !decoded.content && (
						<ChevronButton isExpanded={isExpanded} onClick={onExpand} />
					)}
					{allowModal && <ModalButton onClick={onOpenModal} />}
				</div>
			</div>

			{/* Modal. */}
			<DataModal
				isOpen={viewMode === 'modal'}
				onClose={onCloseModal}
				title={decoded.label}
				byteCount={byteCount}
				data={data}
			>
				{decoded.content || <RawHexDisplay data={data} />}
			</DataModal>
		</div>
	);
}

/**
 * Section variant - full card with header.
 */
function SectionHexData({
	data,
	displayData,
	isTruncated,
	byteCount,
	viewMode,
	decoded,
	format,
	formatOptions,
	label,
	showSize,
	allowModal,
	onExpand,
	onOpenModal,
	onCloseModal,
	onFormatChange,
	className,
}: HexDataVariantProps & { label?: string }) {
	const isExpanded = viewMode === 'expanded';

	return (
		<div className={`bg-gray-50 dark:bg-gray-900 rounded ${className}`}>
			{/* Header. */}
			<div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					{label && (
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							{label}
						</span>
					)}
					{showSize && <SizeBadge bytes={byteCount} />}
				</div>

				<div className="flex items-center gap-2">
					{formatOptions.length > 1 && (
						<FormatDropdown
							current={format}
							options={formatOptions}
							detected={decoded.format}
							onChange={onFormatChange}
						/>
					)}
					<CopyButton text={data} />
					<DownloadButton data={data} />
					{isTruncated && !decoded.content && (
						<ChevronButton isExpanded={isExpanded} onClick={onExpand} />
					)}
					{allowModal && <ModalButton onClick={onOpenModal} />}
				</div>
			</div>

			{/* Content. */}
			<div
				className="p-3"
				style={{
					maxHeight: isExpanded ? `${HEX_DATA_CONFIG.maxExpandedHeight}px` : undefined,
					overflowY: isExpanded ? 'auto' : undefined,
				}}
			>
				{decoded.content ? (
					decoded.content
				) : (
					<code className="font-mono text-sm break-all block">
						{isExpanded ? data : displayData}
					</code>
				)}
			</div>

			{/* Modal. */}
			<DataModal
				isOpen={viewMode === 'modal'}
				onClose={onCloseModal}
				title={decoded.label}
				byteCount={byteCount}
				data={data}
			>
				{decoded.content || <RawHexDisplay data={data} />}
			</DataModal>
		</div>
	);
}

/**
 * Raw hex display for modal content.
 */
function RawHexDisplay({ data }: { data: string }) {
	return (
		<code className="font-mono text-sm break-all block whitespace-pre-wrap">
			{data}
		</code>
	);
}

/**
 * Format dropdown for decode options.
 */
function FormatDropdown({
	current,
	options,
	detected,
	onChange,
}: {
	current: string;
	options: string[];
	detected: string;
	onChange: (format: string) => void;
}) {
	return (
		<select
			value={current}
			onChange={(e) => onChange(e.target.value)}
			className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-nervos"
		>
			{options.map((opt) => (
				<option key={opt} value={opt}>
					{formatLabel(opt, detected)}
				</option>
			))}
		</select>
	);
}

/**
 * Format option label.
 */
function formatLabel(format: string, detected: string): string {
	const labels: Record<string, string> = {
		auto: 'Auto',
		raw: 'Raw Hex',
		witnessArgs: 'WitnessArgs',
		signature: 'Signature',
		sudt: 'SUDT',
		xudt: 'xUDT',
		dao: 'DAO',
		dep_group: 'Dep Group',
	};

	const label = labels[format] ?? format;

	if (format === 'auto' && detected !== 'raw') {
		const detectedLabel = labels[detected] ?? detected;
		return `Auto (${detectedLabel})`;
	}

	return label;
}

// Re-export types for external use.
export type { DecoderRegistry, Decoder, DecodedResult };
