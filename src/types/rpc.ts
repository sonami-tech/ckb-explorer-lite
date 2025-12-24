/**
 * CKB JSON-RPC type definitions.
 * These match the raw RPC response formats before transformation.
 */

export type Hex = string;
export type Uint64 = string;
export type Uint32 = string;

export interface RpcScript {
	code_hash: Hex;
	hash_type: 'data' | 'type' | 'data1' | 'data2';
	args: Hex;
}

export interface RpcOutPoint {
	tx_hash: Hex;
	index: Uint32;
}

export interface RpcCellInput {
	previous_output: RpcOutPoint;
	since: Uint64;
}

export interface RpcCellOutput {
	capacity: Uint64;
	lock: RpcScript;
	type?: RpcScript | null;
}

export interface RpcCellDep {
	out_point: RpcOutPoint;
	dep_type: 'code' | 'dep_group';
}

export interface RpcTransaction {
	version: Uint32;
	cell_deps: RpcCellDep[];
	header_deps: Hex[];
	inputs: RpcCellInput[];
	outputs: RpcCellOutput[];
	outputs_data: Hex[];
	witnesses: Hex[];
	/** Transaction hash - only present when fetched with verbosity 0x2. */
	hash?: Hex;
}

export interface RpcBlockHeader {
	version: Uint32;
	compact_target: Uint32;
	timestamp: Uint64;
	number: Uint64;
	epoch: Uint64;
	parent_hash: Hex;
	transactions_root: Hex;
	proposals_hash: Hex;
	extra_hash: Hex;
	dao: Hex;
	nonce: string;
	hash: Hex;
}

export interface RpcBlock {
	header: RpcBlockHeader;
	uncles: unknown[];
	transactions: RpcTransaction[];
	proposals: Hex[];
}

export interface RpcTransactionWithStatus {
	transaction: RpcTransaction | null;
	tx_status: {
		status: 'pending' | 'proposed' | 'committed' | 'unknown' | 'rejected';
		block_hash?: Hex | null;
		block_number?: Uint64 | null;
		reason?: string | null;
	};
}

export interface RpcCell {
	output: RpcCellOutput;
	output_data: Hex;
	out_point: RpcOutPoint;
	block_number: Uint64;
	tx_index: Uint32;
}

export interface RpcGetCellsResponse {
	objects: RpcCell[];
	last_cursor: string;
}

export interface RpcTransactionInfo {
	tx_hash: Hex;
	block_number: Uint64;
	tx_index: Uint32;
	io_index: Uint32;
	io_type: 'input' | 'output';
}

export interface RpcGetTransactionsResponse {
	objects: RpcTransactionInfo[];
	last_cursor: string;
}

export interface RpcBlockchainInfo {
	chain: string;
	median_time: Uint64;
	epoch: Uint64;
	difficulty: Hex;
	is_initial_block_download: boolean;
	alerts: unknown[];
}

/**
 * Epoch information from get_current_epoch.
 */
export interface RpcEpoch {
	/** Epoch number. */
	number: Uint64;
	/** Block number of the first block in the epoch. */
	start_number: Uint64;
	/** Number of blocks in the epoch. */
	length: Uint64;
	/** Compact target for PoW. */
	compact_target: Uint32;
}

export interface RpcLiveCell {
	cell: {
		output: RpcCellOutput;
		data?: {
			content: Hex;
			hash: Hex;
		};
	} | null;
	status: 'live' | 'dead' | 'unknown';
}

/**
 * Cell with lifecycle information from the archive module.
 * Includes when the cell was created and consumed.
 */
export interface RpcCellWithLifecycle {
	out_point: RpcOutPoint;
	output: RpcCellOutput;
	output_data: Hex | null;
	created_block_number: Uint64;
	consumed_block_number: Uint64 | null;
}

/**
 * Indexer search key for get_cells and get_transactions.
 */
export interface IndexerSearchKey {
	script: RpcScript;
	script_type: 'lock' | 'type';
	script_search_mode?: 'prefix' | 'exact' | 'partial';
	filter?: {
		script?: RpcScript;
		script_len_range?: [Uint64, Uint64];
		output_data?: Hex;
		output_data_filter_mode?: 'prefix' | 'exact' | 'partial';
		output_data_len_range?: [Uint64, Uint64];
		output_capacity_range?: [Uint64, Uint64];
		block_range?: [Uint64, Uint64];
	};
	with_data?: boolean;
}

/**
 * JSON-RPC request structure.
 */
export interface JsonRpcRequest {
	jsonrpc: '2.0';
	id: number;
	method: string;
	params: unknown[];
}

/**
 * JSON-RPC response structure.
 */
export interface JsonRpcResponse<T = unknown> {
	jsonrpc: '2.0';
	id: number;
	result?: T;
	error?: {
		code: number;
		message: string;
		data?: string;
	};
}
