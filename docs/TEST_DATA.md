# Test Data

Test data for manual QA on the mainnet archive node.

## Home Page

| Test | Archive Height | Verify |
|------|----------------|--------|
| Current state | None | Stats update, blocks/txs load |
| Genesis | 0 | Single block displayed, no transactions |
| Historical | 1,000,000 | Time slider position, @ Block label |
| Near tip | Tip - 5 | Warning if exceeds tip |

## Block Page

| Test | Input | Verify |
|------|-------|--------|
| Genesis block | `/block/0` | Block details, single cellbase tx |
| By number | `/block/1000000` | Block loads correctly |
| By hash | `/block/0x...` (copy hash from block page) | Same block loads |
| Block with many txs | `/block/5000000` | Transaction list, pagination |

## Transaction Page

| Test | Transaction Hash | Verify |
|------|------------------|--------|
| Cellbase | First tx in any block | Cellbase badge, single output |
| Regular transfer | Find from block page | Inputs, outputs, status badge |
| Many inputs/outputs | Consolidation tx | Scrollable lists |

## Address Page

| Test | Address | Archive Height | Verify |
|------|---------|----------------|--------|
| Active address | Any address from recent tx output | None | Balance, live cells |
| Historical balance | Same address | Earlier height | Different balance/cells |
| Empty address | Generate new address | None | Zero balance, no cells |
| Legacy format | `ckb1qyq...` (short) | None | Error or deprecation warning |

## Cell Page

| Test | OutPoint | Archive Height | Verify |
|------|----------|----------------|--------|
| Live cell | Recent tx output | None | Live status, data display |
| Dead cell | Spent output | None | Dead status, consumed info |
| Historical live | Now-dead cell | Before consumption | Live status at that height |
| Cell with type script | DAO or SUDT cell | Appropriate height | Type script section, decoded data |
| Cell with data | Cell containing hex data | None | Data display, byte count |

## Archive Mode

| Test | Action | Verify |
|------|--------|--------|
| Set height via slider | Drag slider | URL updates, @ Block labels appear |
| Set height via input | Click block number, type value | Navigation works |
| Height persists | Navigate between pages | Height stays in URL |
| Clear height | Click "Latest" or clear input | Returns to current state |
| Invalid height | Set height > tip | Warning displayed |

## Edge Cases

| Test | Scenario | Verify |
|------|----------|--------|
| Large block number | Height with commas (14,520,000) | Formatting correct |
| Long cell data | Cell with >1KB data | Truncation, byte count |
| Many cells | Address with 100+ cells | Pagination works |
| Network switch | Change network in selector | Data reloads, cache clears |

## Finding Test Data

To find specific test cases on your archive node:

```bash
# Get current tip.
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"get_tip_header","params":[],"id":1}' \
  http://127.0.0.1:8114 | jq '.result.number'

# Get block with transactions.
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"get_block_by_number","params":["0x4c4b40"],"id":1}' \
  http://127.0.0.1:8114 | jq '.result.transactions | length'
```

## Known Mainnet Data

These values are stable references on mainnet:

| Item | Value | Notes |
|------|-------|-------|
| Genesis block | 0 | Single cellbase tx |
| First halving | 8,760,000 | Nov 2023 |
| DAO code hash | `0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e` | For finding DAO cells |
| SUDT code hash | `0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5` | For finding token cells |
