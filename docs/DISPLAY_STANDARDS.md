# Display Standards

This document defines the standardized formats for displaying blockchain data in CKB Explorer Lite.

## Interaction Model

### Core Principle

**Text click navigates (or does nothing). Copy is only via icon.**

This provides a consistent, predictable user experience:
- Clickable text always means navigation.
- The copy icon is the only way to copy data.
- No ambiguity about what clicking will do.

### Interaction Patterns

| Element | Click Behavior | Visual Indicator |
|---------|----------------|------------------|
| Text (linkable) | Navigates to resource | Nervos color, pointer cursor |
| Text (not linkable) | Nothing | Default text color |
| Copy icon | Copies to clipboard | Two-squares icon → checkmark |
| External link | Opens new tab | Box-arrow icon (↗) |

### Data Type Behaviors

| Data Type | Text Click | Copy Icon | Notes |
|-----------|------------|-----------|-------|
| Block hash (on block page) | Nothing | Yes | Already viewing this resource. |
| Block hash (elsewhere) | → Block page | Yes | |
| Transaction hash (on tx page) | Nothing | Yes | Already viewing this resource. |
| Transaction hash (elsewhere) | → Transaction page | Yes | |
| Parent block hash | → Block page | Yes | |
| Code hash | Nothing | Yes | No dedicated page currently. |
| Address (on address page) | Nothing | Yes | Already viewing this resource. |
| Address (elsewhere) | → Address page | Yes | |
| OutPoint | → Cell or Transaction | Yes | Always has a link target. |
| Block number | → Block page | Yes | Copies without formatting. |
| Args | Nothing | Yes | |
| Raw hex data | Nothing | Yes | |

## Data Types and Formats

### 66-Character Hashes (Transaction, Block, Code Hash)

| Context | Desktop/Tablet | Mobile | Component |
|---------|----------------|--------|-----------|
| Overview sections | Full | 8...8 | `HashDisplay responsive` |
| Inline references | 8...8 | 8...8 | `HashDisplay` (default) |

**Format**: `0x` + 8 chars + `...` + 8 chars = `0x12345678...12345678`

### CKB Addresses (~95 characters)

| Context | Desktop/Tablet | Mobile | Component |
|---------|----------------|--------|-----------|
| Overview sections | Full | 8...4 | `AddressDisplay responsive` |
| Other contexts | 8...4 | 8...4 | `AddressDisplay` (default) |

**Format**: 8 chars + `...` + 4 chars = `ckb1qzda...xwsq`

### Block Numbers

| Context | Display | Copy Value | Component |
|---------|---------|------------|-----------|
| All contexts | Formatted (e.g., 12,345,678) | Unformatted (e.g., 12345678) | `BlockNumberDisplay` |

**Note**: Do not prefix block numbers with `#`. The label provides context.

### OutPoints (tx_hash:index)

| Context | Desktop/Tablet | Mobile | Component |
|---------|----------------|--------|-----------|
| All contexts | Full hash:index (CSS truncation) | Truncated hash:index | `OutPoint` |

**Format**: Hash format + `:` + decimal index = `0x12345678...12345678:0`

### Variable-Length Data (Args, Cell Data, Witnesses)

| Context | Desktop | Mobile | Component |
|---------|---------|--------|-----------|
| All contexts | First 128 chars | First 64 chars | `TruncatedData` |

**Format**: First N chars + `...` if truncated. Word break (`<wbr>`) inserted at 50% for natural wrapping.

## Responsive Behavior

Components with responsive display (full on desktop/tablet, truncated on mobile):

| Component | Prop | Default |
|-----------|------|---------|
| `HashDisplay` | `responsive={true}` | `false` |
| `AddressDisplay` | `responsive={true}` | `false` |
| `OutPoint` | CSS-based truncation | N/A |
| `TruncatedData` | Always responsive | N/A |

**Breakpoint**: 640px (Tailwind `sm`)

## Visual Indicators

### Icons

| Icon | Meaning | Usage |
|------|---------|-------|
| Two-squares (📋) | Copy to clipboard | All copyable data. |
| Checkmark (✓) | Copy confirmed | Temporary state after copy (2 seconds). |
| Box-arrow (↗) | External link | Opens new tab, leaves site. |
| Arrow right (→) | Internal navigation | Secondary navigation target when text has different destination. |

**Important**: Do not use box-arrow (↗) for internal navigation.

### Styling

| State | Text Color | Cursor |
|-------|------------|--------|
| Linkable | `text-nervos` | `cursor-pointer` |
| Linkable (hover) | `text-nervos-dark` | `cursor-pointer` |
| Not linkable | Default (`text-gray-900 dark:text-white`) | Default |

**No underline on hover.** Color change provides sufficient affordance.

### Badges

- **Status badges**: Colored based on state (committed=green, pending=yellow, etc.)
- **Type badges**: "Has Type" for outputs with type scripts.
- **dep_type badges**: "code" or "dep_group" for cell dependencies.

## Components

### HashDisplay

Displays 66-character hashes with optional truncation, copy functionality, and navigation.

```tsx
// Copy only, no link (e.g., code hash, or hash of current page)
<HashDisplay hash={hash} />

// With navigation link
<HashDisplay hash={blockHash} linkTo={`/block/${blockHash}`} />

// Full on desktop, truncated on mobile
<HashDisplay hash={hash} linkTo={url} responsive />

// Always full (no truncation)
<HashDisplay hash={hash} truncate={false} />
```

