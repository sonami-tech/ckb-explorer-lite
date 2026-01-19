/**
 * Registry of well-known CKB scripts and cells.
 *
 * Contains:
 * - Known type scripts (by code hash)
 * - Known lock scripts (by code hash)
 * - Well-known cells (by outpoint) with comprehensive documentation
 *
 * Sources:
 * - RFC 0024: CKB Genesis Script List
 * - RFC 0025: Simple UDT
 * - RFC 0026: Anyone-Can-Pay
 * - RFC 0042: Omnilock
 * - RFC 0052: Extensible UDT
 * - CCC SDK: https://github.com/ckb-devrel/ccc
 */

import type { NetworkType } from '../config/networks';
import type { RpcScript } from '../types/rpc';

/** Hash type values used in CKB scripts. */
export type HashType = 'type' | 'data' | 'data1' | 'data2';

export interface ScriptInfo {
	/** Human-readable name. */
	name: string;
	/** Short description of what this script does. */
	description: string;
	/** Expected hash type for this script. */
	hashType: HashType;
	/** URL to documentation (RFC or official docs). */
	sourceUrl?: string;
	/** Resource ID for linking to Well-Known Resources page anchor. */
	resourceId?: string;
	/** Data format in cell data (for type scripts). */
	dataFormat?: 'udt' | 'sudt' | 'xudt' | 'dao' | 'spore' | 'dep_group';
	/** Args format (for lock scripts). */
	argsFormat?: 'pubkey_hash' | 'omnilock' | 'acp' | 'multisig';
	/** Base type name for args-specific scripts (e.g., "xUDT" for iCKB). */
	baseTypeName?: string;
	/** Filter groups this script belongs to (for filtering UI). */
	groups?: string[];
}

/** Category for well-known cells. */
export type WellKnownCellCategory = 'system' | 'dep_group' | 'protocol';

/**
 * Comprehensive information for a well-known cell.
 */
export interface WellKnownCellInfo {
	/** Human-readable name. */
	name: string;
	/** What this cell is and contains. */
	description: string;
	/** Why this cell matters and how it's used. */
	importance: string;
	/** Category for UI styling. */
	category: WellKnownCellCategory;
	/** Data format for auto-decoding (if applicable). */
	dataFormat?: 'dep_group';
	/** External documentation links. */
	resources: Array<{ title: string; url: string }>;
	/** Related RFC number if applicable. */
	rfc?: string;
}

// RFC URLs for documentation links.
const RFC_0023 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md';
const RFC_0024 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0024-ckb-genesis-script-list/0024-ckb-genesis-script-list.md';
const RFC_0025 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0025-simple-udt/0025-simple-udt.md';
const RFC_0026 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md';
const RFC_0042 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md';
const RFC_0052 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0052-extensible-udt/0052-extensible-udt.md';
// Direct links to deployment configuration files.
const SPORE_VERSIONS = 'https://github.com/sporeprotocol/spore-contract/blob/master/docs/VERSIONS.md';
const JOYID_DOCS = 'https://docs.joyid.dev/guide/ckb/smart-contract';
const COTA_CONSTANTS = 'https://github.com/nervina-labs/cota-sdk-js/blob/develop/src/constants/index.ts';
const NOSTR_DEPLOYMENT = 'https://github.com/cryptape/nostr-binding/blob/main/docs/nostr-lock-script.md';
const PW_LOCK_DOCS = 'https://github.com/jordanmack/pw-core/blob/dev/src/constants.ts';
const ICKB_DEPLOYMENT = 'https://github.com/ickb/whitepaper#mainnet-deployment';
const RGBPP_CONSTANTS = 'https://github.com/ckb-cell/rgbpp-sdk/blob/main/packages/ckb/src/constants/index.ts';
const CKBFS_README = 'https://github.com/nervape/ckbfs/blob/master/README.md';
const CKB_SYSTEM_SCRIPTS = 'https://github.com/nervosnetwork/ckb-system-scripts';

/** Network type for script registries (mainnet or testnet). */
export type RegistryNetwork = 'mainnet' | 'testnet';

/** All-zeros code hash used for permanently locked cells. */
const ALWAYS_FAIL_CODE_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

/** Script info for unlockable lock (works with any hash_type). */
const UNLOCKABLE_LOCK: ScriptInfo = {
	name: 'Unlockable',
	description: 'Permanently locked cell that can never be spent. Used for burning CKB or creating immutable data.',
	hashType: 'data', // Placeholder - actual hash_type is ignored for this script.
};

/**
 * Well-known cells registry by outpoint.
 * Provides comprehensive documentation for important system and protocol cells.
 * Key format: `${txHash}:${index}`
 *
 * Categories:
 * - system: Genesis and core system cells (code binaries).
 * - dep_group: Dependency group cells referencing multiple code cells.
 * - protocol: Standard protocol cells (SUDT, xUDT, Spore, etc.).
 */
