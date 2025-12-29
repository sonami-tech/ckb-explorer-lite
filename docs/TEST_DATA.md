# Test Data

Specific test data for manual QA on mainnet archive node. Requires archive node synced to at least block 18,100,000.

## Cells

### Live Cells

| Name | OutPoint | Lock | Type | Verify |
|------|----------|------|------|--------|
| Dep Group (SECP256K1) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:0` | Genesis | None | Always live, dep_group decoding |
| Dep Group (Multisig) | `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:1` | Genesis | None | Always live, dep_group decoding |
| DAO Deposit | `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b:0` | SECP256K1 | NervosDAO | Live, DAO data decoding (8 bytes) |
| iCKB Token | `0xee0a59258225f667a711e50effad4134e2e1aa3e49c79ea3a93ed0e0a5248416:0` | Omnilock V2 | xUDT | Live, xUDT data decoding, iCKB badge |

### Dead Cells

| Name | OutPoint | Created | Consumed | Verify |
|------|----------|---------|----------|--------|
| Short-lived | `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9:0` | 18,013,850 | 18,013,852 | Dead status, Omnilock V1 lock |
| DAO Withdraw | `0xeb85894deadd67471d42b0944bba54ed97fcaff5114a1b41dffcaadc3e2b08a9:0` | 558 | 11,174 | Dead status, DAO consumed |
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

Derived from SECP256K1_BLAKE160 lock script. Use Cell Page to find address from any output.

| Name | Lock Args | Live Cells | Use Case |
|------|-----------|------------|----------|
| Small | `0x3f2a10480bc2ad93987f1a84d2f25b6aad9a5e48` | ~280 | Basic address, pagination |
| Balanced | `0x0728a7c0229d688ebe53a243bc21df9098bb170e` | ~2,800 | Many cells, balance display |
| All Consumed | `0xdde7801c073dfb3464c7b1f05b806bb2bbb84e99` | 0 | Zero balance, historical only |

To get full address: Navigate to any cell with this lock, copy address from Cell Page.

## Blocks

| Block | Use Case | Verify |
|-------|----------|--------|
| 0 | Genesis | Single cellbase tx, epoch 0 |
| 64 | Early block with DAO | Contains DAO deposit tx |
| 5,000,000 | Mid-chain | Multiple transactions |
| 8,760,000 | First halving | Epoch boundary |
| 18,013,850 | Test cell creation | Contains short-lived cell |

## Transactions

| Transaction Hash | Type | Verify |
|------------------|------|--------|
| `0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c` | Genesis cellbase | Single output, system cells |
| `0x82f18d6dd30acd5aaf74737852cb020a38beaa481d21013344f597a2f5c4e7d9` | Regular transfer | Omnilock V1 output |
| `0x82def095dfe9227e373a3e03e71f582537b81576558f6a91b4b3eb65d7273d1b` | DAO deposit | NervosDAO type script output |

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
