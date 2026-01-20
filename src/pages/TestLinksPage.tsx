/**
 * Test links page organized by page type for QA testing.
 * Access via /test~links (hidden from navigation).
 *
 * Structure:
 * - Each section corresponds to a page in the explorer
 * - Test cases focus on boundary conditions and diversity
 * - Data sourced from mainnet PostgreSQL Rich Indexer queries
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

const TEST_SECTIONS: TestLinkSection[] = [
	// ═══════════════════════════════════════════════════════════════════════════
	// HOMEPAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'HomePage',
		description: 'Search functionality tests.',
		links: [
			{
				label: 'Home Page',
				path: '/',
				description: 'Main landing page with search box.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// BLOCK PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'BlockPage - Transaction Count',
		description: 'Blocks with varying transaction counts for pagination and layout testing.',
		links: [
			{
				label: 'Minimal (2 txs)',
				path: '/block/11516254',
				description: 'Block with only 2 transactions.',
			},
			{
				label: 'Low (5 txs)',
				path: '/block/8281932',
				description: 'Block with 5 transactions.',
			},
			{
				label: 'Medium (52 txs)',
				path: '/block/6555581',
				description: 'Block with moderate transaction count.',
			},
			{
				label: 'Medium-High (96 txs)',
				path: '/block/11986595',
				description: 'Block with ~100 transactions.',
			},
			{
				label: 'High (1,501 txs)',
				path: '/block/1279403',
				description: 'Second-highest tx count on mainnet.',
			},
			{
				label: 'Highest (1,517 txs)',
				path: '/block/1279281',
				description: 'Block with most transactions on mainnet.',
			},
		],
	},
	{
		title: 'BlockPage - Special Blocks',
		description: 'Notable blocks for specific testing scenarios.',
		links: [
			{
				label: 'Genesis (Block 0)',
				path: '/block/0',
				description: '671-output cellbase, system cells.',
			},
			{
				label: 'First Halving (8,760,000)',
				path: '/block/8760000',
				description: 'First block reward halving.',
			},
			{
				label: 'Second Halving (17,520,000)',
				path: '/block/17520000',
				description: 'Second block reward halving.',
			},
			{
				label: 'Block with 2 Uncles',
				path: '/block/8454',
				description: 'Early block with 2 uncle blocks.',
			},
			{
				label: 'Block by Hash',
				path: '/block/0x10898dd0307ef95e9086794ae7070d2f960725d1dd1e0800044eb8d8b2547da6',
				description: 'Block 5,000,000 loaded via hash lookup.',
			},
		],
	},
	{
		title: 'BlockPage - Diverse Type Scripts',
		description: 'Blocks with many different type scripts for filter testing.',
		links: [
			{
				label: '9 Type Scripts (18 txs)',
				path: '/block/8255746',
				description: 'Most diverse block: 9 distinct type script code hashes.',
			},
			{
				label: '9 Type Scripts (12 txs)',
				path: '/block/6793910',
				description: 'High diversity with moderate tx count.',
			},
			{
				label: '8 Type Scripts (27 txs)',
				path: '/block/8308875',
				description: 'Good diversity with more transactions.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTION PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'TransactionPage - Input/Output Count',
		description: 'Transactions with varying I/O counts for layout and scrolling tests.',
		links: [
			{
				label: '1 In / 1 Out',
				path: '/tx/0x4eb50cf4c0bcb1ebdc0673d73882904fd70716343bbe41397a5b469637bf0836',
				description: 'Simplest possible transfer.',
			},
			{
				label: '11 In / 11 Out',
				path: '/tx/0x9489a69fca40cf5f875fb65d4bf847e8d8cfa42cdc9626cf50392e5dbd5c52e1',
				description: 'Balanced medium count.',
			},
			{
				label: '49 In / 11 Out',
				path: '/tx/0x6fc3c73e60d597b17ebd8936a25b12861226e47a7a03a825c0b570909dc0fdfd',
				description: 'More inputs than outputs.',
			},
			{
				label: '1 In / 4,445 Out',
				path: '/tx/0x54e8a9f8201aac8f09ee8c052ecaa9953f418aa00dab6bb068a336f59d9b6913',
				description: 'Most outputs on mainnet (extreme distribution).',
			},
			{
				label: '10,796 In / ? Out',
				path: '/tx/0xa32a4d0ce6114bbeb19d2004cb69a5a7aa681506d53f58ead31b6aee39db1a76',
				description: 'Most inputs on mainnet (extreme consolidation).',
			},
			{
				label: '9,797 In / 1 Out',
				path: '/tx/0xbefd2962a484a76a397217f415bfcf39a8989b85184286497444cc5e84f6d422',
				description: 'Highest consolidation ratio.',
			},
		],
	},
	{
		title: 'TransactionPage - Special Types',
		description: 'Transactions with specific characteristics.',
		links: [
			{
				label: 'Genesis Cellbase',
				path: '/tx/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c',
				description: '671 outputs, initial token distribution.',
			},
			{
				label: 'DAO Deposit',
				path: '/tx/0xb3fc425cff2afad51974b93cac86a68d0643a48c7a95ed25cabda8546ebba386',
				description: 'NervosDAO deposit (8 zero bytes in data).',
			},
			{
				label: 'DAO Withdrawal',
				path: '/tx/0x7154c922883d6b9ea030539e81b4d126a32081dfe35c08ff7c380b97d3853d57',
				description: 'NervosDAO withdrawal phase 1.',
			},
			{
				label: 'DAO Claim',
				path: '/tx/0x0cff41877312bb6a7f69924e5feab9b5e139aebd4a4d329cc719cc3311699d5f',
				description: 'NervosDAO claim phase 2.',
			},
			{
				label: 'First xUDT',
				path: '/tx/0x14b69894e2896511d09eb95d4774c7c3798178c2210e147384f64b45d41e72a4',
				description: 'First Extensible UDT token transaction.',
			},
			{
				label: 'First Spore NFT',
				path: '/tx/0x86e722258c098a01fb68a443e0059f592948063c104c5e3ca59b68ba7a278cb5',
				description: 'First Spore on-chain NFT.',
			},
		],
	},
	{
		title: 'TransactionPage - Lock Scripts',
		description: 'Transactions with different lock script types.',
		links: [
			{
				label: 'First Multisig',
				path: '/tx/0x3157a751abe77c9d9d68efc9ec4d6802564fa466de4f61874fdd6d26e0d8b501',
				description: 'First multisig lock (Block 316).',
			},
			{
				label: 'First Omnilock V1',
				path: '/tx/0xa908bc6113ebfcb8807ac039898012f1470dc27c0d55207ef91addc484f3a37a',
				description: 'First Omnilock V1 (Block 7,469,392).',
			},
			{
				label: 'First Omnilock V2',
				path: '/tx/0xe335e32a8f22a9bcb15606df5d86ba0dee75c2ecbb93e326265ca3fcb424c464',
				description: 'First Omnilock V2 (Block 11,745,486).',
			},
			{
				label: 'First JoyID',
				path: '/tx/0xa8dcc951038956ef081829bf368682a742448a97c1cca776077c5ec370be629e',
				description: 'First JoyID WebAuthn (Block 11,133,012).',
			},
			{
				label: 'First RGB++',
				path: '/tx/0xbcb58b6f827dcb09889325a49497ab3a1b12fcc3ee877d8ee25894d2c3d9e2c8',
				description: 'First RGB++ Bitcoin-binding lock.',
			},
		],
	},
	{
		title: 'TransactionPage - Witnesses & Deps',
		description: 'Transactions with extreme witness/dependency counts.',
		links: [
			{
				label: 'Large Witnesses (488 KB)',
				path: '/tx/0x0c3fabf0962e474cbe46a25055d935cb73f5d94e7351b4e0aaecb5181bbad842',
				description: 'Largest witness data on mainnet.',
			},
			{
				label: 'Small Witnesses (20 bytes)',
				path: '/tx/0x1b1d256022ab5f78561357794edbe5d50cdd31d27b9b080fe3ac103a6d6fb173',
				description: 'Minimal witness data.',
			},
			{
				label: 'Most Cell Deps (31)',
				path: '/tx/0x045cd60859f9cdd1a882eb6d66f12e46c832d1559a464c16a1d10cf548704f0e',
				description: 'Complex multi-contract interaction.',
			},
			{
				label: 'Most Header Deps (62)',
				path: '/tx/0x206235bfeca9f2fe219ddb8e21aeac7042ec437f05718d35199cf138c8150465',
				description: 'Batch DAO withdrawal (62 deposits).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELL PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'CellPage - Data Size',
		description: 'Cells with varying data sizes.',
		links: [
			{
				label: 'Empty Data (0 bytes)',
				path: '/cell/0x1a3555b3dd1e43612b386c95791c85249cdcd4b2f9612a3ea55751260894bf5c/0',
				description: 'Cell with no data field.',
			},
			{
				label: 'Small Data (8 bytes)',
				path: '/cell/0xd1973b80357054fccee20ad558361aa6dedcf1cf115dd8082305a71d5592acba/0',
				description: 'Common DAO cell data size.',
			},
			{
				label: 'Large Data (1 MB)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/3',
				description: 'secp256k1_data precomputed curve data.',
			},
			{
				label: 'Large Data (424 KB)',
				path: '/cell/0xe0b8d96c3a5936c1e624ad14a0c2e48844434a40a40c721d1b02a08dd7ea85b3/0',
				description: 'Second largest data cell.',
			},
		],
	},
	{
		title: 'CellPage - Capacity',
		description: 'Cells with interesting capacity values.',
		links: [
			{
				label: 'Minimum (61 CKB)',
				path: '/cell/0xaa70f42697eb4b5542fd59f42259c15e2af9259b227447132c5cadcb7144b242/0',
				description: 'Smallest valid cell capacity.',
			},
			{
				label: 'Exactly 100 CKB',
				path: '/cell/0xb9d640ca223a7101d1c3f2adb961e27cecf3ae0b3eb567f58610ab8be950f06a/0',
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
	{
		title: 'CellPage - Script Types',
		description: 'Cells with different script configurations.',
		links: [
			{
				label: 'Lock Only (No Type)',
				path: '/cell/0xa059d7a9950fc9f48dc49443556efccef1d683d8b4b2ad2666b27ad097084999/0',
				description: 'Simple CKB transfer cell.',
			},
			{
				label: 'Lock + Type (xUDT)',
				path: '/cell/0x769ad3108160156bf1491cf9c63f6c8f846fcffd97171b4fcdf2e097db51e803/0',
				description: 'JoyID lock + xUDT type.',
			},
			{
				label: 'Dep Group',
				path: '/cell/0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c/0',
				description: 'SECP256K1 dep group cell.',
			},
			{
				label: 'NervosDAO Type',
				path: '/cell/0x1fdfec93d515009759b6c0a029775143bdeaa9b9883216fc82589cc53e17c195/0',
				description: 'Live DAO deposit cell.',
			},
			{
				label: 'Long Args (483 bytes)',
				path: '/cell/0x2a030ba80450db3494083804eda5a329abe776de13a532c08a0d5749433e18f8/3',
				description: 'JoyID with complex config.',
			},
		],
	},
	{
		title: 'CellPage - Lifecycle',
		description: 'Cells with various lifespans for status testing.',
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
				label: 'Still Live (Genesis)',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/0',
				description: '18M+ blocks old, still live.',
			},
			{
				label: 'Long-Lived Consumed',
				path: '/cell/0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c/328',
				description: 'Block 0 → Block 14,687,023.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ADDRESS PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'AddressPage - Cell Count',
		description: 'Addresses with varying cell counts for balance and overview testing.',
		links: [
			{
				label: 'Low (135 cells, all live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtdp905lnffy3wluln5d0kykvwpvkqc49snupflt',
				description: 'Small address, 100% live cells.',
			},
			{
				label: 'Low (454 cells, 15 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwy0afd94twmcld7puv7ef5vsh6az42wugpe9ldu',
				description: 'Small address, mostly consumed.',
			},
			{
				label: 'Medium (3K cells, 590 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqf8rcw8808636kjkr96wrwa4r35ku2s8fcflupsu',
				description: 'Medium address, ~20% live.',
			},
			{
				label: 'Medium-High (4.8K cells, 2.9K live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz',
				description: 'Higher cell count, ~60% live.',
			},
			{
				label: 'All Consumed (2.1K cells, 0 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfju5pxahqlv2ze2wtuu06q27n49vumv5gzyr3tg',
				description: 'Zero balance, all cells consumed.',
			},
		],
	},
	{
		title: 'AddressPage - Lock Types',
		description: 'Addresses with different lock script types.',
		links: [
			{
				label: 'SECP256K1 (Standard)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz',
				description: 'Default CKB address format.',
			},
			{
				label: 'Omnilock V2',
				path: '/address/ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgpf0hefv3rzsgnkynr8gl38vp3pn5qafuzqq593rr6',
				description: 'Universal lock with cross-chain support.',
			},
			{
				label: 'JoyID (11 type scripts)',
				path: '/address/ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqqxxgyfqx3sqtc3mqua500yf7ddaudpwytqeht6mu',
				description: 'WebAuthn lock with diverse token types.',
			},
		],
	},
	{
		title: 'AddressPage - Diverse Types',
		description: 'Addresses with many different type scripts for filter testing.',
		links: [
			{
				label: 'JoyID (11 types, 391 cells)',
				path: '/address/ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqqxxgyfqx3sqtc3mqua500yf7ddaudpwytqeht6mu',
				description: 'xUDT, Spore, Spore Cluster, +8 more types.',
			},
			{
				label: 'JoyID with DAO (5 types)',
				path: '/address/ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqq9lxzgq26yc4uwu82wam9hxs7zrdvmtr6q9c4p6t',
				description: '163 cells including NervosDAO.',
			},
			{
				label: 'Omnilock with DAO (4 types)',
				path: '/address/ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgyzvw53zdmxggv9p8fdrweamzcju2xy542qq8ew5se',
				description: '12 cells, 7 DAO cells.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// TRANSACTIONS FOR ADDRESS PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'TransactionsForAddressPage',
		description: 'Address transaction list with pagination testing.',
		links: [
			{
				label: 'Low Activity',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtdp905lnffy3wluln5d0kykvwpvkqc49snupflt/transactions',
				description: '~135 transactions, minimal pagination.',
			},
			{
				label: 'Medium Activity',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqf8rcw8808636kjkr96wrwa4r35ku2s8fcflupsu/transactions',
				description: '~3K transactions, moderate pagination.',
			},
			{
				label: 'High Activity',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz/transactions',
				description: '~4.8K transactions, extensive pagination.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// CELLS FOR ADDRESS PAGE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'CellsForAddressPage - Cell Count',
		description: 'Address cell list with pagination and filter testing.',
		links: [
			{
				label: 'Low (135 cells, all live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtdp905lnffy3wluln5d0kykvwpvkqc49snupflt/cells',
				description: 'Small cell list, live filter shows all.',
			},
			{
				label: 'Medium (3K cells, 590 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqf8rcw8808636kjkr96wrwa4r35ku2s8fcflupsu/cells',
				description: 'Moderate list, test live vs consumed filters.',
			},
			{
				label: 'High (4.8K cells, 2.9K live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz/cells',
				description: 'Large cell list, extensive pagination.',
			},
			{
				label: 'All Consumed (2.1K cells, 0 live)',
				path: '/address/ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfju5pxahqlv2ze2wtuu06q27n49vumv5gzyr3tg/cells',
				description: 'No live cells, live filter shows empty.',
			},
		],
	},
	{
		title: 'CellsForAddressPage - Type Diversity',
		description: 'Address cells with diverse type scripts for filter testing.',
		links: [
			{
				label: '11 Type Scripts',
				path: '/address/ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqqxxgyfqx3sqtc3mqua500yf7ddaudpwytqeht6mu/cells',
				description: 'xUDT (235), Spore (78), +9 more types.',
			},
			{
				label: 'With NervosDAO',
				path: '/address/ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqq9lxzgq26yc4uwu82wam9hxs7zrdvmtr6q9c4p6t/cells',
				description: 'DAO cells mixed with other types.',
			},
			{
				label: 'Omnilock with DAO',
				path: '/address/ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgyzvw53zdmxggv9p8fdrweamzcju2xy542qq8ew5se/cells',
				description: '7 DAO cells, 4 type script varieties.',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// ARCHIVE MODE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Archive - Cell Lifecycle',
		description: 'Query cells at different historical heights to verify status changes.',
		links: [
			{
				label: 'Before Creation (351,573)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351573',
				description: 'Cell does not exist yet.',
			},
			{
				label: 'At Creation (351,574)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351574',
				description: 'Cell is Live.',
			},
			{
				label: 'At Consumption (351,575)',
				path: '/cell/0x9882682987c9e3683bc9f824bbd27ff7aeb861023d46e4a2b7627d0d2dbfd710/0?height=351575',
				description: 'Cell is Dead (1-block lifespan).',
			},
		],
	},
	{
		title: 'Archive - Address Balance',
		description: 'Track address balance changes over time.',
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
				label: 'Peak Balance (453,897)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=453897',
				description: 'Balance: ~1,609 CKB (13 cells).',
			},
			{
				label: 'After All Spent (3,726,964)',
				path: '/address/ckb1qyqt05xa00g4rgw2jtkp5ez9ffq7u7ucuggsr39vfn?height=3726964',
				description: 'Balance: 0 CKB (all consumed).',
			},
		],
	},
	{
		title: 'Archive - DAO Lifecycle',
		description: 'Track DAO deposit through withdrawal to claim.',
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
				label: 'At Claim (18,369,800)',
				path: '/cell/0xa144941322dd72bf67e73120aac1e8ab159833fa4a0e982beda7f0c462dd4c6b/0?height=18369800',
				description: 'Withdrawal cell consumed (claimed).',
			},
		],
	},
	// ═══════════════════════════════════════════════════════════════════════════
	// OTHER PAGES
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Other Pages',
		description: 'Miscellaneous pages for testing.',
		links: [
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
	// ERROR HANDLING
	// ═══════════════════════════════════════════════════════════════════════════
	{
		title: 'Error Handling',
		description: 'Invalid inputs for error state testing.',
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
		],
	},
];

export function TestLinksPage() {
	const totalLinks = TEST_SECTIONS.reduce((acc, s) => acc + s.links.length, 0);

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
					{totalLinks} links in {TEST_SECTIONS.length} sections organized by page type.
				</p>
			</div>

			{/* Table of contents. */}
			<div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sections</h2>
				<div className="flex flex-col">
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