**Props:**
- `hash` - The 66-character hex string.
- `linkTo` - Optional URL. If set, text click navigates. If not, text click does nothing.
- `responsive` - Full on desktop, truncated on mobile.
- `truncate` - Enable truncation (default: true).
- `prefixLen` / `suffixLen` - Truncation lengths (default: 8/8).

### AddressDisplay

Displays CKB addresses with appropriate truncation and optional navigation.

```tsx
// Copy only, no link (e.g., on address page)
<AddressDisplay address={address} />

// With navigation link
<AddressDisplay address={address} linkTo={`/address/${address}`} />

// Full on desktop, truncated on mobile
<AddressDisplay address={address} linkTo={url} responsive />
```

**Props:**
- `address` - The CKB address string.
- `linkTo` - Optional URL. If set, text click navigates.
- `responsive` - Full on desktop, truncated on mobile.
- `truncate` - Enable truncation (default: true).

### BlockNumberDisplay

Displays block numbers with thousand separators and copy functionality.

```tsx
// Copy only, no link
<BlockNumberDisplay blockNumber={12345678} />

// With navigation link
<BlockNumberDisplay blockNumber={12345678} linkTo={`/block/12345678`} />
```

**Props:**
- `blockNumber` - The block number (number or string).
- `linkTo` - Optional URL. If set, text click navigates.

**Display**: Formatted with thousand separators (e.g., "12,345,678").
**Copy**: Raw number without formatting (e.g., "12345678").

### OutPoint

Displays transaction outpoints (tx_hash:index) with navigation and copy.

```tsx
// Navigate to cell page (default)
<OutPoint txHash={txHash} index={index} />

// Navigate to transaction page
<OutPoint txHash={txHash} index={index} linkTo="transaction" />
```

**Props:**
- `txHash` - Transaction hash.
- `index` - Output index.
- `linkTo` - Navigation target: `'cell'` (default) or `'transaction'`.

**Behavior:**
- Text click navigates to cell or transaction page.
- Copy icon copies full outpoint (`txHash:index`).

### TruncatedData

Displays variable-length hex data with responsive truncation.

```tsx
// Default truncation (128 desktop, 64 mobile)
<TruncatedData data={hexData} />

// Custom limits
<TruncatedData data={hexData} desktopLimit={256} mobileLimit={128} />

// With copy button (default: true)
<TruncatedData data={hexData} showCopy />

// Without copy button
<TruncatedData data={hexData} showCopy={false} />
```

**Props:**
- `data` - Hex string to display.
- `desktopLimit` - Max chars on desktop (default: 128).
- `mobileLimit` - Max chars on mobile (default: 64).
- `showCopy` - Show copy button (default: true).

### CellDataDisplay

Auto-detects and decodes cell data based on type script.

```tsx
// Auto-detect format
<CellDataDisplay data={cellData} typeScript={typeScript} />

// Force specific decode mode
<CellDataDisplay data={cellData} forceMode="dep_group" hideToggle />
```

**Supported decode formats:**
- **SUDT**: 16-byte uint128 LE token amount.
- **xUDT**: SUDT amount + extension data.
- **DAO**: 8-byte deposit/withdraw indicator.
- **DEP_GROUP**: Molecule vector of OutPoints (rendered as clickable links).

### Tooltip

```tsx
// Basic tooltip (hover/focus to show)
<Tooltip content="Helpful information">
  <span>Hover me</span>
</Tooltip>

// Interactive tooltip for clickable elements
<Tooltip content="View cell" interactive>
  <button onClick={handleClick}>Click me</button>
</Tooltip>
```

**Props:**
- `content` - Tooltip text or ReactNode.
- `placement` - Position (`top`, `bottom`, `left`, `right`). Default: `top`.
- `disabled` - Disable the tooltip.
- `interactive` - Enable for clickable children.

**Touch Device Behavior:**

| Prop | First Tap | Second Tap | Tap Outside |
|------|-----------|------------|-------------|
| `interactive={false}` | Shows tooltip (if focusable) | N/A | Closes tooltip |
| `interactive={true}` | Shows tooltip, prevents click | Triggers click action | Closes tooltip |

**When to Use `interactive`:**
- Buttons that perform actions.
- Links that navigate to other pages.
- Any element with an `onClick` handler.

## Helper Functions

### format.ts

- `truncateHex(hex, prefixLen=8, suffixLen=8)` - Truncate 66-char hashes.
- `truncateAddress(address, prefixLen=8, suffixLen=4)` - Truncate CKB addresses.
- `truncateData(data, limit=128)` - Truncate variable-length data.
- `formatNumber(n)` - Format number with thousand separators.

### decode.ts

- `decodeSudt(data)` - Decode SUDT cell data to amount.
- `decodeXudt(data)` - Decode xUDT cell data to amount + extension.
- `decodeDao(data)` - Decode NervosDAO cell data to deposit/withdraw phase.
- `decodeDepGroup(data)` - Decode DEP_GROUP to list of OutPoints.
- `decodeData(data, typeScript, network)` - Auto-detect and decode.
- `formatTokenAmount(amount, decimals=8)` - Format token amount with decimals.

### knownScripts.ts

- `lookupTypeScript(codeHash, network)` - Look up type script info by code hash.
- `lookupLockScript(codeHash, network)` - Look up lock script info by code hash.

## Word Break Strategy

Long strings use `<wbr>` (Word Break Opportunity) elements to allow natural line wrapping without affecting copy/paste. The break point is inserted at 50% of the displayed string length.

This is preferable to:
- `&shy;` (soft hyphen) - Adds visible hyphen at break, inconsistent copy behavior.
- Zero-width space - Invisible but copied to clipboard, causes issues.
