import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { useTruncation, useIsMobile, type BreakpointTier } from '../hooks/ui';
import { CopyButton, DownloadButton, ChevronButton, ChevronDownIcon, SizeBadge } from './CopyButton';
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

	/** Context for styling: 'inline' for compact, 'section' for full card, 'flat' for no card wrapper. */
	context?: 'inline' | 'section' | 'flat';

	/** Optional label for the data. */
	label?: string;

	/** Optional index number to display in header (e.g., for witnesses). */
	index?: number;

	/** Show size badge. Default: true. */
	showSize?: boolean;

	/** Allow modal view for large data. Default: true. */
	allowModal?: boolean;

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
	index,
	showSize = true,
	allowModal = true,
	charLimits,
	className = '',
}: HexDataProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('concise');
	const [format, setFormat] = useState<string>(registry?.defaultFormat ?? 'raw');

	// Calculate truncation.
	const { displayData, isTruncated, byteCount } = useTruncation(data, charLimits);

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
	const handleOpenModal = useCallback(() => {
		setViewMode('modal');
	}, []);

	const handleCloseModal = useCallback(() => {
		setViewMode('concise');
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
				onOpenModal={handleOpenModal}
				onCloseModal={handleCloseModal}
				onFormatChange={handleFormatChange}
				className={className}
			/>
		);
	}

	// Flat context - no card wrapper, just toolbar and content.
	if (context === 'flat') {
		return (
			<FlatHexData
				data={data}
				displayData={displayData}
				isTruncated={isTruncated}
				byteCount={byteCount}
				viewMode={viewMode}
				decoded={decoded}
				format={format}
				formatOptions={formatOptions}
				index={index}
				showSize={showSize}
				allowModal={allowModal}
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
			index={index}
			showSize={showSize}
			allowModal={allowModal}
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
	onOpenModal: () => void;
	onCloseModal: () => void;
	onFormatChange: (format: string) => void;
	className: string;
}

/**
 * Inline variant - compact display with responsive layout.
 * Mobile: Buttons in header row, hex content below.
 * Desktop: Buttons inline with hex.
 * If truncated, centered chevron below opens modal for full view.
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
	onOpenModal,
	onCloseModal,
	onFormatChange,
	className,
}: HexDataVariantProps) {
	const isMobile = useIsMobile(1024);
	const showChevron = isTruncated && !decoded.content && allowModal;

	// Action buttons (copy, download).
	const actionButtons = (
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
		</div>
	);

	return (
		<div className={`${className}`}>
			{/* Mobile/Tablet: Header row with buttons on right. */}
			{isMobile && (
				<div className="flex items-center justify-end mb-2">
					{actionButtons}
				</div>
			)}

			{/* Content row. */}
			<div className="flex items-center gap-2">
				{/* Hex preview or decoded content. */}
				{decoded.content ? (
					<div className="flex-1 min-w-0">{decoded.content}</div>
				) : (
					<code className="font-mono text-sm break-all flex-1 min-w-0">
						{displayData}
					</code>
				)}

				{/* Desktop (>=1024px): Buttons inline. */}
				{!isMobile && actionButtons}
			</div>

			{/* Chevron opens modal for full view. */}
			{showChevron && (
				<div className="mt-2 flex justify-center">
					<ChevronButton isExpanded={false} onClick={onOpenModal} />
				</div>
			)}

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
 * Flat variant - no card wrapper, just toolbar row and content.
 * Used for witnesses to avoid nested backgrounds.
 */
function FlatHexData({
	data,
	displayData,
	isTruncated,
	byteCount,
	viewMode,
	decoded,
	format,
	formatOptions,
	index,
	showSize,
	allowModal,
	onOpenModal,
	onCloseModal,
	onFormatChange,
	className,
}: HexDataVariantProps & { index?: number }) {
	const showChevron = isTruncated && !decoded.content && allowModal;

	return (
		<div className={className}>
			{/* Header row with index, size, and action buttons. */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-1">
					{index !== undefined && (
						<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
							#{index}
						</span>
					)}
					{showSize && (
						<span className="text-size-meta">
							({byteCount.toLocaleString()} bytes)
						</span>
					)}
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
				</div>
			</div>

			{/* Content. */}
			<div>
				{decoded.content ? (
					decoded.content
				) : (
					<code className="font-mono text-sm break-all block">
						{displayData}
					</code>
				)}
			</div>

			{/* Chevron opens modal for full view. */}
			{showChevron && (
				<div className="mt-2 flex justify-center">
					<ChevronButton isExpanded={false} onClick={onOpenModal} />
				</div>
			)}

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
 * If truncated, centered chevron below content opens modal for full view.
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
	index,
	showSize,
	allowModal,
	onOpenModal,
	onCloseModal,
	onFormatChange,
	className,
}: HexDataVariantProps & { label?: string; index?: number }) {
	const showChevron = isTruncated && !decoded.content && allowModal;

	return (
		<div className={`bg-gray-50 dark:bg-gray-900 rounded ${className}`}>
			{/* Header. */}
			<div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					{index !== undefined && (
						<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
							#{index}
						</span>
					)}
					{showSize && (
						<span className="text-size-meta">
							({byteCount.toLocaleString()} bytes)
						</span>
					)}
					{label && (
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							{label}
						</span>
					)}
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
				</div>
			</div>

			{/* Content. */}
			<div className="p-3">
				{decoded.content ? (
					decoded.content
				) : (
					<code className="font-mono text-sm break-all block">
						{displayData}
					</code>
				)}
			</div>

			{/* Chevron opens modal for full view. */}
			{showChevron && (
				<div className="px-3 pb-3 flex justify-center">
					<ChevronButton isExpanded={false} onClick={onOpenModal} />
				</div>
			)}

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
		<div className="relative inline-block">
			<select
				value={current}
				onChange={(e) => onChange(e.target.value)}
				className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 pr-5 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-nervos cursor-pointer appearance-none"
			>
				{options.map((opt) => (
					<option key={opt} value={opt}>
						{formatLabel(opt, detected)}
					</option>
				))}
			</select>
			<ChevronDownIcon size="w-3 h-3" className="absolute right-1.5 top-1/2 -translate-y-1/2" />
		</div>
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
