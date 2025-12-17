interface SkeletonProps {
	className?: string;
}

/**
 * Base skeleton component with animation.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
		/>
	);
}

/**
 * Text skeleton with default height.
 */
export function SkeletonText({ className = '' }: SkeletonProps) {
	return <Skeleton className={`h-4 ${className}`} />;
}

/**
 * Block list item skeleton.
 */
export function SkeletonBlockItem() {
	return (
		<div className="h-[72px] p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
			<div className="flex items-center justify-between mb-2">
				<Skeleton className="h-5 w-20" />
				<Skeleton className="h-4 w-24" />
			</div>
			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-16" />
			</div>
		</div>
	);
}

/**
 * Transaction list item skeleton.
 */
export function SkeletonTransactionItem() {
	return (
		<div className="h-[72px] p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
			<div className="flex items-center justify-between mb-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-4 w-20" />
			</div>
			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-32" />
			</div>
		</div>
	);
}

/**
 * Cell list item skeleton.
 */
export function SkeletonCellItem() {
	return (
		<div className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
			<div className="flex items-center justify-between mb-2">
				<Skeleton className="h-4 w-56" />
				<Skeleton className="h-4 w-24" />
			</div>
			<div className="flex flex-col gap-1">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-3/4" />
			</div>
		</div>
	);
}

/**
 * Detail page skeleton.
 */
export function SkeletonDetail() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-8 w-64 mb-6" />
			<div className="space-y-3">
				{[...Array(6)].map((_, i) => (
					<div key={i} className="flex gap-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 flex-1" />
					</div>
				))}
			</div>
		</div>
	);
}
