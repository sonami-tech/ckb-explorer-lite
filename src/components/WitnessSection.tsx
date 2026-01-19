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

	// Handle page size changes.
	const handlePageSizeChange = useCallback((newSize: number) => {
		setPageSize(newSize);
		setCurrentPage(1);
	}, []);

	// Calculate pagination with automatic bounds clamping when witnesses array changes.
	const paginationData = useMemo(() => {
		const shouldPaginate = witnesses.length > TRANSACTION_SECTION_PAGINATION.threshold;
		const totalPages = Math.max(1, Math.ceil(witnesses.length / pageSize));
		// Clamp current page to valid range (handles case where witnesses array shrinks).
		const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
		const startIndex = (effectivePage - 1) * pageSize;
		const endIndex = shouldPaginate
			? Math.min(startIndex + pageSize, witnesses.length)
			: witnesses.length;
		const paginatedWitnesses = shouldPaginate
			? witnesses.slice(startIndex, endIndex)
			: witnesses;
		return { shouldPaginate, effectivePage, startIndex, paginatedWitnesses };
	}, [witnesses, pageSize, currentPage]);

	// Early return after all hooks are called.
	if (witnesses.length === 0) return null;

	// Calculate total size for header.
	const totalBytes = witnesses.reduce((sum, w) => sum + (w.length - 2) / 2, 0);

	const { shouldPaginate, effectivePage, startIndex, paginatedWitnesses } = paginationData;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="font-semibold text-gray-900 dark:text-white">
					Witnesses ({formatNumber(witnesses.length)}) <span className="text-size-meta font-normal">· {formatBytes(totalBytes)}</span>
				</h2>
			</div>

			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{paginatedWitnesses.map((witness, paginatedIndex) => (
					<WitnessItem key={startIndex + paginatedIndex} index={startIndex + paginatedIndex} data={witness} />
				))}
			</div>

			{shouldPaginate && (
				<div className="p-4 border-t border-gray-200 dark:border-gray-700">
					<Pagination
						currentPage={effectivePage}
						totalItems={witnesses.length}
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
		<div className="space-y-1 text-xs font-mono">
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-4">r:</span>
				<code className="break-all">{data.r}</code>
				<CopyButton text={data.r} />
			</div>
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-4">s:</span>
				<code className="break-all">{data.s}</code>
				<CopyButton text={data.s} />
			</div>
			<div className="flex items-center gap-2">
				<span className="text-gray-500 dark:text-gray-400 w-4">v:</span>
				<code>{data.v}</code>
				<span className="text-gray-400 dark:text-gray-500">(recovery ID)</span>
			</div>
		</div>
	);
}
