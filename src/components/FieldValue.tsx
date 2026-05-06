/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { InfoIcon } from './InfoIcon';
import { Skeleton } from './Skeleton';

/**
 * Discriminated union representing every state a scalar field can be in.
 *
 * Construction idiom (capability check first, value check last):
 *
 *   state={
 *     !isCapabilitySupported ? { kind: 'unsupported', reason: '...' }
 *     : isLoading ? { kind: 'loading' }
 *     : value === null ? { kind: 'uncomputable', reason: '...' }
 *     : value === 0n ? { kind: 'empty' }
 *     : { kind: 'value', value }
 *   }
 *
 * The capability check must come BEFORE the loading and value checks so that
 * an unsupported field never spends time in a loading state on configs that
 * cannot answer it.
 */
export type FieldState<T> =
	| { kind: 'loading' }
	| { kind: 'value'; value: T }
	| { kind: 'empty' }
	| { kind: 'unsupported'; reason: string }
	| { kind: 'uncomputable'; reason: string };

type SkeletonWidth = 'narrow' | 'medium' | 'wide';

const WIDTH_CLASSES: Record<SkeletonWidth, string> = {
	narrow: 'w-16',
	medium: 'w-32',
	wide: 'w-48',
};

/**
 * Build a FieldState applying the canonical capability-first ordering so
 * unsupported fields never transit through 'loading'. Pass `supported: false`
 * to force the unsupported branch regardless of value/loading. `isEmpty`
 * defaults to "value is zero/empty-string" — override for richer empty checks.
 */
export function buildFieldState<T>(opts: {
	supported?: boolean;
	supportedReason?: string;
	loading?: boolean;
	value: T | null;
	isEmpty?: (value: T) => boolean;
	uncomputableReason?: string;
}): FieldState<T> {
	if (opts.supported === false) {
		return { kind: 'unsupported', reason: opts.supportedReason ?? 'Not supported on this configuration.' };
	}
	if (opts.loading) return { kind: 'loading' };
	if (opts.value === null) {
		return { kind: 'uncomputable', reason: opts.uncomputableReason ?? 'Value not available.' };
	}
	const isEmpty = opts.isEmpty ?? ((v) => v === 0 || v === 0n || v === '');
	if (isEmpty(opts.value)) return { kind: 'empty' };
	return { kind: 'value', value: opts.value };
}

/**
 * Two-state shortcut for fields where null/undefined means "still loading"
 * and no other states are reachable. Avoids the verbose buildFieldState call
 * when capability/empty/uncomputable distinctions don't apply.
 */
export function loadingOrValue<T>(value: T | null | undefined): FieldState<T> {
	return value === null || value === undefined ? { kind: 'loading' } : { kind: 'value', value };
}

interface FieldValueProps<T> {
	/** Discriminated state of the field. */
	state: FieldState<T>;
	/** Render a present value. Required when state can be 'value'. */
	format?: (value: T) => ReactNode;
	/** Render the empty state. Defaults to '0'. */
	formatEmpty?: () => ReactNode;
	/** Width of the loading skeleton. */
	width?: SkeletonWidth;
	/** Additional classes applied to the outer wrapper. */
	className?: string;
}

/**
 * Renders a scalar field for one of five states with consistent glyphs:
 *
 *   loading       → decorative skeleton bar (aria-hidden)
 *   value         → format(value)
 *   empty         → formatEmpty() (defaults to '0')
 *   unsupported   → '—' + InfoIcon (config can't provide this)
 *   uncomputable  → 'N/A' + InfoIcon (couldn't derive for this record)
 */
export function FieldValue<T>({
	state,
	format,
	formatEmpty = () => '0',
	width = 'medium',
	className = 'text-gray-900 dark:text-white',
}: FieldValueProps<T>) {
	switch (state.kind) {
		case 'loading': {
			// aria-hidden: skeletons are decorative placeholders. On polling pages
			// (HomePage), wrapping in role="status" caused screen readers to
			// re-announce "Loading X" on every interval tick.
			return (
				<span className={`inline-flex items-center ${className}`} aria-hidden="true">
					<Skeleton className={`h-4 ${WIDTH_CLASSES[width]}`} />
				</span>
			);
		}
		case 'value': {
			if (!format) {
				throw new Error('FieldValue: format prop is required when state.kind is "value".');
			}
			return <span className={className}>{format(state.value)}</span>;
		}
		case 'empty': {
			return <span className={className}>{formatEmpty()}</span>;
		}
		case 'unsupported':
		case 'uncomputable': {
			const glyph = state.kind === 'unsupported' ? '—' : 'N/A';
			const ariaPrefix = state.kind === 'unsupported' ? 'Not available' : 'Not computable';
			return (
				<span className={`inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 ${className}`}>
					<span aria-label={`${ariaPrefix}: ${state.reason}`}>{glyph}</span>
					<InfoIcon tooltip={state.reason} />
				</span>
			);
		}
	}
}
