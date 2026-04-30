/**
 * Network configuration types.
 *
 * The runtime network list is loaded asynchronously by loadConfig.ts and
 * distributed via AppConfigContext. This module exists only to re-export
 * the type definitions and label helper for files that historically
 * imported from '../config/networks'.
 */

export type {
	NetworkType,
	NetworkConfig,
	AppConfig,
} from './loadConfig';

export { getNetworkTypeLabel, rpcPath, statsPath } from './loadConfig';