export const WELL_KNOWN_CELLS: Record<RegistryNetwork, Record<string, WellKnownCellInfo>> = {
	mainnet: {
		// ============================================
		// Genesis dep_group cells (RFC 0024)
		// ============================================
		'0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:0': {
			name: 'SECP256K1/blake160 Dep Group',
			description: 'Dependency group for the default SECP256K1/blake160 lock script. References the secp256k1 data cell and lock script code cell.',
			importance: 'Required cell dependency for all standard CKB addresses. Used by virtually every transaction.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:1': {
			name: 'Multisig Dep Group',
			description: 'Dependency group for the SECP256K1/blake160 multisig lock script. References the secp256k1 data cell and multisig code cell.',
			importance: 'Required for multi-signature wallets and time-locked transactions.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		// ============================================
		// Genesis code cells (RFC 0024)
		// Indices verified against RFC 0024:
		// - Index 1: SECP256K1/blake160 lock binary
		// - Index 2: NervosDAO type binary
		// - Index 3: secp256k1_data (precomputed curve data)
		// - Index 4: Multisig lock binary
		// ============================================
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:1': {
			name: 'SECP256K1/blake160 Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the default SECP256K1/blake160 lock script.',
			importance: 'Core lock script implementation. The type hash of this cell is the code_hash used in standard CKB addresses.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:2': {
			name: 'NervosDAO Binary',
			description: 'Contains the compiled RISC-V binary code for the NervosDAO type script.',
			importance: 'Core economic mechanism for CKB. Enables depositing CKB to earn interest from secondary issuance.',
			category: 'system',
			resources: [
				{ title: 'RFC 0023: Deposit and Withdraw', url: RFC_0023 },
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
			],
			rfc: '0023',
		},
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:3': {
			name: 'secp256k1_data',
			description: 'Contains precomputed secp256k1 curve data used by lock scripts for signature verification.',
			importance: 'Shared cryptographic data required by SECP256K1-based lock scripts to reduce on-chain computation.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:4': {
			name: 'Multisig Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the SECP256K1/blake160 multisig lock script.',
			importance: 'Enables multi-signature and time-locked transactions on CKB.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		// ============================================
		// Anyone-Can-Pay (RFC 0026)
		// ============================================
		'0x4153a2014952d7cac45f285ce9a7c5c0c0e1b21f2d378b82ac1433cb11c25c4d:0': {
			name: 'Anyone-Can-Pay Dep Group',
			description: 'Dependency group for the Anyone-Can-Pay lock script. References the secp256k1 data cell and ACP code cell.',
			importance: 'Enables receiving payments without signing. Used for donation addresses and simple payment flows.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0026: Anyone-Can-Pay', url: RFC_0026 },
			],
			rfc: '0026',
		},
		// ============================================
		// SUDT (RFC 0025)
		// ============================================
		'0xc7813f6a415144643970c2e88e0bb6ca6a8edc5dd7c1022746f628284a9936d5:0': {
			name: 'SUDT Binary',
			description: 'Contains the compiled RISC-V binary code for the Simple UDT (SUDT) type script.',
			importance: 'Standard token implementation. The foundation for fungible tokens on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0025: Simple UDT', url: RFC_0025 },
			],
			rfc: '0025',
		},
		// ============================================
		// xUDT (RFC 0052)
		// ============================================
		'0xc07844ce21b38e4b071dd0e1ee3b0e27afd8d7532491327f39b786343f558ab7:0': {
			name: 'xUDT Binary',
			description: 'Contains the compiled RISC-V binary code for the Extensible UDT (xUDT) type script.',
			importance: 'Advanced token standard with extension support. Used by iCKB, Seal, and other protocols.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0052: Extensible UDT', url: RFC_0052 },
			],
			rfc: '0052',
		},
		// ============================================
		// Omnilock (RFC 0042)
		// ============================================
		'0xc76edf469816aa22f416503c38d0b533d2a018e253e379f134c3985b3472c842:0': {
			name: 'Omnilock Binary',
			description: 'Contains the compiled RISC-V binary code for the Omnilock lock script.',
			importance: 'Universal lock supporting Ethereum, Bitcoin, Dogecoin addresses, and more. Enables cross-chain identity verification.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0042: Omnilock', url: RFC_0042 },
			],
			rfc: '0042',
		},
		// ============================================
		// Spore Protocol
		// ============================================
		'0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824:0': {
			name: 'Spore Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore type script.',
			importance: 'On-chain digital object protocol for NFTs with fully on-chain content storage.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Deployment Versions', url: SPORE_VERSIONS },
			],
		},
		'0xe464b7fb9311c5e2820e61c99afc615d6b98bdefbe318c34868c010cbd0dc938:0': {
			name: 'Spore Cluster Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore Cluster type script.',
			importance: 'Enables grouping Spores into collections with shared metadata and permissions.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Deployment Versions', url: SPORE_VERSIONS },
			],
		},
		// ============================================
		// JoyID
		// ============================================
		'0xf05188e5f3a6767fc4687faf45ba5f1a6e25d3ada6129dae8722cb282f262493:0': {
			name: 'JoyID Dep Group',
			description: 'Dependency group for the JoyID lock script. References the code cell and required dependencies.',
			importance: 'WebAuthn-based authentication using device biometrics. Enables passwordless wallet access.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'JoyID Documentation', url: JOYID_DOCS },
			],
		},
		// ============================================
		// CoTA (Compact Token Aggregator)
		// ============================================
		'0xabaa25237554f0d6c586dc010e7e85e6870bcfd9fb8773257ecacfbe1fd738a0:0': {
			name: 'CoTA Dep Group',
			description: 'Dependency group for the CoTA type script. References code cells needed for CoTA operations.',
			importance: 'Compact Token Aggregator protocol for efficient NFT management with minimal cell usage.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'CoTA SDK Constants', url: COTA_CONSTANTS },
			],
		},
		// ============================================
		// NostrLock
		// ============================================
		'0x1911208b136957d5f7c1708a8835edfe8ae1d02700d5cb2c3a6aacf4d5906306:0': {
			name: 'NostrLock Binary',
			description: 'Contains the compiled RISC-V binary code for the NostrLock lock script.',
			importance: 'Enables CKB asset control using Nostr protocol keys (schnorr signatures).',
			category: 'protocol',
			resources: [
				{ title: 'NostrLock Deployment', url: NOSTR_DEPLOYMENT },
			],
		},
		// ============================================
		// RGB++ Protocol
		// ============================================
		'0xcb4d9f9726e66306bfda6359d39d3bea8b4e5345d0f95f26a3e51626ebe82a63:0': {
			name: 'RGB++ Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the RGB++ lock script.',
			importance: 'Enables Bitcoin-secured CKB assets through isomorphic binding.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK Constants', url: RGBPP_CONSTANTS },
			],
		},
		'0x3d1c26b966504b09253ad84173bf3baa7b8135c5ff520c32cf70b631c1d08b9b:0': {
			name: 'BTC Time Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the BTC Time Lock.',
			importance: 'Time-based locking mechanism for RGB++ protocol on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK Constants', url: RGBPP_CONSTANTS },
			],
		},
		// ============================================
		// CKBFS (File Storage)
		// ============================================
		'0xfab07962ed7178ed88d450774e2a6ecd50bae856bdb9b692980be8c5147d1bfa:0': {
			name: 'CKBFS Dep Group',
			description: 'Dependency group for the CKBFS type script. References code cells needed for file storage operations.',
			importance: 'Enables on-chain file storage with content-addressable chunks.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'CKBFS Deployment', url: CKBFS_README },
			],
		},
		// ============================================
		// iCKB Protocol
		// ============================================
		'0x621a6f38de3b9f453016780edac3b26bfcbfa3e2ecb47c2da275471a5d3ed165:0': {
			name: 'iCKB Dep Group',
			description: 'Dependency group for the iCKB protocol scripts. References logic, limit order, and owned-owner code cells.',
			importance: 'NervosDAO liquidity protocol that tokenizes DAO deposits into transferable iCKB tokens.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'iCKB Deployment', url: ICKB_DEPLOYMENT },
			],
		},
	},
	testnet: {
		// ============================================
		// Genesis dep_group cells
		// ============================================
		'0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37:0': {
			name: 'SECP256K1/blake160 Dep Group',
			description: 'Dependency group for the default SECP256K1/blake160 lock script. References the secp256k1 data cell and lock script code cell.',
			importance: 'Required cell dependency for all standard CKB addresses. Used by virtually every transaction.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37:1': {
			name: 'Multisig Dep Group',
			description: 'Dependency group for the SECP256K1/blake160 multisig lock script. References the secp256k1 data cell and multisig code cell.',
			importance: 'Required for multi-signature wallets and time-locked transactions.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		// ============================================
		// Genesis code cells (RFC 0024)
		// Indices verified against RFC 0024:
		// - Index 1: SECP256K1/blake160 lock binary
		// - Index 2: NervosDAO type binary
		// - Index 3: secp256k1_data (precomputed curve data)
		// - Index 4: Multisig lock binary
		// ============================================
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:1': {
			name: 'SECP256K1/blake160 Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the default SECP256K1/blake160 lock script.',
			importance: 'Core lock script implementation. The type hash of this cell is the code_hash used in standard CKB addresses.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:2': {
			name: 'NervosDAO Binary',
			description: 'Contains the compiled RISC-V binary code for the NervosDAO type script.',
			importance: 'Core economic mechanism for CKB. Enables depositing CKB to earn interest from secondary issuance.',
			category: 'system',
			resources: [
				{ title: 'RFC 0023: Deposit and Withdraw', url: RFC_0023 },
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
			],
			rfc: '0023',
		},
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:3': {
			name: 'secp256k1_data',
			description: 'Contains precomputed secp256k1 curve data used by lock scripts for signature verification.',
			importance: 'Shared cryptographic data required by SECP256K1-based lock scripts to reduce on-chain computation.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:4': {
			name: 'Multisig Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the SECP256K1/blake160 multisig lock script.',
			importance: 'Enables multi-signature and time-locked transactions on CKB.',
			category: 'system',
			resources: [
				{ title: 'RFC 0024: CKB Genesis Script List', url: RFC_0024 },
				{ title: 'CKB System Scripts', url: CKB_SYSTEM_SCRIPTS },
			],
			rfc: '0024',
		},
		// ============================================
		// Anyone-Can-Pay (RFC 0026)
		// ============================================
		'0xec26b0f85ed839ece5f11c4c4e837ec359f5adc4420410f6453b1f6b60fb96a6:0': {
			name: 'Anyone-Can-Pay Dep Group',
			description: 'Dependency group for the Anyone-Can-Pay lock script. References the secp256k1 data cell and ACP code cell.',
			importance: 'Enables receiving payments without signing. Used for donation addresses and simple payment flows.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'RFC 0026: Anyone-Can-Pay', url: RFC_0026 },
			],
			rfc: '0026',
		},
		// ============================================
		// SUDT (RFC 0025)
		// ============================================
		'0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769:0': {
			name: 'SUDT Binary',
			description: 'Contains the compiled RISC-V binary code for the Simple UDT (SUDT) type script.',
			importance: 'Standard token implementation. The foundation for fungible tokens on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0025: Simple UDT', url: RFC_0025 },
			],
			rfc: '0025',
		},
		// ============================================
		// xUDT (RFC 0052)
		// ============================================
		'0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f:0': {
			name: 'xUDT Binary',
			description: 'Contains the compiled RISC-V binary code for the Extensible UDT (xUDT) type script.',
			importance: 'Advanced token standard with extension support.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0052: Extensible UDT', url: RFC_0052 },
			],
			rfc: '0052',
		},
		// ============================================
		// Omnilock (RFC 0042)
		// ============================================
		'0xec18bf0d857c981c3d1f4e17999b9b90c484b303378e94de1a57b0872f5d4602:0': {
			name: 'Omnilock Binary',
			description: 'Contains the compiled RISC-V binary code for the Omnilock lock script.',
			importance: 'Universal lock supporting Ethereum, Bitcoin, Dogecoin addresses, and more. Enables cross-chain identity verification.',
			category: 'protocol',
			resources: [
				{ title: 'RFC 0042: Omnilock', url: RFC_0042 },
			],
			rfc: '0042',
		},
		// ============================================
		// Spore Protocol
		// ============================================
		'0xfd694382e621f175ddf81ce91ce2ecf8bfc027d53d7d31b8438f7d26fc37fd19:0': {
			name: 'Spore Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore type script.',
			importance: 'On-chain digital object protocol for NFTs with fully on-chain content storage.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Deployment Versions', url: SPORE_VERSIONS },
			],
		},
		'0x49551a20dfe39231e7db49431d26c9c08ceec96a29024eef3acc936deeb2ca76:0': {
			name: 'Spore Cluster Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore Cluster type script.',
			importance: 'Enables grouping Spores into collections with shared metadata and permissions.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Deployment Versions', url: SPORE_VERSIONS },
			],
		},
		// ============================================
		// JoyID
		// ============================================
		'0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc9263:0': {
			name: 'JoyID Dep Group',
			description: 'Dependency group for the JoyID lock script. References the code cell and required dependencies.',
			importance: 'WebAuthn-based authentication using device biometrics. Enables passwordless wallet access.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'JoyID Documentation', url: JOYID_DOCS },
			],
		},
		// ============================================
		// NostrLock
		// ============================================
		'0xa2a434dcdbe280b9ed75bb7d6c7d68186a842456aba0fc506657dc5ed7c01d68:0': {
			name: 'NostrLock Binary',
			description: 'Contains the compiled RISC-V binary code for the NostrLock lock script.',
			importance: 'Enables CKB asset control using Nostr protocol keys (schnorr signatures).',
			category: 'protocol',
			resources: [
				{ title: 'NostrLock Deployment', url: NOSTR_DEPLOYMENT },
			],
		},
		// ============================================
		// CoTA (Compact Token Aggregator)
		// ============================================
		'0x636a786001f87cb615acfcf408be0f9a1f077001f0bbc75ca54eadfe7e221713:0': {
			name: 'CoTA Dep Group',
			description: 'Dependency group for the CoTA type script. References code cells needed for CoTA operations.',
			importance: 'Compact Token Aggregator protocol for efficient NFT management with minimal cell usage.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'CoTA SDK Constants', url: COTA_CONSTANTS },
			],
		},
		// ============================================
		// RGB++ Protocol
		// ============================================
		'0x0d1567da0979f78b297d5311442669fbd1bd853c8be324c5ab6da41e7a1ed6e5:0': {
			name: 'RGB++ Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the RGB++ lock script.',
			importance: 'Enables Bitcoin-secured CKB assets through isomorphic binding.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK Constants', url: RGBPP_CONSTANTS },
			],
		},
		'0x8fb747ff0416a43e135c583b028f98c7b81d3770551b196eb7ba1062dd9acc94:0': {
			name: 'BTC Time Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the BTC Time Lock.',
			importance: 'Time-based locking mechanism for RGB++ protocol on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK Constants', url: RGBPP_CONSTANTS },
			],
		},
		// ============================================
		// CKBFS (File Storage)
		// ============================================
		'0x469af0d961dcaaeed872968a9388b546717a6ccfa47b3165b3f9c981e9d66aaa:0': {
			name: 'CKBFS Dep Group',
			description: 'Dependency group for the CKBFS type script. References code cells needed for file storage operations.',
			importance: 'Enables on-chain file storage with content-addressable chunks.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'CKBFS Deployment', url: CKBFS_README },
			],
		},
		// ============================================
		// iCKB Protocol
		// ============================================
		'0xf7ece4fb33d8378344cab11fcd6a4c6f382fd4207ac921cf5821f30712dcd311:0': {
			name: 'iCKB Dep Group',
			description: 'Dependency group for the iCKB protocol scripts. References logic, limit order, and owned-owner code cells.',
			importance: 'NervosDAO liquidity protocol that tokenizes DAO deposits into transferable iCKB tokens.',
			category: 'dep_group',
			dataFormat: 'dep_group',
			resources: [
				{ title: 'iCKB Deployment', url: ICKB_DEPLOYMENT },
			],
		},
	},
};

