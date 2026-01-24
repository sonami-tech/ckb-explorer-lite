/**
 * Sort option and value types for sorting UI components.
 */

export interface SortOption {
	field: string;
	label: string;
	ascLabel?: string;   // e.g., "Oldest First"
	descLabel?: string;  // e.g., "Newest First"
}

export interface SortValue {
	field: string;
	direction: 'asc' | 'desc';
}
