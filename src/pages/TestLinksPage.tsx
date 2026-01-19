/**
 * Hidden test links page for QA and development testing.
 * Access via /test~links (hidden from navigation).
 */

import { generateLink } from '../lib/router';
import { InternalLink } from '../components/InternalLink';

interface TestLink {
	label: string;
	path: string;
	description: string;
}

interface TestLinkSection {
	title: string;
	description: string;
	links: TestLink[];
}

// Test data from docs/TEST_DATA.md, ckb-set-block-height/TEST_DATA.md, and PostgreSQL queries.
const TEST_SECTIONS: TestLinkSection[] = [
	// ═══════════════════════════════════════════════════════════════════════════
	// BLOCKS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Blocks - Notable',
		description: 'Important blocks in CKB history.',
		links: [
			{
				label: 'Genesis Block (Block 0)',
				path: '/block/0',
				description: '671-output cellbase, epoch 0, system cells created.',
			},
			{
				label: 'Block 1 (First After Genesis)',
				path: '/block/1',
				description: 'Cellbase with 0 outputs (maturation delay).',
			},
			{
				label: 'Block 11 (First Cellbase Output)',
				path: '/block/11',
				description: 'First cellbase with actual output after delay.',
			},
			{
				label: 'Block 904 (First Uncle)',
				path: '/block/904',
				description: 'First block with an uncle block.',
			},
			{
				label: 'Block 1,743 (Epoch 1 Start)',
				path: '/block/1743',
				description: 'First block of epoch 1.',
			},
			{
				label: 'Block 8,760,000 (First Halving)',
				path: '/block/8760000',
				description: 'First block reward halving.',
			},
			{
				label: 'Block 17,520,000 (Second Halving)',
				path: '/block/17520000',
				description: 'Second block reward halving.',
			},
			{
				label: 'Block by Hash (5M)',
				path: '/block/0x10898dd0307ef95e9086794ae7070d2f960725d1dd1e0800044eb8d8b2547da6',
				description: 'Block 5,000,000 loaded via hash lookup.',
			},
		],
	},
	{
		title: 'Blocks - Epoch Boundaries',
		description: 'Blocks at epoch starts and ends for testing epoch display.',
		links: [
			{
				label: 'Epoch 10 Start (Block 16,753)',
				path: '/block/16753',
				description: 'First block of epoch 10.',
			},
			{
				label: 'Epoch 10 End (Block 18,512)',
				path: '/block/18512',
				description: 'Last block of epoch 10.',
			},
			{
				label: 'Epoch 100 Start (Block 160,560)',
				path: '/block/160560',
				description: 'First block of epoch 100.',
			},
			{
				label: 'Epoch 1000 Start (Block 1,640,474)',
				path: '/block/1640474',
				description: 'First block of epoch 1000.',
			},
			{
				label: 'Short Epoch (300 blocks)',
				path: '/block/2198679',
				description: 'Block in shortest epoch (fast mining period).',
			},
		],
	},
	{
		title: 'Blocks - Stress Test',
		description: 'Blocks with extreme characteristics.',
		links: [
			{
				label: 'Most Transactions (1,517 txs)',
				path: '/block/1279281',
				description: 'Block with most transactions on mainnet.',
			},
			{
				label: 'Second Most Txs (1,501 txs)',
				path: '/block/1279403',
				description: 'Another high-tx block.',
			},
			{
				label: 'Two Uncles',
				path: '/block/8454',
				description: 'Early block with 2 uncle blocks.',
			},
			{
				label: 'Minimal Block (2 txs)',
				path: '/block/14',
				description: 'Very early block with only 2 transactions.',
			},
			{
				label: 'Highest Fees Block',
				path: '/block/18276104',
				description: 'Cellbase collected 457,112 CKB in fees.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - BASIC
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - Basic Types',
		description: 'Common transaction types.',
		links: [
			{
				label: 'Genesis Cellbase (671 outputs)',
				path: '/tx/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c',
				description: 'Initial token distribution, 33.6B CKB.',
			},
			{
				label: 'Genesis Second Tx',
				path: '/tx/0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c',
				description: 'First non-cellbase tx, creates dep groups.',
			},
			{
				label: 'First Halving Cellbase',
				path: '/tx/0x5022543bb5f9929b85a90c091baef01c24672db58712ad3e4110467a18be5454',
				description: 'Block 8,760,000 cellbase (1,432 CKB).',
			},
			{
				label: 'Second Halving Cellbase',
				path: '/tx/0xd8286a8a49bcbff97a04d343c5c02d86938a1a3d707d56f4a871aa5e6feec926',
				description: 'Block 17,520,000 cellbase (774 CKB).',
			},
			{
				label: 'Minimum Capacity Cellbase',
				path: '/tx/0xdc0640247637708e50d20e9895f9a0e95baa25aee4ac4c9b415fef29fb1aad65',
				description: 'Lowest capacity: 560 CKB (base reward only).',
			},
		],
	},
	{
		title: 'Transactions - Simple Patterns',
		description: 'Transactions with simple input/output patterns.',
		links: [
			{
				label: '1 Input, 1 Output',
				path: '/tx/0x4eb50cf4c0bcb1ebdc0673d73882904fd70716343bbe41397a5b469637bf0836',
				description: 'Simplest possible transfer.',
			},
			{
				label: '2 Inputs, 2 Outputs (Swap)',
				path: '/tx/0x9216d991bda00f3bb9aecf16b343d0d159213491330ff83b964a1c48a8506560',
				description: 'Common atomic swap pattern.',
			},
			{
				label: '1 Output Only (Non-cellbase)',
				path: '/tx/0x84c60b77e1b0b295508a164b92f98de2a3ae879d9e2c7700f27de0844662f16c',
				description: 'Transaction with minimum outputs.',
			},
			{
				label: 'Equal I/O (1,555 each)',
				path: '/tx/0xf3e8122f79d0a180d9e656c847f559a03e43f70602de4381b1ff486c538927bb',
				description: 'Balanced high-count transaction.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - LOCK SCRIPTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - By Lock Script',
		description: 'First transactions for each lock script type.',
		links: [
			{
				label: 'Multisig (Block 316)',
				path: '/tx/0x3157a751abe77c9d9d68efc9ec4d6802564fa466de4f61874fdd6d26e0d8b501',
				description: 'First multisig lock. 1.37M cells total.',
			},
			{
				label: 'PW Lock (Block 2,418,754)',
				path: '/tx/0xba09d299b50cd6fb14e680bfd66a312fc42a0a11a99aa50ea9c01b3737573cde',
				description: 'First PW Lock (deprecated Ethereum auth).',
			},
			{
				label: 'Anyone-Can-Pay (Block 3,325,317)',
				path: '/tx/0x752cbe69ff890ca5ce97ae7d8c11fbc2e9cfc9d55d0934fcd0e9d2934f9a321b',
				description: 'First ACP lock. 7,353 cells total.',
			},
			{
				label: 'Cheque Lock (Atomic Swap)',
				path: '/tx/0x88a8ff39e9b6764ceb657c06a9f84f3b59b64e75ec37c6fde272a41faa43ac44',
				description: 'Atomic swap lock. Only 25 cells ever.',
			},
			{
				label: 'Omnilock V1 (Block 7,469,392)',
				path: '/tx/0xa908bc6113ebfcb8807ac039898012f1470dc27c0d55207ef91addc484f3a37a',
				description: 'First Omnilock V1 transaction.',
			},
			{
				label: 'JoyID (Block 11,133,012)',
				path: '/tx/0xa8dcc951038956ef081829bf368682a742448a97c1cca776077c5ec370be629e',
				description: 'First JoyID WebAuthn. 77K cells, 483-byte args.',
			},
			{
				label: 'Omnilock V2 (Block 11,745,486)',
				path: '/tx/0xe335e32a8f22a9bcb15606df5d86ba0dee75c2ecbb93e326265ca3fcb424c464',
				description: 'First Omnilock V2 transaction.',
			},
			{
				label: 'RGB++ Lock (Block 12,590,566)',
				path: '/tx/0xbcb58b6f827dcb09889325a49497ab3a1b12fcc3ee877d8ee25894d2c3d9e2c8',
				description: 'First RGB++ Bitcoin-binding lock.',
			},
			{
				label: 'BTC Time Lock (Block 12,599,969)',
				path: '/tx/0x33c7c3e4bde2edc269a7a75ad027cf38ad3eff90bd576a0e738588b4d82dbe95',
				description: 'First BTC Time Lock for RGB++.',
			},
			{
				label: 'Nostr Lock (Block 13,531,363)',
				path: '/tx/0x40b613ff39aa4a32f30ee8c8470254d227883817902a673d21d6bf28a54a20fe',
				description: 'First Nostr protocol lock.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - TYPE SCRIPTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - By Type Script',
		description: 'First transactions for each type script.',
		links: [
			{
				label: 'NervosDAO Deposit',
				path: '/tx/0xb3fc425cff2afad51974b93cac86a68d0643a48c7a95ed25cabda8546ebba386',
				description: 'DAO deposit (8 zero bytes in data).',
			},
			{
				label: 'NervosDAO Withdrawal',
				path: '/tx/0x7154c922883d6b9ea030539e81b4d126a32081dfe35c08ff7c380b97d3853d57',
				description: 'DAO withdrawal phase 1.',
			},
			{
				label: 'NervosDAO Claim',
				path: '/tx/0x0cff41877312bb6a7f69924e5feab9b5e139aebd4a4d329cc719cc3311699d5f',
				description: 'DAO claim phase 2.',
			},
			{
				label: 'SUDT (Block 2,627,186)',
				path: '/tx/0x8f73464da2f0a79ae434d22edaff4b9b161e9912231d4453d0a00ca41a93ebc9',
				description: 'First Simple UDT. 138K outputs.',
			},
			{
				label: 'CoTA (Block 6,559,089)',
				path: '/tx/0x8fbaf273ef8dba10bd9f77469e26fce3240268fdfb75207459ae1cf538f50cea',
				description: 'First Compact Token Aggregator NFT.',
			},
			{
				label: 'xUDT (Block 11,979,619)',
				path: '/tx/0x14b69894e2896511d09eb95d4774c7c3798178c2210e147384f64b45d41e72a4',
				description: 'First Extensible UDT token.',
			},
			{
				label: 'Spore Cluster (Block 12,032,752)',
				path: '/tx/0x19f9bed8499a1fa5c4dce979a880be74469f237556299a8481fa9c1295476670',
				description: 'First Spore collection cluster.',
			},
			{
				label: 'Spore NFT (Block 12,043,657)',
				path: '/tx/0x86e722258c098a01fb68a443e0059f592948063c104c5e3ca59b68ba7a278cb5',
				description: 'First Spore on-chain NFT. 99K outputs.',
			},
			{
				label: 'iCKB Token (Block 14,231,253)',
				path: '/tx/0x490cd47d7491b8dcb74f22bd7607b176bf7dbe13d4cc9c2d0f50dc7208082f6d',
				description: 'First iCKB DAO liquidity token.',
			},
			{
				label: 'CKBFS (Block 16,896,675)',
				path: '/tx/0x59775e63f8ef8b3a1650fb1ddeea7801f1e7ac5d160282d3ad2c801445401b22',
				description: 'First CKBFS on-chain file storage.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - STRESS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - Layout Stress',
		description: 'Extreme transactions for testing scrolling and performance.',
		links: [
			{
				label: 'Most Inputs (10,796 in)',
				path: '/tx/0xa32a4d0ce6114bbeb19d2004cb69a5a7aa681506d53f58ead31b6aee39db1a76',
				description: 'Extreme consolidation. 87KB witnesses.',
			},
			{
				label: 'Most Outputs (4,445 out)',
				path: '/tx/0x54e8a9f8201aac8f09ee8c052ecaa9953f418aa00dab6bb068a336f59d9b6913',
				description: 'Extreme distribution from 1 input.',
			},
			{
				label: 'Highest Consolidation Ratio',
				path: '/tx/0xbefd2962a484a76a397217f415bfcf39a8989b85184286497444cc5e84f6d422',
				description: '9,797:1 input to output ratio.',
			},
			{
				label: 'Large Witnesses (488 KB)',
				path: '/tx/0x0c3fabf0962e474cbe46a25055d935cb73f5d94e7351b4e0aaecb5181bbad842',
				description: 'Largest witness data on mainnet.',
			},
			{
				label: 'Smallest Witnesses (20 bytes)',
				path: '/tx/0x1b1d256022ab5f78561357794edbe5d50cdd31d27b9b080fe3ac103a6d6fb173',
				description: 'Minimal witness data.',
			},
			{
				label: 'Most Cell Deps (31 deps)',
				path: '/tx/0x045cd60859f9cdd1a882eb6d66f12e46c832d1559a464c16a1d10cf548704f0e',
				description: 'Complex multi-contract interaction.',
			},
			{
				label: 'Most Header Deps (62 deps)',
				path: '/tx/0x206235bfeca9f2fe219ddb8e21aeac7042ec437f05718d35199cf138c8150465',
				description: 'Batch DAO withdrawal (62 deposits).',
			},
			{
				label: 'Highest Fee (5,630 CKB)',
				path: '/tx/0xaa18757c6039101eff4cf087fe34923df1e28c9176d4f4c0348083a6e7ebe470',
				description: 'Extremely high transaction fee.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - SINCE FIELD
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - Since Field',
		description: 'Transactions with various since field formats.',
		links: [
			{
				label: 'Relative Since (30-day lock)',
				path: '/tx/0xad3173c3023f99b000529b01b96fc216c1f5ad02fd417376dd5dde54714c6485',
				description: 'Since: c00000000002a300 (relative blocks).',
			},
			{
				label: 'Epoch-Based Since',
				path: '/tx/0xde61762a78259e5b37088bfdba3c167836de88b05eb8faac060c7fd515bbfefa',
				description: 'Since: 20070806b90004ae (epoch format).',
			},
			{
				label: 'Absolute Block Since',
				path: '/tx/0x2cd0db8ca7af08815411ea243fe379267239dfbeee3be73fd61d4864e56108b5',
				description: 'Since: 000000000118f0cd (block 18,411,725).',
			},
			{
				label: 'Timestamp Since',
				path: '/tx/0x0b0a98376476fdd77cb58886c47804db9083e70ae124376fe4d1c484257d55e1',
				description: 'Since: 4000000061b49ba4 (absolute time).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - HASH TYPES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - Script Hash Types',
		description: 'Transactions using different hash_type values.',
		links: [
			{
				label: 'hash_type = data (0)',
				path: '/tx/0xd77ae61b5f44d104b087e3ee92de505f3c00b89f5dc280318fec73652293ae7d',
				description: 'Original CKB method. 336 scripts total.',
			},
			{
				label: 'hash_type = data1 (2)',
				path: '/tx/0xcf92e8a41efc62ae992e888b08b22be2d0c7246ee8afea55553f78709272c316',
				description: 'CKB2021 hardfork. 690K scripts.',
			},
			{
				label: 'hash_type = data2 (4)',
				path: '/tx/0x5acdf31da990f0fd511ffc6bc2034a2d9449bca28b9160e370272c3b31682532',
				description: 'CKB2023 hardfork. Only 5 scripts exist!',
			},
			{
				label: 'First data2 Type Script',
				path: '/tx/0x472048c894b05b4e7a126eaab46dee852f656751dbdd9aeb8099981b8bfcc7e7',
				description: 'Block 16,595,732. First data2 type script.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS - FUN HASHES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Transactions - Fun Hash Patterns',
		description: 'Transactions with interesting hash patterns.',
		links: [
			{
				label: '6 Leading Zeros',
				path: '/tx/0x000000ac261b284ae75408227950216dd70e1cbb0eaf348553a04ad665c1bf60',
				description: 'Hash starts with 0x000000...',
			},
			{
				label: 'Contains "dead" and "beef"',
				path: '/tx/0x496294190dead33374238cdb77dbbeef64046b7be4205f5643159a5fb89b704e',
				description: 'Classic hex words in hash.',
			},
			{
				label: 'Contains "cafe" and "babe"',
				path: '/tx/0x5fcafe581a7471fbbabe6d270c9f36316163dba5cefcfcbf696c4f09f2ef84b3',
				description: 'More classic hex words.',
			},
			{
				label: 'Contains "888888"',
				path: '/tx/0x15ed4bd74bbad1003c654ba22888888ca9bbd2522fbdfe65949ad2ab40979dc1',
				description: '6 consecutive 8s.',
			},
			{
				label: 'Contains "aaaaaa"',
				path: '/tx/0x7f7aaaaaa7eda56a9370444b10a7d34638a409b05ab4f732e9843d6d4d457880',
				description: '6 consecutive As near start.',
			},
			{
				label: 'Contains "fffffff"',
				path: '/tx/0x5bb0ab081d5da5684e9c3fffffff855f4d7fa56711db5637871838742472b176',
				description: '7 consecutive Fs (all 1-bits).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS - SYSTEM
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Cells - System & Genesis',
		description: 'Genesis and system cells.',
		links: [
			{
				label: 'Dep Group (SECP256K1)',
				path: '/cell/0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c/0',
				description: 'Always live, dep_group data decoding.',
			},
			{
				label: 'Dep Group (Multisig)',
				path: '/cell/0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c/1',
				description: 'Always live, multisig dep_group.',
			},
			{
				label: 'SECP256K1 Lock Binary',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/1',
				description: 'Default lock script code cell.',
			},
			{
				label: 'NervosDAO Binary',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/2',
				description: 'DAO type script code cell.',
			},
			{
				label: 'secp256k1_data (1 MB)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/3',
				description: 'Precomputed curve data, largest genesis cell.',
			},
			{
				label: 'Multisig Lock Binary',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/4',
				description: 'Multisig lock script code cell.',
			},
			{
				label: 'Genesis Cell (Null Lock)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/0',
				description: 'Uses all-zeros code_hash lock.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS - DATA
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Cells - Data Edge Cases',
		description: 'Cells with various data sizes.',
		links: [
			{
				label: 'Empty Data (0 bytes)',
				path: '/cell/0x1a3555b3dd1e43612b386c95791c85249cdcd4b2f9612a3ea55751260894bf5c/0',
				description: 'Cell with no data field.',
			},
			{
				label: '1 Byte Data',
				path: '/cell/0x1e8e09b6c426f62cb3df20a67d0b8f1af8efbdd3a70d8a9256ac20468a9bf90d/0',
				description: 'Smallest non-empty data.',
			},
			{
				label: '8 Byte Data (DAO)',
				path: '/cell/0xd1973b80357054fccee20ad558361aa6dedcf1cf115dd8082305a71d5592acba/0',
				description: 'Common DAO cell data size.',
			},
			{
				label: 'Large Data (584 KB)',
				path: '/cell/0x9224d27ea0e2f56f26a801b33c1129ec8902efc36fd6bcb991be6e0fa8aea304/0',
				description: 'Very large data payload.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS - CAPACITY
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Cells - Capacity Edge Cases',
		description: 'Cells with interesting capacity values.',
		links: [
			{
				label: 'Minimum (61 CKB)',
				path: '/cell/0xaa70f42697eb4b5542fd59f42259c15e2af9259b227447132c5cadcb7144b242/0',
				description: 'Smallest valid cell capacity.',
			},
			{
				label: '62 CKB (Just Above Min)',
				path: '/cell/0x050cd75a48e06ad44f8f83f439d8c09339b738757389d8c3de5f1f7f14e71a48/1',
				description: '1 CKB above minimum.',
			},
			{
				label: 'Exactly 100 CKB',
				path: '/cell/0xb9d640ca223a7101d1c3f2adb961e27cecf3ae0b3eb567f58610ab8be950f06a/0',
				description: 'Round number capacity.',
			},
			{
				label: 'Exactly 1,000 CKB',
				path: '/cell/0x3233940b5891c56bc5edb4510dcb2dd750da8d33b09b29f236c305811bd4196b/0',
				description: 'Round number capacity.',
			},
			{
				label: 'Exactly 1,000,000 CKB',
				path: '/cell/0x8e1233793db6f1c2ea2b8be05a1b406e796208a3925e6a689b1c536842848e4b/0',
				description: 'Power of 10 capacity.',
			},
			{
				label: 'Largest Cell (9.5B CKB)',
				path: '/cell/0xcdfb772ddeda42a260ca1b29f46d9b1ddffd463e2fd67f6b66fe885c4a8ec1ac/0',
				description: 'Single largest cell on mainnet.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS - SCRIPTS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Cells - Script Edge Cases',
		description: 'Cells with interesting script configurations.',
		links: [
			{
				label: 'Lock Only (No Type)',
				path: '/cell/0xa059d7a9950fc9f48dc49443556efccef1d683d8b4b2ad2666b27ad097084999/0',
				description: 'Simple CKB transfer cell.',
			},
			{
				label: 'Both Lock and Type',
				path: '/cell/0x769ad3108160156bf1491cf9c63f6c8f846fcffd97171b4fcdf2e097db51e803/0',
				description: 'JoyID lock + xUDT type.',
			},
			{
				label: 'Empty Args (0 bytes)',
				path: '/cell/0x5cb5a246828f8743047f15a119a91eda99d59a66e6a7afa27c08b2a9bec9a25a/0',
				description: 'Script with empty args.',
			},
			{
				label: 'Longest Args (483 bytes)',
				path: '/cell/0x2a030ba80450db3494083804eda5a329abe776de13a532c08a0d5749433e18f8/3',
				description: 'JoyID with complex config.',
			},
			{
				label: 'Type Script Long Args (97 bytes)',
				path: '/cell/0x5c25b6ee4054f4a52cd6f01f02d89d67b51448d2720c032be221b914ca1d1b18/3',
				description: 'Longest type script args.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS - LIFECYCLE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Cells - Lifecycle',
		description: 'Cells with various lifespans.',
		links: [
			{
				label: 'Same-Block Consumption',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/5',
				description: 'Created and consumed in block 0.',
			},
			{
				label: '1-Block Lifespan',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0',
				description: 'Block 351,574 → 351,575.',
			},
			{
				label: 'Longest-Lived (Genesis)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/0',
				description: '18M+ blocks old, still live.',
			},
			{
				label: 'Genesis Consumed Early',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/9',
				description: 'Block 0 → Block 448.',
			},
			{
				label: 'Genesis Consumed Late',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/11',
				description: 'Block 0 → Block 9,276,099.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE TESTING - CELLS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - Cell Lifecycle (1-block)',
		description: 'Cell 0x9882... lived exactly 1 block (351,574 → 351,575).',
		links: [
			{
				label: 'Before Creation (351,573)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351573',
				description: 'Cell does not exist.',
			},
			{
				label: 'At Creation (351,574)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351574',
				description: 'Cell is Live.',
			},
			{
				label: 'At Consumption (351,575)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351575',
				description: 'Cell is Dead.',
			},
		],
	},
	{
		title: 'Archive - Genesis Cell Lifecycle',
		description: 'Genesis cell #629 consumed at block 11 (earliest consumption).',
		links: [
			{
				label: 'At Genesis (0)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/629?height=0',
				description: 'Cell is Live.',
			},
			{
				label: 'Before Consumption (10)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/629?height=10',
				description: 'Cell still Live.',
			},
			{
				label: 'At Consumption (11)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/629?height=11',
				description: 'Cell is Dead.',
			},
		],
	},
	{
		title: 'Archive - Genesis Cell (Late Consumption)',
		description: 'Genesis cell #328 consumed at block 14,687,023.',
		links: [
			{
				label: 'At Genesis (0)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/328?height=0',
				description: 'Cell is Live.',
			},
			{
				label: 'Before Consumption (14,687,022)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/328?height=14687022',
				description: 'Cell still Live after 14M blocks.',
			},
			{
				label: 'At Consumption (14,687,023)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/328?height=14687023',
				description: 'Cell is Dead.',
			},
		],
	},
	{
		title: 'Archive - SUDT Token Cell',
		description: 'SUDT cell 0x0d18... lived 3 blocks (6,307,216 → 6,307,219).',
		links: [
			{
				label: 'Before Creation (6,307,215)',
				path: '/cell/0x0d18f871a19d9aa0be246d98c17dc0c34a4469b97944ab168d9343c5fa99e7d5/2?height=6307215',
				description: 'Token cell does not exist.',
			},
			{
				label: 'At Creation (6,307,216)',
				path: '/cell/0x0d18f871a19d9aa0be246d98c17dc0c34a4469b97944ab168d9343c5fa99e7d5/2?height=6307216',
				description: 'Token cell is Live.',
			},
			{
				label: 'While Live (6,307,218)',
				path: '/cell/0x0d18f871a19d9aa0be246d98c17dc0c34a4469b97944ab168d9343c5fa99e7d5/2?height=6307218',
				description: 'Token cell still Live.',
			},
			{
				label: 'At Consumption (6,307,219)',
				path: '/cell/0x0d18f871a19d9aa0be246d98c17dc0c34a4469b97944ab168d9343c5fa99e7d5/2?height=6307219',
				description: 'Token cell is Dead.',
			},
		],
	},
	{
		title: 'Archive - xUDT Token Cell',
		description: 'xUDT cell 0x1474... lived 36 blocks (15,756,186 → 15,756,222).',
		links: [
			{
				label: 'Before Creation (15,756,185)',
				path: '/cell/0x1474d6587c8bf40838ba8d62829c46ed7f55652ddd1d9139cfa0989b7d66b242/0?height=15756185',
				description: 'Token cell does not exist.',
			},
			{
				label: 'At Creation (15,756,186)',
				path: '/cell/0x1474d6587c8bf40838ba8d62829c46ed7f55652ddd1d9139cfa0989b7d66b242/0?height=15756186',
				description: 'Token cell is Live.',
			},
			{
				label: 'At Consumption (15,756,222)',
				path: '/cell/0x1474d6587c8bf40838ba8d62829c46ed7f55652ddd1d9139cfa0989b7d66b242/0?height=15756222',
				description: 'Token cell is Dead.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE TESTING - DAO
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - DAO Withdrawal Lifecycle',
		description: 'DAO withdrawal 0xa144... (18,366,938 → 18,369,800).',
		links: [
			{
				label: 'Before Withdrawal (18,366,937)',
				path: '/cell/0xa144941322dd72bf67e73120aac1e8ab159833fa4a0e982beda7f0c462dd4c6b/0?height=18366937',
				description: 'Withdrawal cell does not exist.',
			},
			{
				label: 'At Withdrawal (18,366,938)',
				path: '/cell/0xa144941322dd72bf67e73120aac1e8ab159833fa4a0e982beda7f0c462dd4c6b/0?height=18366938',
				description: 'Withdrawal cell is Live.',
			},
			{
				label: 'Before Claim (18,369,799)',
				path: '/cell/0xa144941322dd72bf67e73120aac1e8ab159833fa4a0e982beda7f0c462dd4c6b/0?height=18369799',
				description: 'Withdrawal cell still Live.',
			},
			{
				label: 'At Claim (18,369,800)',
				path: '/cell/0xa144941322dd72bf67e73120aac1e8ab159833fa4a0e982beda7f0c462dd4c6b/0?height=18369800',
				description: 'Withdrawal cell consumed (claimed).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE TESTING - ADDRESSES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - Address Balance History',
		description: 'Address ckb1qyqt05xa00g4... balance over time.',
		links: [
			{
				label: 'Before First Deposit (10,707)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=10707',
				description: 'Balance: 0 CKB.',
			},
			{
				label: 'After First Deposit (10,708)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=10708',
				description: 'Balance: ~137 CKB.',
			},
			{
				label: 'Mid Accumulation (100,000)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=100000',
				description: 'Balance: ~702 CKB (6 cells).',
			},
			{
				label: 'Peak Balance (453,897)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=453897',
				description: 'Balance: ~1,609 CKB (13 cells).',
			},
			{
				label: 'Before Final Spend (3,726,963)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=3726963',
				description: 'Balance: ~1,609 CKB (still 13 cells).',
			},
			{
				label: 'After All Spent (3,726,964)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=3726964',
				description: 'Balance: 0 CKB (all consumed).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE TESTING - SCRIPT DEPLOYMENT
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - Before Script Existed',
		description: 'Query scripts at heights before they were deployed.',
		links: [
			{
				label: 'SUDT Before Deploy (2,627,185)',
				path: '/tx/0x8f73464da2f0a79ae434d22edaff4b9b161e9912231d4453d0a00ca41a93ebc9?height=2627185',
				description: 'First SUDT tx at 2,627,186.',
			},
			{
				label: 'JoyID Before Deploy (11,133,011)',
				path: '/tx/0xa8dcc951038956ef081829bf368682a742448a97c1cca776077c5ec370be629e?height=11133011',
				description: 'First JoyID tx at 11,133,012.',
			},
			{
				label: 'xUDT Before Deploy (11,979,618)',
				path: '/tx/0x14b69894e2896511d09eb95d4774c7c3798178c2210e147384f64b45d41e72a4?height=11979618',
				description: 'First xUDT tx at 11,979,619.',
			},
			{
				label: 'Spore Before Deploy (12,043,656)',
				path: '/tx/0x86e722258c098a01fb68a443e0059f592948063c104c5e3ca59b68ba7a278cb5?height=12043656',
				description: 'First Spore tx at 12,043,657.',
			},
			{
				label: 'RGB++ Before Deploy (12,590,565)',
				path: '/tx/0xbcb58b6f827dcb09889325a49497ab3a1b12fcc3ee877d8ee25894d2c3d9e2c8?height=12590565',
				description: 'First RGB++ tx at 12,590,566.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE TESTING - BLOCKS
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - Historical Blocks',
		description: 'Blocks at significant heights.',
		links: [
			{
				label: 'Genesis Block @ Height 0',
				path: '/block/0?height=0',
				description: 'Block 0 at height 0.',
			},
			{
				label: 'Block 1M @ Height 1M',
				path: '/block/1000000?height=1000000',
				description: 'Block at its own height.',
			},
			{
				label: 'First Halving @ Its Height',
				path: '/block/8760000?height=8760000',
				description: 'Halving block at halving height.',
			},
			{
				label: 'Second Halving @ Its Height',
				path: '/block/17520000?height=17520000',
				description: 'Second halving at its height.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ADDRESSES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Addresses - By Activity',
		description: 'Addresses with varying cell counts.',
		links: [
			{
				label: 'Small (~4,700 cells)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfl9ggysz7z4kfeslc6snf0ykm24kd9ujqrlxxfg',
				description: 'Moderate activity, ~280 live.',
			},
			{
				label: 'Balanced (~4,800 cells)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz',
				description: '60% live, good lifecycle testing.',
			},
			{
				label: 'All Consumed (0 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwau7qpcpealv6xf3a37pdcq6ajhwuyaxgs5g955',
				description: 'Zero balance, 1,000 cells consumed.',
			},
			{
				label: 'Only Receives (Never Spent)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvh5lqsd0df8gfcjel4m7a3rrnrn5lzhusczqluem',
				description: 'Script ID 971: 59 cells, 0 spent.',
			},
			{
				label: 'Only 1 Cell Ever',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtx9sszfyjs5a8ch8u47y5l6h9amxygvrq2jy9wf',
				description: 'Script ID 2: single cell, still live.',
			},
		],
	},
	{
		title: 'Addresses - By Lock Type',
		description: 'Addresses using different lock scripts.',
		links: [
			{
				label: 'SECP256K1/blake160 (Standard)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfl9ggysz7z4kfeslc6snf0ykm24kd9ujqrlxxfg',
				description: 'Default CKB address format.',
			},
			{
				label: 'Omnilock V2',
				path: '/address/ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgpf0hefv3rzsgnkynr8gl38vp3pn5qafuzqq593rr6',
				description: 'Universal lock with cross-chain.',
			},
		],
	},
	{
		title: 'Address Sub-pages',
		description: 'Address transactions and cells list pages.',
		links: [
			{
				label: 'Transactions (Small)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfl9ggysz7z4kfeslc6snf0ykm24kd9ujqrlxxfg/transactions',
				description: 'Paginated transaction list.',
			},
			{
				label: 'Cells (Small)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfl9ggysz7z4kfeslc6snf0ykm24kd9ujqrlxxfg/cells',
				description: 'Paginated cell list.',
			},
			{
				label: 'Transactions (Balanced)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz/transactions',
				description: 'Many txs, pagination stress.',
			},
			{
				label: 'Cells (Balanced)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz/cells',
				description: 'Many cells, pagination stress.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// DAO
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'NervosDAO - Lifecycle',
		description: 'DAO transactions showing the full lifecycle.',
		links: [
			{
				label: 'Longest Lock (6 months)',
				path: '/tx/0xb0cd8a873363d7526cfd3588977aaac0f6809b2e233847e13d91ae186669ee2e',
				description: 'Deposited block 10,553,956.',
			},
			{
				label: 'Shortest Lock (~180 epochs)',
				path: '/tx/0xf8a0dba4db28783a7587e3eae693b6ccb08f96e7db1222e3b66014c21dd184e3',
				description: 'Just over minimum lock period.',
			},
			{
				label: 'Recent DAO Activity',
				path: '/tx/0xd319b73684422fb9766d0cd640b1325ae823ef25dc1f79c5531b974c55071a6c',
				description: 'Most recent DAO deposit.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// OTHER
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Other Pages',
		description: 'Miscellaneous pages.',
		links: [
			{
				label: 'Home Page',
				path: '/',
				description: 'Main landing page with search.',
			},
			{
				label: 'Well-Known Resources',
				path: '/resources',
				description: 'System scripts and known cells.',
			},
			{
				label: 'Not Found (404)',
				path: '/nonexistent-page-xyz',
				description: 'Tests NotFoundPage rendering.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// EDGE CASES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Edge Cases - Invalid Inputs',
		description: 'Unusual inputs for error handling.',
		links: [
			{
				label: 'Invalid Block Number',
				path: '/block/999999999999',
				description: 'Block does not exist.',
			},
			{
				label: 'Zero Transaction Hash',
				path: '/tx/0x0000000000000000000000000000000000000000000000000000000000000000',
				description: 'Non-existent hash (all zeros).',
			},
			{
				label: 'Invalid Cell Index',
				path: '/cell/0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c/999',
				description: 'Valid tx but invalid output index.',
			},
			{
				label: 'Malformed Address',
				path: '/address/not-a-valid-address',
				description: 'Tests address validation.',
			},
			{
				label: 'Short Hash',
				path: '/tx/0x1234',
				description: 'Hash too short.',
			},
		],
	},
	{
		title: 'Edge Cases - Rare Scripts',
		description: 'Scripts used only 1-5 times on mainnet.',
		links: [
			{
				label: 'Unique Lock Script #1',
				path: '/tx/0x512d7c82800f771c3dccb55a450d8a2fbd4ae91b562606ede66707c6e8706053',
				description: 'Code hash used only once.',
			},
			{
				label: 'Unique Lock Script #2',
				path: '/tx/0x3894b4cf9c9d4b7db827bb25b50866f5731f92f8b52009fe5860cbfe29a0736e',
				description: 'Another unique code hash.',
			},
			{
				label: 'Unique Type Script',
				path: '/tx/0x21119685846bd4095806a514cd6f5bd63a73939601cf5c2eab1a780034a0de9b',
				description: 'Type script with empty args.',
			},
		],
	},
];

export function TestLinksPage() {
	return (
		<div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
			{/* Header. */}
			<div className="mb-4 sm:mb-6">
				<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
					<InternalLink href={generateLink('/')} className="hover:text-nervos">
						Home
					</InternalLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">Test Links</span>
				</nav>
				<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Test Links
				</h1>
				<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
					{TEST_SECTIONS.reduce((acc, s) => acc + s.links.length, 0)} links in {TEST_SECTIONS.length} sections.
				</p>
			</div>

			{/* Table of contents - hidden on mobile. */}
			<div className="hidden sm:block mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sections</h2>
				<div className="flex flex-wrap gap-2">
					{TEST_SECTIONS.map((section, i) => (
						<a
							key={section.title}
							href={`#section-${i}`}
							className="text-xs text-nervos hover:text-nervos-dark dark:hover:text-nervos-light"
						>
							{section.title}
						</a>
					))}
				</div>
			</div>

			{/* Sections. */}
			<div className="space-y-6 sm:space-y-8">
				{TEST_SECTIONS.map((section, i) => (
					<TestLinkSection key={section.title} section={section} index={i} />
				))}
			</div>
		</div>
	);
}

function TestLinkSection({ section, index }: { section: TestLinkSection; index: number }) {
	return (
		<div id={`section-${index}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			{/* Section header. */}
			<div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
				<h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
					{section.title}
				</h2>
				<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
					{section.description} ({section.links.length})
				</p>
			</div>

			{/* Links table. */}
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{section.links.map((link) => (
					<div key={link.path} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
						<InternalLink
							href={generateLink(link.path)}
							className="text-nervos hover:text-nervos-dark dark:hover:text-nervos-light font-medium text-sm sm:text-base"
						>
							{link.label}
						</InternalLink>
						<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
							{link.description}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