/**
 * Known type script code hashes.
 * Maps code_hash -> ScriptInfo for mainnet and testnet.
 * Devnet uses testnet scripts.
 */
export const KNOWN_TYPE_SCRIPTS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// SUDT (Simple UDT) - RFC 0025.
		'0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5': {
			name: 'SUDT',
			description: 'Simple UDT token standard for fungible tokens on CKB.',
			hashType: 'type',
			sourceUrl: RFC_0025,
			resourceId: 'sudt',
			dataFormat: 'sudt',
			groups: ['UDT'],
		},
		// xUDT (Extensible UDT) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			resourceId: 'xudt',
			dataFormat: 'xudt',
			groups: ['UDT'],
		},
		// NervosDAO - RFC 0024.
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'dao',
			dataFormat: 'dao',
			groups: ['NervosDAO'],
		},
		// Spore - mainnet.
		'0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_VERSIONS,
			resourceId: 'spore',
			dataFormat: 'spore',
			groups: ['Spore', 'NFT'],
		},
		// iCKB Logic - used for iCKB token minting and burning logic.
		'0x2a8100ab5990fa055ab1b50891702e1e895c7bd1df6322cd725c1a6115873bd3': {
			name: 'iCKB Logic',
			description: 'iCKB protocol script for token minting and burning logic.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Limit Order - used for iCKB limit order matching.
		'0x49dfb6afee5cc8ac4225aeea8cb8928b150caf3cd92fea33750683c74b13254a': {
			name: 'iCKB Limit Order',
			description: 'iCKB protocol script for limit order matching.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Owned-Owner - used for ownership verification in iCKB operations.
		'0xacc79e07d107831feef4c70c9e683dac5644d5993b9cb106dca6e74baa381bd0': {
			name: 'iCKB Owned-Owner',
			description: 'iCKB protocol script for ownership verification.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// Spore Cluster - collection grouping for Spore NFTs.
		'0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075': {
			name: 'Spore Cluster',
			description: 'Enables grouping Spores into collections with shared metadata and permissions.',
			hashType: 'data1',
			sourceUrl: SPORE_VERSIONS,
			resourceId: 'spore',
			groups: ['Spore', 'NFT'],
		},
		// CKBFS - On-chain file storage protocol.
		'0x31e6376287d223b8c0410d562fb422f04d1d617b2947596a14c3d2efb7218d3a': {
			name: 'CKBFS',
			description: 'On-chain file storage with content-addressable chunks.',
			hashType: 'data1',
			sourceUrl: CKBFS_README,
			resourceId: 'ckbfs',
			groups: ['CKBFS'],
		},
		// CoTA - Compact Token Aggregator for efficient NFT management.
		'0x1122a4fb54697cf2e6e3a96c9d80fd398a936559b90954c6e88eb7ba0cf652df': {
			name: 'CoTA',
			description: 'Compact Token Aggregator protocol for efficient NFT management with minimal cell usage.',
			hashType: 'type',
			sourceUrl: COTA_CONSTANTS,
			resourceId: 'cota',
			groups: ['NFT'],
		},
	},
	testnet: {
		// SUDT (Simple UDT) - RFC 0025.
		'0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4': {
			name: 'SUDT',
			description: 'Simple UDT token standard for fungible tokens on CKB.',
			hashType: 'type',
			sourceUrl: RFC_0025,
			resourceId: 'sudt',
			dataFormat: 'sudt',
			groups: ['UDT'],
		},
		// xUDT V1 (data1 hash type) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			resourceId: 'xudt',
			dataFormat: 'xudt',
			groups: ['UDT'],
		},
		// xUDT V2 (type hash type, used by CCC SDK) - RFC 0052.
		'0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'type',
			sourceUrl: RFC_0052,
			resourceId: 'xudt',
			dataFormat: 'xudt',
			groups: ['UDT'],
		},
		// NervosDAO - RFC 0024 (same as mainnet).
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'dao',
			dataFormat: 'dao',
			groups: ['NervosDAO'],
		},
		// Spore - testnet.
		'0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_VERSIONS,
			resourceId: 'spore',
			dataFormat: 'spore',
			groups: ['Spore', 'NFT'],
		},
		// iCKB Logic - used for iCKB token minting and burning logic (same as mainnet).
		'0x2a8100ab5990fa055ab1b50891702e1e895c7bd1df6322cd725c1a6115873bd3': {
			name: 'iCKB Logic',
			description: 'iCKB protocol script for token minting and burning logic.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Limit Order - used for iCKB limit order matching (same as mainnet).
		'0x49dfb6afee5cc8ac4225aeea8cb8928b150caf3cd92fea33750683c74b13254a': {
			name: 'iCKB Limit Order',
			description: 'iCKB protocol script for limit order matching.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Owned-Owner - used for ownership verification in iCKB operations (same as mainnet).
		'0xacc79e07d107831feef4c70c9e683dac5644d5993b9cb106dca6e74baa381bd0': {
			name: 'iCKB Owned-Owner',
			description: 'iCKB protocol script for ownership verification.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// Spore Cluster - collection grouping for Spore NFTs.
		'0x0bbe768b519d8ea7b96d58f1182eb7e6ef96c541fbd9526975077ee09f049058': {
			name: 'Spore Cluster',
			description: 'Enables grouping Spores into collections with shared metadata and permissions.',
			hashType: 'data1',
			sourceUrl: SPORE_VERSIONS,
			resourceId: 'spore',
			groups: ['Spore', 'NFT'],
		},
		// CKBFS - On-chain file storage protocol (same code hash as mainnet).
		'0x31e6376287d223b8c0410d562fb422f04d1d617b2947596a14c3d2efb7218d3a': {
			name: 'CKBFS',
			description: 'On-chain file storage with content-addressable chunks.',
			hashType: 'data1',
			sourceUrl: CKBFS_README,
			resourceId: 'ckbfs',
			groups: ['CKBFS'],
		},
		// CoTA - Compact Token Aggregator for efficient NFT management.
		'0x89cd8003a0eaf8e65e0c31525b7d1d5c1becefd2ea75bb4cff87810ae37764d8': {
			name: 'CoTA',
			description: 'Compact Token Aggregator protocol for efficient NFT management with minimal cell usage.',
			hashType: 'type',
			sourceUrl: COTA_CONSTANTS,
			resourceId: 'cota',
			groups: ['NFT'],
		},
	},
};

/**
 * Known lock script code hashes.
 * Maps code_hash -> ScriptInfo for mainnet and testnet.
 * Devnet uses testnet scripts.
 */
export const KNOWN_LOCK_SCRIPTS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// SECP256K1/blake160 - RFC 0024.
		'0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8': {
			name: 'SECP256K1/blake160',
			description: 'Default lock script using secp256k1 signature verification.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'secp256k1',
			argsFormat: 'pubkey_hash',
			groups: ['SECP256K1'],
		},
		// SECP256K1/blake160 Multisig - RFC 0024.
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'multisig',
			argsFormat: 'multisig',
			groups: ['Multisig'],
		},
		// Omnilock (Mirana) - RFC 0042.
		// Omnilock includes built-in ACP mode and multisig authentication (auth flag 0x06).
		'0x9b819793a64463aed77c615d6cb226eea5487ccfc0783043a587254cda2b6f26': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			resourceId: 'omnilock',
			argsFormat: 'omnilock',
			groups: ['Omnilock', 'ACP', 'Multisig'],
		},
		// Anyone-Can-Pay (Lina) - RFC 0026.
		'0xd369597ff47f29fbc0d47d2e3775370d1250b85140c670e4718af712983a2354': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			resourceId: 'acp',
			argsFormat: 'acp',
			groups: ['ACP'],
		},
		// iCKB Logic - used for iCKB token minting and burning logic.
		'0x2a8100ab5990fa055ab1b50891702e1e895c7bd1df6322cd725c1a6115873bd3': {
			name: 'iCKB Logic',
			description: 'iCKB protocol script for token minting and burning logic.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Limit Order - used for iCKB limit order matching.
		'0x49dfb6afee5cc8ac4225aeea8cb8928b150caf3cd92fea33750683c74b13254a': {
			name: 'iCKB Limit Order',
			description: 'iCKB protocol script for limit order matching.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Owned-Owner - used for ownership verification in iCKB operations.
		'0xacc79e07d107831feef4c70c9e683dac5644d5993b9cb106dca6e74baa381bd0': {
			name: 'iCKB Owned-Owner',
			description: 'iCKB protocol script for ownership verification.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// PW Lock - Ethereum-style authentication (deprecated, use Omnilock instead).
		'0xbf43c3602455798c1a61a596e0d95278864c552fafe231c063b3fabf97a8febc': {
			name: 'PW Lock',
			description: 'Ethereum-style authentication with built-in anyone-can-pay support. Deprecated; use Omnilock for new deployments.',
			hashType: 'type',
			sourceUrl: PW_LOCK_DOCS,
			resourceId: 'pwlock',
			groups: ['PW Lock', 'ACP'],
		},
		// JoyID Lock - WebAuthn/passkey authentication.
		'0xd00c84f0ec8fd441c38bc3f87a371f547190f2fcff88e642bc5bf54b9e318323': {
			name: 'JoyID',
			description: 'Passwordless authentication using WebAuthn and device biometrics.',
			hashType: 'type',
			sourceUrl: JOYID_DOCS,
			resourceId: 'joyid',
			groups: ['JoyID'],
		},
		// Nostr Lock - Nostr protocol schnorr signature authentication.
		'0x641a89ad2f77721b803cd50d01351c1f308444072d5fa20088567196c0574c68': {
			name: 'Nostr Lock',
			description: 'Nostr protocol authentication using schnorr signatures with optional proof-of-work.',
			hashType: 'type',
			sourceUrl: NOSTR_DEPLOYMENT,
			resourceId: 'nostr',
			groups: ['Nostr'],
		},
		// RGB++ Lock - Bitcoin-secured CKB assets through isomorphic binding.
		'0xbc6c568a1a0d0a09f6844dc9d74ddb4343c32143ff25f727c59edf4fb72d6936': {
			name: 'RGB++ Lock',
			description: 'Bitcoin-secured CKB assets through isomorphic binding with Bitcoin UTXOs.',
			hashType: 'type',
			sourceUrl: RGBPP_CONSTANTS,
			resourceId: 'rgbpp',
			groups: ['RGB++'],
		},
		// BTC Time Lock - Time-based lock for RGB++ protocol.
		'0x70d64497a075bd651e98ac030455ea200637ee325a12ad08aff03f1a117e5a62': {
			name: 'BTC Time Lock',
			description: 'Time-based locking mechanism for RGB++ protocol leap operations.',
			hashType: 'type',
			sourceUrl: RGBPP_CONSTANTS,
			resourceId: 'rgbpp',
			groups: ['RGB++'],
		},
	},
	testnet: {
		// SECP256K1/blake160 - RFC 0024 (same as mainnet).
		'0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8': {
			name: 'SECP256K1/blake160',
			description: 'Default lock script using secp256k1 signature verification.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'secp256k1',
			argsFormat: 'pubkey_hash',
			groups: ['SECP256K1'],
		},
		// SECP256K1/blake160 Multisig - RFC 0024 (same as mainnet).
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			resourceId: 'multisig',
			argsFormat: 'multisig',
			groups: ['Multisig'],
		},
		// Omnilock (Pudge) - RFC 0042.
		// Omnilock includes built-in ACP mode and multisig authentication (auth flag 0x06).
		'0xf329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			resourceId: 'omnilock',
			argsFormat: 'omnilock',
			groups: ['Omnilock', 'ACP', 'Multisig'],
		},
		// Anyone-Can-Pay (Aggron) - RFC 0026.
		'0x3419a1c09eb2567f6552ee7a8ecffd64155cffe0f1796e6e61ec088d740c1356': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			resourceId: 'acp',
			argsFormat: 'acp',
			groups: ['ACP'],
		},
		// iCKB Logic - used for iCKB token minting and burning logic (same as mainnet).
		'0x2a8100ab5990fa055ab1b50891702e1e895c7bd1df6322cd725c1a6115873bd3': {
			name: 'iCKB Logic',
			description: 'iCKB protocol script for token minting and burning logic.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Limit Order - used for iCKB limit order matching (same as mainnet).
		'0x49dfb6afee5cc8ac4225aeea8cb8928b150caf3cd92fea33750683c74b13254a': {
			name: 'iCKB Limit Order',
			description: 'iCKB protocol script for limit order matching.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// iCKB Owned-Owner - used for ownership verification in iCKB operations (same as mainnet).
		'0xacc79e07d107831feef4c70c9e683dac5644d5993b9cb106dca6e74baa381bd0': {
			name: 'iCKB Owned-Owner',
			description: 'iCKB protocol script for ownership verification.',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			groups: ['iCKB'],
		},
		// PW Lock - Ethereum-style authentication (deprecated, use Omnilock instead).
		'0x58c5f491aba6d61678b7cf7edf4910b1f5e00ec0cde2f42e0abb4fd9aff25a63': {
			name: 'PW Lock',
			description: 'Ethereum-style authentication with built-in anyone-can-pay support. Deprecated; use Omnilock for new deployments.',
			hashType: 'type',
			sourceUrl: PW_LOCK_DOCS,
			resourceId: 'pwlock',
			groups: ['PW Lock', 'ACP'],
		},
		// JoyID Lock - WebAuthn/passkey authentication.
		'0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac': {
			name: 'JoyID',
			description: 'Passwordless authentication using WebAuthn and device biometrics.',
			hashType: 'type',
			sourceUrl: JOYID_DOCS,
			resourceId: 'joyid',
			groups: ['JoyID'],
		},
		// Nostr Lock - Nostr protocol schnorr signature authentication.
		'0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5': {
			name: 'Nostr Lock',
			description: 'Nostr protocol authentication using schnorr signatures with optional proof-of-work.',
			hashType: 'type',
			sourceUrl: NOSTR_DEPLOYMENT,
			resourceId: 'nostr',
			groups: ['Nostr'],
		},
		// RGB++ Lock - Bitcoin-secured CKB assets through isomorphic binding.
		'0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248': {
			name: 'RGB++ Lock',
			description: 'Bitcoin-secured CKB assets through isomorphic binding with Bitcoin UTXOs.',
			hashType: 'type',
			sourceUrl: RGBPP_CONSTANTS,
			resourceId: 'rgbpp',
			groups: ['RGB++'],
		},
		// BTC Time Lock - Time-based lock for RGB++ protocol.
		'0x00cdf8fab0f8ac638758ebf5ea5e4052b1d71e8a77b9f43139718621f6849326': {
			name: 'BTC Time Lock',
			description: 'Time-based locking mechanism for RGB++ protocol leap operations.',
			hashType: 'type',
			sourceUrl: RGBPP_CONSTANTS,
			resourceId: 'rgbpp',
			groups: ['RGB++'],
		},
	},
};

