import { useMemo, useState, useCallback } from 'react';
import { HexData, type DecoderRegistry, type DecodedResult } from './HexData';
import { formatBytes, formatNumber } from '../lib/format';
import {
	decodeWitnessArgs,
	decodeSignature,
	isWitnessArgs,
	isSignature,
	type WitnessArgsData,
	type SignatureData,
} from '../lib/decode';
import { useTruncation } from '../hooks/ui';
import { CopyButton, DownloadButton, ModalButton, SizeBadge } from './CopyButton';
import { DataModal } from './DataModal';
import { TRANSACTION_SECTION_PAGINATION } from '../config/defaults';
import { Pagination } from './Pagination';

interface WitnessSectionProps {
	/** Array of witness hex strings. */
	witnesses: string[];
}

/**
 * Witnesses section for transaction page.
 * Displays witnesses with decode options (Raw, WitnessArgs, Signature).
 */
export function WitnessSection({ witnesses }: WitnessSectionProps) {
	// Pagination state (hooks must be called unconditionally).
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState<number>(TRANSACTION_SECTION_PAGINATION.defaultPageSize);

	// Hide empty witnesses toggle (default: checked/hidden).
	const [hideEmpty, setHideEmpty] = useState(true);

	// Handle page size changes.
	const handlePageSizeChange = useCallback((newSize: number) => {
		setPageSize(newSize);
		setCurrentPage(1);
	}, []);

	// Handle hide empty toggle changes.
	const handleHideEmptyChange = useCallback((checked: boolean) => {
		setHideEmpty(checked);
		setCurrentPage(1); // Reset to first page when filter changes.
	}, []);

	// Filter witnesses based on hideEmpty toggle.
	const { filteredWitnesses, emptyCount } = useMemo(() => {
		const emptyCount = witnesses.filter(w => w === '0x').length;
		const filteredWitnesses = hideEmpty
			? witnesses.map((w, i) => ({ witness: w, originalIndex: i })).filter(({ witness }) => witness !== '0x')
			: witnesses.map((w, i) => ({ witness: w, originalIndex: i }));
		return { filteredWitnesses, emptyCount };
	}, [witnesses, hideEmpty]);

	const isFiltered = hideEmpty && emptyCount > 0;

	// Calculate pagination with automatic bounds clamping when witnesses array changes.
	const paginationData = useMemo(() => {
		const shouldPaginate = filteredWitnesses.length > TRANSACTION_SECTION_PAGINATION.threshold;
		const totalPages = Math.max(1, Math.ceil(filteredWitnesses.length / pageSize));
		// Clamp current page to valid range (handles case where witnesses array shrinks).
		const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
		const startIndex = (effectivePage - 1) * pageSize;
		const endIndex = shouldPaginate
			? Math.min(startIndex + pageSize, filteredWitnesses.length)
			: filteredWitnesses.length;
		const paginatedWitnesses = shouldPaginate
			? filteredWitnesses.slice(startIndex, endIndex)
			: filteredWitnesses;
		return { shouldPaginate, effectivePage, startIndex, paginatedWitnesses };
	}, [filteredWitnesses, pageSize, currentPage]);

	// Early return after all hooks are called.
	if (witnesses.length === 0) return null;

	// Calculate total size for header.
	const totalBytes = witnesses.reduce((sum, w) => sum + (w.length - 2) / 2, 0);

	const { shouldPaginate, effectivePage, paginatedWitnesses } = paginationData;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Witnesses ({isFiltered
							? `${formatNumber(filteredWitnesses.length)} of ${formatNumber(witnesses.length)}`
							: formatNumber(witnesses.length)
						}) <span className="text-size-meta font-normal">· {formatBytes(totalBytes)}</span>
					</h2>
					{emptyCount > 0 && (
						<>
							{/* Mobile: Icon-only toggle. */}
							<button
								type="button"
								onClick={() => handleHideEmptyChange(!hideEmpty)}
								title={hideEmpty ? 'Show All' : 'Hide Empty'}
								className="sm:hidden p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							>
								{hideEmpty ? (
									<svg className="w-5 h-5 text-nervos" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								) : (
									<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								)}
							</button>
							{/* Desktop: Checkbox with label. */}
							<label className="hidden sm:inline-flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={hideEmpty}
									onChange={(e) => handleHideEmptyChange(e.target.checked)}
									className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-900"
								/>
								<span className="text-sm text-gray-600 dark:text-gray-400">
									Hide Empty
								</span>
							</label>
						</>
					)}
				</div>
			</div>

			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{paginatedWitnesses.length === 0 ? (
					<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
						All {formatNumber(witnesses.length)} witnesses are empty.
					</div>
				) : (
					paginatedWitnesses.map(({ witness, originalIndex }) => (
						<WitnessItem key={originalIndex} index={originalIndex} data={witness} />
					))
				)}
			</div>

			{shouldPaginate && (
				<div className="p-4 border-t border-gray-200 dark:border-gray-700">
					<Pagination
						currentPage={effectivePage}
						totalItems={filteredWitnesses.length}
						pageSize={pageSize}
						pageSizeOptions={TRANSACTION_SECTION_PAGINATION.options}
						onPageChange={setCurrentPage}
						onPageSizeChange={handlePageSizeChange}
					/>
				</div>
			)}
		</div>
	);
}

interface WitnessItemProps {
	index: number;
	data: string;
}

/**
 * Individual witness item with decode options.
 */
