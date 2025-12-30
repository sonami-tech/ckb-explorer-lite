# Test Data

Specific test data for manual QA on mainnet archive node. Requires archive node synced to at least block 18,100,000.

## Cells

### Live Cells

| Name | OutPoint | Lock | Type | Verify |
|------|----------|------|------|--------|
| Dep Group (SECP256K1) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:0` | Genesis | None | Always live, dep_group decoding |
| Dep Group (Multisig) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:1` | Genesis | None | Always live, dep_group decoding |
| Genesis Data | `0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c:0` | Genesis | None | Raw data display without type script |
| DAO Deposit | `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b:0` | SECP256K1 | NervosDAO | Live, DAO data decoding (8 bytes) |
| iCKB Token | `0xee0a59258225f667a711e50effad4134e2e1aa3e49c79ea3a93ed0e0a5248416:0` | Omnilock V2 | xUDT | Live, xUDT data decoding, iCKB badge |

### Dead Cells

| Name | OutPoint | Created | Consumed | Verify |
|------|----------|---------|----------|--------|
| Short-lived | `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9:0` | 18,013,850 | 18,013,852 | Dead status, Omnilock V1 lock |
| DAO Withdraw | `0x0d62a62747493ea53ab6cbebef2a5efc6625125e9d1cb950ce01676a08ad3b16:0` | 11,174 | 290,749 | Dead status, DAO consumed |
| iCKB Spent | `0x2cbf107bbf4a3cd7a27b95f682029c8f91e5755ab1c658c606251dacd7e4022c:0` | 14,639,282 | 14,688,536 | Dead status, xUDT consumed |

### Archive Lifecycle Testing

Use cell `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9:0`:

| Archive Height | Expected Status | Verify |
|----------------|-----------------|--------|
| 18,013,849 | Unknown | Cell not created yet |
| 18,013,850 | Live | Cell just created |
| 18,013,851 | Live | Cell still live |
| 18,013,852 | Unknown | Cell consumed this block |
| None (current) | Unknown | Current state shows consumed |

## Addresses

SECP256K1_BLAKE160 addresses for testing AddressPage.

| Name | Address | Live Cells | Use Case |
|------|---------|------------|----------|
| Small | `ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqfl9ggysz7z4kfeslc6snf0ykm24kd9ujqrlxxfg` | ~280 | Basic address, pagination |
| Balanced | `ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg89znuqg5adz8tu5azgw7zrhusnza3wrs6kmfrz` | ~2,800 | Many cells, balance display |
| All Consumed | `ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwau7qpcpealv6xf3a37pdcq6ajhwuyaxgs5g955` | 0 | Zero balance, historical only |

### Omnilock Addresses

| Name | Address | Live Cells | Use Case |
|------|---------|------------|----------|
| Omnilock V2 | `ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgpf0hefv3rzsgnkynr8gl38vp3pn5qafuzqq593rr6` | 2 | Non-SECP lock display |

## Blocks

| Block | Hash | Use Case | Verify |
|-------|------|----------|--------|
| 0 | — | Genesis | Single cellbase tx, epoch 0 |
| 64 | — | Early block with DAO | Contains DAO deposit tx |
| 5,000,000 | `0x10898dd0307ef95e9086794ae7070d2f960725d1dd1e0800044eb8d8b2547da6` | Mid-chain | Multiple transactions, hash lookup |
| 8,760,000 | — | First halving | Epoch boundary |
| 18,013,850 | — | Test cell creation | Contains short-lived cell |

## Transactions

| Transaction Hash | Type | Verify |
|------------------|------|--------|
| `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c` | Genesis cellbase | Single output, system cells |
| `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9` | Regular transfer | Omnilock V1 output |
| `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b` | DAO deposit | NervosDAO type script output |
| `0x8ea92e89466c73b25cc01e6957c7bc5439fa9deaacc95ee1fd44e6c64f1451d0` | DAO withdrawal | Phase 2 withdrawal with header_deps |

### Large Input/Output Transactions (Layout Testing)

Transactions for testing scrolling lists and pagination in TransactionPage.

| Transaction Hash | Block | Inputs | Outputs | Use Case |
|------------------|-------|--------|---------|----------|
| `0xe901d2f5ca2ae6e03c265c5c135baee6db7fd1fdca120ff523d566c1fb736605` | 15,126,300 | 19 | 16 | Balanced, moderate scrolling |
| `0xffcad93138dba1e6ffb66c78f37898329dccceb1636e4677d46f3a56a2bf1b5f` | 17,050,200 | 50 | 11 | Many inputs, moderate outputs |
| `0x12f90daecec5c724cafdabde98309bb89f025c6be785f9d6d8b9d5c9556d8293` | 16,377,200 | 4,434 | 582 | Stress test, extreme counts |

## Data Decoding

| Type | Cell OutPoint | Data Format | Verify |
|------|---------------|-------------|--------|
| NervosDAO | `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b:0` | 8 bytes | Deposit/withdraw phase |
| xUDT (iCKB) | `0xee0a59258225f667a711e50effad4134e2e1aa3e49c79ea3a93ed0e0a5248416:0` | 16+ bytes | Token amount display |
| Dep Group (SECP256K1) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:0` | OutPoint vector | Lists secp256k1_data + sighash_all |
| Dep Group (Multisig) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:1` | OutPoint vector | Lists secp256k1_data + multisig_all |

## Lock Script Coverage

| Lock Type | Example Cell | Verify |
|-----------|--------------|--------|
| SECP256K1/blake160 | `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b:0` | Default lock badge |
| Omnilock V1 | `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9:0` | Omnilock badge |
| Omnilock V2 | `0xee0a59258225f667a711e50effad4134e2e1aa3e49c79ea3a93ed0e0a5248416:0` | Omnilock badge |

## Archive Mode

| Test | Height | Action | Verify |
|------|--------|--------|--------|
| Set via slider | 18,013,851 | Drag slider | URL shows `?height=18013851` |
| Set via input | 18,013,851 | Click height, type value | Page titles show "@ Block 18,013,851" |
| Persist across navigation | Any | Navigate Block → Cell → Address | Height stays in URL |
| Clear to latest | Any → None | Click "Latest" | Archive badge disappears |
| Exceed tip | Tip + 1000 | Set invalid height | Warning displayed |

## Code Hashes (Reference)

### Lock Scripts

| Name | Code Hash |
|------|-----------|
| SECP256K1/blake160 | `0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8` |
| Omnilock V2 | `0x9b819793a64463aed77c615d6cb226eea5487ccfc0783043a587254cda2b6f26` |
| Omnilock V1 | `0xa4398768d87bd17aea1361edc3accd6a0117774dc4ebc813bfa173e8ac0d086d` |

### Type Scripts

| Name | Code Hash |
|------|-----------|
| NervosDAO | `0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e` |
| xUDT | `0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95` |
| SUDT | `0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5` |

## Additional Reference

For comprehensive test data including performance benchmarks and SQL queries, see `ckb-set-block-height/TEST_DATA.md` in the parent workspace.