/**
 * Build a key for args-specific script lookup.
 */
function buildArgsKey(codeHash: string, hashType: string, args: string): string {
	return `${codeHash}:${hashType}:${args}`;
}

/**
 * Known type scripts that require args matching (specific tokens).
 * Keyed by `${codeHash}:${hashType}:${args}`.
 */
export const KNOWN_TYPE_SCRIPTS_BY_ARGS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// iCKB - NervosDAO liquidity token.
		// Args: iCKB Logic Script Hash + owner mode flag (0x80000000 LE).
		[buildArgsKey(
			'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
			'data1',
			'0xb73b6ab39d79390c6de90a09c96b290c331baf1798ed6f97aed02590929734e800000080',
		)]: {
			name: 'iCKB',
			description: 'iCKB NervosDAO liquidity token (xUDT).',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			dataFormat: 'xudt',
			baseTypeName: 'xUDT',
		},
	},
	testnet: {
		// iCKB - NervosDAO liquidity token (same args as mainnet).
		[buildArgsKey(
			'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
			'data1',
			'0xb73b6ab39d79390c6de90a09c96b290c331baf1798ed6f97aed02590929734e800000080',
		)]: {
			name: 'iCKB',
			description: 'iCKB NervosDAO liquidity token (xUDT).',
			hashType: 'data1',
			sourceUrl: ICKB_DEPLOYMENT,
			resourceId: 'ickb',
			dataFormat: 'xudt',
			baseTypeName: 'xUDT',
		},
	},
};

