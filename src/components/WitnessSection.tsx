import { useMemo } from 'react';
import { HexData, type DecoderRegistry, type DecodedResult } from './HexData';
import { formatBytes } from '../lib/format';
import {
	decodeWitnessArgs,
	decodeSignature,
	isWitnessArgs,
	isSignature,
	type WitnessArgsData,
	type SignatureData,
} from '../lib/decode';
import { CopyButton } from './CopyButton';

interface WitnessSectionProps {
	/** Array of witness hex strings. */
	witnesses: string[];
}

/**
 * Witnesses section for transaction page.
 * Displays witnesses with decode options (Raw, WitnessArgs, Signature).
 */
export function WitnessSection({ witnesses }: WitnessSectionProps) {
	if (witnesses.length === 0) return null;

	// Calculate total size for header.
	const totalBytes = witnesses.reduce((sum, w) => sum + (w.length - 2) / 2, 0);

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="font-semibold text-gray-900 dark:text-white">
					Witnesses ({witnesses.length}) <span className="text-size-meta font-normal">· {formatBytes(totalBytes)}</span>
				</h2>
			</div>

			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{witnesses.map((witness, index) => (
					<WitnessItem key={index} index={index} data={witness} />
				))}
			</div>
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
	const byteCount = (data.length - 2) / 2;

	// Build decoder registry for this witness.
	const registry = useMemo(() => createWitnessRegistry(), []);

	return (
		<div className="p-4">
			{/* Header with index and size. */}
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
					#{index}
				</span>
				<span className="text-size-meta">
					{formatBytes(byteCount)}
				</span>
			</div>

			{/* Witness content with decode options. */}
			<HexData
				data={data}
				registry={registry}
				context="section"
				showSize={false}
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
 */
function WitnessArgsField({ label, value }: { label: string; value: string | null }) {
	// Check if value is a signature (65 bytes).
	const isValueSignature = value && isSignature(value);
	const signatureData = isValueSignature ? decodeSignature(value) : null;

	return (
		<div>
			<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
				{label}
			</div>
			{value === null ? (
				<span className="text-sm text-gray-400 dark:text-gray-500 italic">None</span>
			) : value === '0x' ? (
				<span className="text-sm text-gray-400 dark:text-gray-500 italic">Empty</span>
			) : signatureData ? (
				// Show decoded signature for lock field.
				<div className="bg-gray-100 dark:bg-gray-800 rounded p-2">
					<div className="text-size-meta mb-1">
						SECP256K1 Signature ({formatBytes((value.length - 2) / 2)})
					</div>
					<SignatureView data={signatureData} />
				</div>
			) : (
				// Show raw hex with copy button.
				<div className="bg-gray-100 dark:bg-gray-800 rounded p-2">
					<div className="flex items-start gap-2">
						<code className="font-mono text-xs break-all flex-1">
							{value.length > 128 ? `${value.slice(0, 128)}…` : value}
						</code>
						<CopyButton text={value} />
					</div>
					{value.length > 128 && (
						<div className="text-size-meta mt-1">
							({formatBytes((value.length - 2) / 2)})
						</div>
					)}
				</div>
			)}
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