function WitnessItem({ index, data }: WitnessItemProps) {
	// Build decoder registry for this witness.
	const registry = useMemo(() => createWitnessRegistry(), []);

	return (
		<div className="p-4">
			{/* Witness content with index, size, and decode options in header. */}
			<HexData
				data={data}
				registry={registry}
				context="flat"
				index={index}
				showSize={true}
			/>
		</div>
	);
}

/**
 * Create decoder registry for witnesses.
 */
function createWitnessRegistry(): DecoderRegistry {
	return {
		defaultFormat: 'auto',

		auto: (data: string): DecodedResult | null => {
			// Empty witness.
			if (data === '0x') {
				return {
					format: 'empty',
					label: 'Empty',
					content: <EmptyWitness />,
				};
			}

			// Try WitnessArgs.
			if (isWitnessArgs(data)) {
				const parsed = decodeWitnessArgs(data);
				if (parsed) {
					return {
						format: 'witnessArgs',
						label: 'WitnessArgs',
						content: <WitnessArgsView data={parsed} />,
					};
				}
			}

			// Try signature (65 bytes).
			if (isSignature(data)) {
				const parsed = decodeSignature(data);
				if (parsed) {
					return {
						format: 'signature',
						label: 'SECP256K1 Signature',
						content: <SignatureView data={parsed} />,
					};
				}
			}

			// Fallback to raw.
			return null;
		},

		decoders: {
			raw: (): DecodedResult => ({
				format: 'raw',
				label: 'Raw Hex',
				content: null, // HexData will show raw hex.
			}),

			witnessArgs: (data: string): DecodedResult | null => {
				const parsed = decodeWitnessArgs(data);
				if (!parsed) return null;
				return {
					format: 'witnessArgs',
					label: 'WitnessArgs',
					content: <WitnessArgsView data={parsed} />,
				};
			},

			signature: (data: string): DecodedResult | null => {
				const parsed = decodeSignature(data);
				if (!parsed) return null;
				return {
					format: 'signature',
					label: 'SECP256K1 Signature',
					content: <SignatureView data={parsed} />,
				};
			},
		},
	};
}

/**
 * Empty witness display.
 */
function EmptyWitness() {
	return (
		<span className="text-sm text-gray-500 dark:text-gray-400 italic">
			Empty witness
		</span>
	);
}

/**
 * WitnessArgs structured view.
 */
function WitnessArgsView({ data }: { data: WitnessArgsData }) {
	return (
		<div className="space-y-3">
			<WitnessArgsField label="lock" value={data.lock} />
			<WitnessArgsField label="input_type" value={data.inputType} />
			<WitnessArgsField label="output_type" value={data.outputType} />
		</div>
	);
}

/**
 * Individual field in WitnessArgs.
 * Follows SubDataSection pattern: label row with size + buttons, content row below.
 */
function WitnessArgsField({ label, value }: { label: string; value: string | null }) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Check if value is a signature (65 bytes).
	const isValueSignature = value && isSignature(value);
	const signatureData = isValueSignature ? decodeSignature(value) : null;

	// Use responsive truncation for non-signature hex values.
	const { displayData, byteCount } = useTruncation(value ?? '0x');

	// Empty states.
	if (value === null) {
		return (
			<div>
				<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
					{label}
				</div>
				<span className="text-sm text-gray-400 dark:text-gray-500 italic">None</span>
			</div>
		);
	}

	if (value === '0x') {
		return (
			<div>
				<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
					{label}
				</div>
				<span className="text-sm text-gray-400 dark:text-gray-500 italic">Empty</span>
			</div>
		);
	}

	// Decoded signature display.
	if (signatureData) {
		return (
			<div>
				<div className="flex items-center justify-between mb-1">
					<span className="text-xs font-medium text-gray-500 dark:text-gray-400">
						{label} <SizeBadge bytes={byteCount} /> · SECP256K1 Signature
					</span>
				</div>
				<SignatureView data={signatureData} />
			</div>
		);
	}

	// Raw hex display.
	return (
		<div>
			{/* Label row with size and action buttons. */}
			<div className="flex items-center justify-between mb-1">
				<span className="text-xs font-medium text-gray-500 dark:text-gray-400">
					{label} <SizeBadge bytes={byteCount} />
				</span>
				<div className="flex items-center gap-1">
					<CopyButton text={value} />
					<DownloadButton data={value} filename={label.toLowerCase().replace(/_/g, '-')} />
					<ModalButton onClick={() => setIsModalOpen(true)} />
				</div>
			</div>
			{/* Content row. */}
			<code className="font-mono text-xs break-all block">
				{displayData}
			</code>
			{/* Modal for full data view. */}
			<DataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={label}
				byteCount={byteCount}
				data={value}
			>
				<code className="font-mono text-sm break-all break-anywhere block whitespace-pre-wrap min-w-0 max-w-full">
					{value}
				</code>
			</DataModal>
		</div>
	);
}

/**
 * Signature structured view.
 */
function SignatureView({ data }: { data: SignatureData }) {
	return (
		<div className="text-xs font-mono">
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-3">r:</span>
				<code className="break-all">{data.r}</code>
				<CopyButton text={data.r} />
			</div>
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-3">s:</span>
				<code className="break-all">{data.s}</code>
				<CopyButton text={data.s} />
			</div>
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-3">v:</span>
				<code>{data.v}</code>
				<CopyButton text={String(data.v)} />
			</div>
		</div>
	);
}