/**
 * Known lock scripts that require args matching.
 * Keyed by `${codeHash}:${hashType}:${args}`.
 */
export const KNOWN_LOCK_SCRIPTS_BY_ARGS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// Add mainnet-specific locks here.
	},
	testnet: {
		// Add testnet-specific locks here.
	},
};

/**
 * Map network type to registry network.
 * Devnet uses testnet scripts.
 */
export function toRegistryNetwork(network: NetworkType): RegistryNetwork {
	return network === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Look up a type script by its code hash, hash type, and optionally args.
 * Checks args-specific scripts first, then falls back to generic.
 */
export function lookupTypeScript(
	codeHash: string,
	hashType: string,
	network: NetworkType,
	args?: string,
): ScriptInfo | null {
	const registryNetwork = toRegistryNetwork(network);

	// Check args-specific registry first.
	if (args) {
		const argsKey = buildArgsKey(codeHash, hashType, args);
		const argsInfo = KNOWN_TYPE_SCRIPTS_BY_ARGS[registryNetwork][argsKey];
		if (argsInfo) {
			return argsInfo;
		}
	}

	// Fall back to generic registry.
	const info = KNOWN_TYPE_SCRIPTS[registryNetwork][codeHash];
	if (info && info.hashType === hashType) {
		return info;
	}
	return null;
}

/**
 * Look up a lock script by its code hash, hash type, and optionally args.
 * Checks args-specific scripts first, then falls back to generic.
 */
export function lookupLockScript(
	codeHash: string,
	hashType: string,
	network: NetworkType,
	args?: string,
): ScriptInfo | null {
	const registryNetwork = toRegistryNetwork(network);

	// Check args-specific registry first.
	if (args) {
		const argsKey = buildArgsKey(codeHash, hashType, args);
		const argsInfo = KNOWN_LOCK_SCRIPTS_BY_ARGS[registryNetwork][argsKey];
		if (argsInfo) {
			return argsInfo;
		}
	}

	// Check for unlockable lock (all-zeros code hash, any hash type).
	if (codeHash === ALWAYS_FAIL_CODE_HASH) {
		return UNLOCKABLE_LOCK;
	}

	// Fall back to generic registry.
	const info = KNOWN_LOCK_SCRIPTS[registryNetwork][codeHash];
	if (info && info.hashType === hashType) {
		return info;
	}
	return null;
}

/**
 * Look up cell data format by outpoint.
 * Used for cells without type scripts (e.g., genesis dep_group cells).
 */
export function lookupCellFormat(
	txHash: string,
	index: number,
	network: NetworkType,
): ScriptInfo['dataFormat'] | null {
	const registryNetwork = toRegistryNetwork(network);
	const key = `${txHash}:${index}`;
	const cellInfo = WELL_KNOWN_CELLS[registryNetwork][key];
	return cellInfo?.dataFormat ?? null;
}

/**
 * Look up comprehensive well-known cell info by outpoint.
 * Returns null if the cell is not in the registry.
 */
export function lookupWellKnownCell(
	txHash: string,
	index: number,
	network: NetworkType,
): WellKnownCellInfo | null {
	const registryNetwork = toRegistryNetwork(network);
	const key = `${txHash}:${index}`;
	return WELL_KNOWN_CELLS[registryNetwork][key] ?? null;
}

/**
 * Get the NervosDAO type script.
 * Used for filtering DAO cells in indexer queries.
 * Note: The code_hash is the same for mainnet and testnet.
 */
export function getDaoTypeScript(): RpcScript {
	return {
		code_hash: '0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e',
		hash_type: 'type',
		args: '0x',
	};
}
