/// <reference types="vite/client" />

interface ImportMetaEnv {
	/**
	 * CKB Network configurations (indexed).
	 * Format: Name|Type|IsArchive|URL
	 * Example: VITE_CKB_NETWORK_0=Archive Node|mainnet|true|http://127.0.0.1:8114
	 */
	readonly [key: `VITE_CKB_NETWORK_${number}`]: string | undefined;
	/** Polling interval for latest blocks and transactions (milliseconds). */
	readonly VITE_POLL_INTERVAL_MS: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
