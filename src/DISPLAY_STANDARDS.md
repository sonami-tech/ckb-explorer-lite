# Display Standards

This document defines the standardized formats for displaying blockchain data in CKB Explorer Lite.

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
| Transaction outputs | Full | 8...4 | CSS responsive classes |
| Other contexts | 8...4 | 8...4 | `truncateAddress()` |

**Format**: 8 chars + `...` + 4 chars = `ckb1qzda...xwsq`

### OutPoints (tx_hash:index)

| Context | Desktop/Tablet | Mobile | Component |
|---------|----------------|--------|-----------|
| All contexts | Full hash:index (CSS truncation) | Truncated hash:index | `OutPoint` |

**Format**: Hash format + `:` + decimal index = `0x12345678...12345678:0`

**Features**: No-wrap, hash truncates with ellipsis if container is narrow, configurable copy button and link target.

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
| `OutPoint` | CSS-based truncation | N/A |
| `TruncatedData` | Always responsive | N/A |

**Breakpoint**: 640px (Tailwind `sm`)

## Click Behavior

### Copy on Click
- Hashes in overview sections (`HashDisplay`)
- Addresses with copy button

### Navigate on Click
- OutPoints → Cell page or Transaction page (`OutPoint` with `linkTo` prop)
- Addresses in outputs → Address page
- Block hashes with link icon → Block page

## Visual Indicators

### Link Icons
Used when clicking navigates to another page. Positioned to the right of the clickable element.

### Copy Button
Small clipboard icon to the right of copyable text. Shows checkmark on success.

### Badges
- **Status badges**: Colored based on state (committed=green, pending=yellow, etc.)
- **Type badges**: "Has Type" for outputs with type scripts
- **dep_type badges**: "code" or "dep_group" for cell dependencies

## Components

### HashDisplay
```tsx
// Default: truncated, click copies
<HashDisplay hash={hash} />

// Full on desktop, truncated on mobile
<HashDisplay hash={hash} responsive />

// Always full (no truncation)
<HashDisplay hash={hash} truncate={false} />
```

### OutPoint
```tsx
// Navigate to cell page (default)
<OutPoint txHash={txHash} index={index} />

// Navigate to transaction page with copy button
<OutPoint txHash={txHash} index={index} linkTo="transaction" showCopy />

// No navigation link
<OutPoint txHash={txHash} index={index} linkTo="none" showCopy />
```

### TruncatedData
```tsx
// Responsive truncation with word break at 50%
<TruncatedData data={hexData} />

// Custom limits
<TruncatedData
  data={hexData}
  desktopLimit={256}
  mobileLimit={128}
/>
```

## Helper Functions

### format.ts
- `truncateHex(hex, prefixLen=8, suffixLen=8)` - Truncate 66-char hashes
- `truncateAddress(address, prefixLen=8, suffixLen=4)` - Truncate CKB addresses
- `truncateData(data, limit=128)` - Truncate variable-length data

## Word Break Strategy

Long strings use `<wbr>` (Word Break Opportunity) elements to allow natural line wrapping without affecting copy/paste. The break point is inserted at 50% of the displayed string length.

This is preferable to:
- `&shy;` (soft hyphen) - Adds visible hyphen at break, inconsistent copy behavior
- Zero-width space - Invisible but copied to clipboard, causes issues
