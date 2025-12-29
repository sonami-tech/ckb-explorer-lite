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
	/** Data format in cell data (for type scripts). */
	dataFormat?: 'sudt' | 'xudt' | 'dao' | 'spore' | 'dep_group';
	/** Args format (for lock scripts). */
	argsFormat?: 'pubkey_hash' | 'omnilock' | 'acp' | 'multisig';
	/** Base type name for args-specific scripts (e.g., "xUDT" for iCKB). */
	baseTypeName?: string;
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
const SPORE_DOCS = 'https://docs.spore.pro';
const SPORE_CONTRACTS = 'https://docs.spore.pro/resources/contracts';
const JOYID_DOCS = 'https://docs.joyid.dev/guide/ckb/smart-contract';
const COTA_DOCS = 'https://www.cotadev.io';
const COTA_SDK = 'https://github.com/nervina-labs/cota-sdk-js';
const NOSTR_DOCS = 'https://github.com/cryptape/nostr-binding';
const ICKB_DOCS = 'https://github.com/ickb/proposal';
const RGBPP_SDK = 'https://github.com/ckb-cell/rgbpp-sdk';
const CKBFS_DOCS = 'https://github.com/nervape/ckbfs';
const CKB_SYSTEM_SCRIPTS = 'https://github.com/nervosnetwork/ckb-system-scripts';

// Internal type for the registry (mainnet and testnet only).
type RegistryNetwork = 'mainnet' | 'testnet';

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
		// ============================================
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:2': {
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
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:0': {
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
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:3': {
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
		'0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:1': {
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
				{ title: 'Spore Protocol Docs', url: SPORE_DOCS },
				{ title: 'Spore Contracts', url: SPORE_CONTRACTS },
			],
		},
		'0xe464b7fb9311c5e2820e61c99afc615d6b98bdefbe318c34868c010cbd0dc938:0': {
			name: 'Spore Cluster Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore Cluster type script.',
			importance: 'Enables grouping Spores into collections with shared metadata and permissions.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Protocol Docs', url: SPORE_DOCS },
				{ title: 'Spore Contracts', url: SPORE_CONTRACTS },
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
				{ title: 'CoTA Documentation', url: COTA_DOCS },
				{ title: 'CoTA SDK', url: COTA_SDK },
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
				{ title: 'NostrLock Repository', url: NOSTR_DOCS },
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
				{ title: 'RGB++ SDK', url: RGBPP_SDK },
			],
		},
		'0x3d1c26b966504b09253ad84173bf3baa7b8135c5ff520c32cf70b631c1d08b9b:0': {
			name: 'BTC Time Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the BTC Time Lock.',
			importance: 'Time-based locking mechanism for RGB++ protocol on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK', url: RGBPP_SDK },
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
				{ title: 'CKBFS Repository', url: CKBFS_DOCS },
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
				{ title: 'iCKB Proposal', url: ICKB_DOCS },
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
		// Genesis code cells
		// ============================================
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:2': {
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
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:0': {
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
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:3': {
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
		'0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f:1': {
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
				{ title: 'Spore Protocol Docs', url: SPORE_DOCS },
				{ title: 'Spore Contracts', url: SPORE_CONTRACTS },
			],
		},
		'0x49551a20dfe39231e7db49431d26c9c08ceec96a29024eef3acc936deeb2ca76:0': {
			name: 'Spore Cluster Binary',
			description: 'Contains the compiled RISC-V binary code for the Spore Cluster type script.',
			importance: 'Enables grouping Spores into collections with shared metadata and permissions.',
			category: 'protocol',
			resources: [
				{ title: 'Spore Protocol Docs', url: SPORE_DOCS },
				{ title: 'Spore Contracts', url: SPORE_CONTRACTS },
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
				{ title: 'NostrLock Repository', url: NOSTR_DOCS },
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
				{ title: 'CoTA Documentation', url: COTA_DOCS },
				{ title: 'CoTA SDK', url: COTA_SDK },
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
				{ title: 'RGB++ SDK', url: RGBPP_SDK },
			],
		},
		'0x8fb747ff0416a43e135c583b028f98c7b81d3770551b196eb7ba1062dd9acc94:0': {
			name: 'BTC Time Lock Binary',
			description: 'Contains the compiled RISC-V binary code for the BTC Time Lock.',
			importance: 'Time-based locking mechanism for RGB++ protocol on CKB.',
			category: 'protocol',
			resources: [
				{ title: 'RGB++ SDK', url: RGBPP_SDK },
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
				{ title: 'CKBFS Repository', url: CKBFS_DOCS },
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
				{ title: 'iCKB Proposal', url: ICKB_DOCS },
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
			dataFormat: 'sudt',
		},
		// xUDT (Extensible UDT) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// NervosDAO - RFC 0024.
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			dataFormat: 'dao',
		},
		// Spore - mainnet.
		'0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_DOCS,
			dataFormat: 'spore',
		},
	},
	testnet: {
		// SUDT (Simple UDT) - RFC 0025.
		'0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4': {
			name: 'SUDT',
			description: 'Simple UDT token standard for fungible tokens on CKB.',
			hashType: 'type',
			sourceUrl: RFC_0025,
			dataFormat: 'sudt',
		},
		// xUDT V1 (data1 hash type) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// xUDT V2 (type hash type, used by CCC SDK) - RFC 0052.
		'0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'type',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// NervosDAO - RFC 0024 (same as mainnet).
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			dataFormat: 'dao',
		},
		// Spore - testnet.
		'0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_DOCS,
			dataFormat: 'spore',
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
			argsFormat: 'pubkey_hash',
		},
		// SECP256K1/blake160 Multisig - RFC 0024.
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'multisig',
		},
		// Omnilock (Mirana) - RFC 0042.
		'0x9b819793a64463aed77c615d6cb226eea5487ccfc0783043a587254cda2b6f26': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			argsFormat: 'omnilock',
		},
		// Anyone-Can-Pay (Lina) - RFC 0026.
		'0xd369597ff47f29fbc0d47d2e3775370d1250b85140c670e4718af712983a2354': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			argsFormat: 'acp',
		},
	},
	testnet: {
		// SECP256K1/blake160 - RFC 0024 (same as mainnet).
		'0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8': {
			name: 'SECP256K1/blake160',
			description: 'Default lock script using secp256k1 signature verification.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'pubkey_hash',
		},
		// SECP256K1/blake160 Multisig - RFC 0024 (same as mainnet).
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'multisig',
		},
		// Omnilock (Pudge) - RFC 0042.
		'0xf329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			argsFormat: 'omnilock',
		},
		// Anyone-Can-Pay (Aggron) - RFC 0026.
		'0x3419a1c09eb2567f6552ee7a8ecffd64155cffe0f1796e6e61ec088d740c1356': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			argsFormat: 'acp',
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
			sourceUrl: ICKB_DOCS,
			dataFormat: 'xudt',
			baseTypeName: 'xUDT',
		},
	},
	testnet: {
		// Add testnet-specific tokens here.
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
function toRegistryNetwork(network: NetworkType): RegistryNetwork {
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
