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
| Internal link (SPA) | Navigates within app | Nervos color, pointer cursor |
| Text (not linkable) | Nothing | Default text color |
| Copy icon | Copies to clipboard | Two-squares icon → checkmark |
| External link | Opens new tab | Box-arrow icon (↗) |

### Internal Links (SPA)

**Always render internal navigation as a real anchor (`<a href>`), not a `<button>`.**

Rationale:
- Desktop hover shows a real URL.
- Users get standard browser link behaviors (open in new tab, copy link address, etc.).
- Improves semantics/accessibility.

**Standard implementation**:
- Use `generateLink()` to build internal URLs (preserves `network` and `height` query params).
- Use `InternalLink` (`src/components/InternalLink.tsx`) for plain text links, breadcrumbs, and other navigation that isn’t handled by a display component.
- `InternalLink` intercepts only plain left-clicks to call `navigate()`, and lets modifier-key clicks fall back to the browser.

```tsx
import { generateLink } from '../lib/router';
import { InternalLink } from '../components/InternalLink';

<InternalLink href={generateLink('/resources')} className="hover:text-nervos">
	Well-Known Resources
</InternalLink>
```

**Breadcrumbs**:
- Wrap the trail in `nav aria-label="Breadcrumb"`.
- Mark the current crumb with `aria-current="page"`.
- Mark separators (e.g. `/`) as `aria-hidden="true"`.

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

### CKB Addresses (~46-95 characters)

| Screen Size | `truncate={true}` (default) | `truncate={false}` |
|-------------|-----------------------------|--------------------|
| Mobile (<768px) | 8...4 JS truncation | 8...4 JS truncation |
| Tablet/Desktop (≥768px) | Full; CSS ellipsis on overflow | Full; wraps to multiple lines |

**Mobile format**: 8 chars + `...` + 4 chars = `ckb1qzda...xwsq`

**Key behavior**: Mobile **always** uses 8...4 format regardless of `truncate` prop. The `truncate` prop only affects tablet/desktop behavior.

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

| Resolution | Width | Hex Chars | Bytes |
|------------|-------|-----------|-------|
| Mobile | < 640px | 130 | 64 |
| Tablet | 640-1023px | 258 | 128 |
| Desktop | ≥ 1024px | 1026 | 512 |

Limits are in hex string characters (including `0x` prefix), not raw bytes. Defined in `src/hooks/ui.ts` (`DEFAULT_CHAR_LIMITS`).

**Size Thresholds** (defined in `src/config/defaults.ts` under `HEX_DATA_CONFIG`):

| Threshold | Size | Behavior |
|-----------|------|----------|
| Download button | > 10 KB | Shows download button. |
| Modal suggested | > 50 KB | Suggests full-screen modal view. |
| Warning on expand | > 100 KB | Shows warning before expanding. |
| Max expanded height | 384px | Scrollable container limit. |

**Features:**
- 3-tier responsive truncation (mobile < 640px, tablet 640-1023px, desktop ≥ 1024px).
- Expandable view with scroll for long data.
- Full-screen modal for very large data.
- Size badge showing byte count.
- Download button for large data.
- Pluggable decoder registry for format-specific rendering.

## Responsive Behavior

Components with responsive display:

| Component | Behavior |
|-----------|----------|
| `HashDisplay` | `responsive={true}` shows full on desktop, truncated on mobile |
| `AddressDisplay` | Mobile always 8...4; desktop/tablet controlled by `truncate` prop |
| `OutPoint` | CSS-based truncation |
| `HexData` | 3-tier breakpoints (always responsive) |

**Breakpoints**: Mobile < 768px (AddressDisplay), < 640px (HexData), Tablet 640-1023px, Desktop ≥ 1024px

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

### Navigation Link Text

Use **title case** for all button and link labels.

| Example | Correct | Incorrect |
|---------|---------|-----------|
| Header navigation | View All → | View all → |
| Footer navigation | View All Transactions → | View all transactions → |
| Action buttons | Load More | load more |

**Pattern for section links:**
- **Header** (brief): `View All →` — context is clear from section title.
- **Footer** (explicit): `View All {Items} →` — context may be forgotten after scrolling.

### Badges

Badge colors are centralized in `src/lib/badgeStyles.ts` for consistency across the site. This file exports constants for all semantic badge categories and helper functions for dynamic color selection.

**Badge categories:**
- **Status badges**: Convey state (success, error, warning, info).
- **Hash type badges**: Distinguish script identification methods (type vs data).
- **Script type badges**: Lock scripts (indigo) vs type scripts (teal).
- **Cell category badges**: Binary, Dep Group, Protocol.
- **Brand badges**: RFC labels, known scripts, cellbase markers.
- **DAO phase badges**: Deposit (green) vs withdraw (yellow).

**Usage:**
```tsx
import { STATUS_SUCCESS, getHashTypeStyle } from '../lib/badgeStyles';

// Static badge
<span className={`px-2 py-1 rounded ${STATUS_SUCCESS}`}>Live</span>

// Dynamic badge
<span className={`px-2 py-1 rounded ${getHashTypeStyle(hashType)}`}>{hashType}</span>
```

See `src/lib/badgeStyles.ts` for the complete list of constants and helper functions.

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

Displays CKB addresses with responsive truncation and optional navigation.

```tsx
// Default: mobile 8...4, desktop CSS ellipsis on overflow
<AddressDisplay address={address} linkTo={`/address/${address}`} />

// Full address on desktop (wraps), still 8...4 on mobile (e.g., address page)
<AddressDisplay address={address} truncate={false} />
```

**Props:**
- `address` - The CKB address string.
- `linkTo` - Optional URL. If set, text click navigates.
- `truncate` - Desktop/tablet only: `true` (default) uses CSS ellipsis on overflow, `false` allows wrapping. Mobile always uses 8...4 regardless.
- `prefixLen` / `suffixLen` - Mobile truncation lengths (default: 8/4).

**Responsive Behavior:**

| Screen Size | `truncate={true}` | `truncate={false}` |
|-------------|-------------------|-------------------|
| Mobile (<768px) | `ckb1qzda...xwsq` | `ckb1qzda...xwsq` |
| Tablet/Desktop | Full address; ellipsis if overflow | Full address; wraps |

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

### HexData

Displays variable-length hex data with 3-tier responsive truncation, expandable view, modal option, and pluggable decoder support.

```tsx
// Inline context (args, small data)
<HexData data={hexData} context="inline" />

// Section context (cell data, witnesses)
<HexData data={hexData} context="section" />

// With custom decoder registry
<HexData data={hexData} registry={witnessRegistry} context="section" />

// With label
<HexData data={hexData} label="Extension Data" context="inline" />

// Without size badge
<HexData data={hexData} showSize={false} context="section" />

// Disable modal
<HexData data={hexData} allowModal={false} context="section" />
```

**Props:**
- `data` - Hex string to display.
- `context` - Display context: `'inline'` (smaller limits) or `'section'` (larger limits).
- `registry` - Optional decoder registry for format-specific rendering.
- `label` - Optional label shown above content.
- `showSize` - Show size badge (default: true).
- `allowModal` - Allow full-screen modal view (default: true).
- `charLimits` - Custom character limits per breakpoint.

**View Modes:**
- **Concise**: Truncated with ellipsis, default view.
- **Expanded**: Full content in scrollable container (max height 384px).
- **Modal**: Full-screen view for very large data.

**Thresholds (configurable in `src/config/defaults.ts`):**
- Download button shown at 10 KB.
- Modal suggested at 50 KB.
- Warning shown at 100 KB before expanding.

**Decoder Registry:**
The `registry` prop accepts a `DecoderRegistry` object for custom format decoding:
```tsx
interface DecoderRegistry {
  defaultFormat: string;
  auto?: (data: string) => DecodedResult | null;
  decoders: Record<string, (data: string) => DecodedResult | null>;
}
```
See `WitnessSection.tsx` for an example registry implementation.

### Size Display

Byte sizes use `formatBytes()` for consistent formatting across the site.

**Formatting Rules:**
- Units: B, KB, MB, GB, TB (1024-based).
- Decimals: 0 for bytes (<1024), 1 for KB and above.
- Always use `formatBytes()` from `src/lib/format.ts` - never raw `{n} bytes`.

**Styling Standard:**
- Use the `text-size-meta` utility class (defined in `src/index.css`).
- When inside `font-semibold` parent, add `font-normal`.

The `text-size-meta` class applies:
- `font-size: smaller` - reduces size relative to parent context.
- `text-gray-500 dark:text-gray-400` - secondary/muted color.

#### Size in Section Headers

| Context | Pattern | Example |
|---------|---------|---------|
| Single item | `Label (size)` | `Cell Data (300 B)` |
| Collection | `Label (count) · size` | `Witnesses (3) · 1.5 KB` |

```tsx
// Single item (Cell Data)
<h2 className="font-semibold text-gray-900 dark:text-white">Cell Data</h2>
<span className="text-size-meta">
  ({formatBytes(byteCount)})
</span>

// Collection (Witnesses)
<h2 className="font-semibold text-gray-900 dark:text-white">
  Witnesses ({count}) <span className="text-size-meta font-normal">· {formatBytes(totalBytes)}</span>
</h2>
```

#### Size in Detail Row Labels

Size appears in lighter, smaller text within the label:

```tsx
// Args label with size
<DetailRow label={
  <>
    Args <span className="text-size-meta font-normal">({formatBytes(byteCount)})</span>
  </>
}>
```

#### SizeBadge Component

Use `SizeBadge` for standalone size display with automatic tooltip for large values.

```tsx
// Default with parentheses: (300 B)
<SizeBadge bytes={300} />

// Without parentheses: 300 B
<SizeBadge bytes={300} parens={false} />

// Large size shows tooltip with exact bytes
<SizeBadge bytes={15360} />  // Displays "(15.0 KB)", hover shows "15,360 bytes"
```

**Props:**
- `bytes` - Size in bytes.
- `parens` - Wrap in parentheses (default: true).
- `className` - Additional CSS classes.

**Styling:** Uses `text-size-meta` utility class.

**Tooltip Behavior:**
- Sizes under 1024 bytes show exact value, no tooltip.
- Sizes 1024+ show abbreviated format (KB, MB) with tooltip for exact byte count.

**When to Use:**
- `SizeBadge` - Inline with data, sub-labels, when tooltip is helpful.
- `formatBytes()` - Section headers, custom layouts where you control styling.

### SubDataSection

Two-line section pattern for secondary data within a decoded view. Provides consistent layout for extra data, extension data, and error raw data.

**Layout:**
- **Line 1**: Label with size badge and action buttons (copy, download, modal).
- **Line 2**: Content (hex data, truncated responsively).

**Usage:**
```tsx
// Used internally by decoded views
{extraData !== '0x' && (
  <SubDataSection label="Extra data" data={extraData} />
)}
```

**Features:**
- Label row: `{label} {size}:` with copy/download/modal buttons on right.
- Content row: Responsively truncated hex data.
- Modal: Full-screen view for complete data.

### CellDataSection

Auto-detects and decodes cell data based on type script.

```tsx
// Auto-detect format
<CellDataSection data={cellData} typeScript={typeScript} />

// With outpoint for format lookup (when no type script)
<CellDataSection data={cellData} outpoint={outpoint} />
```

**Supported decode formats:**
- **UDT (Token Amount)**: 16-byte uint128 LE token amount + optional extra data. Covers both SUDT and xUDT formats.
- **DAO**: 8-byte deposit/withdraw indicator.
- **DEP_GROUP**: Molecule vector of OutPoints (rendered as clickable links).
- **Integer formats**: uint32, uint64, int64, uint128 (little-endian).
- **ASCII Text**: Decode as ASCII with placeholder for non-printable chars.
- **UTF-8 Text**: Decode as UTF-8 with placeholder for invalid/control chars.

**Text Decoder Safety:**
- HTML characters (`<`, `>`, `&`, `"`, `'`) are escaped.
- Non-printable/control characters show as `[XX]` placeholders.
- Invalid UTF-8 sequences show as `[??]` placeholders.
- Warning banner shown when binary characters are present.

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
- `formatBytes(bytes, decimals=1)` - Format byte count (e.g., "1.5 KB", "2.3 MB").

### decode.ts

**Cell data decoding:**
- `decodeUdt(data)` - Decode UDT (SUDT/xUDT) cell data to amount + extra data.
- `decodeDao(data)` - Decode NervosDAO cell data to deposit/withdraw phase.
- `decodeDepGroup(data)` - Decode DEP_GROUP to list of OutPoints.
- `decodeData(data, typeScript, network)` - Auto-detect and decode.
- `decodeByFormat(data, format)` - Decode by explicit format name.
- `formatTokenAmount(amount, decimals=8)` - Format token amount with decimals.

**Integer decoding:**
- `decodeUint32(data)` - Decode 4-byte little-endian unsigned integer.
- `decodeUint64(data)` - Decode 8-byte little-endian unsigned integer.
- `decodeInt64(data)` - Decode 8-byte little-endian signed integer.
- `decodeUint128(data)` - Decode 16-byte little-endian unsigned integer.

**Text decoding:**
- `decodeAscii(data)` - Decode as ASCII text with safety escaping.
- `decodeUtf8(data)` - Decode as UTF-8 text with safety escaping.

**Witness decoding:**
- `decodeWitnessArgs(data)` - Decode Molecule WitnessArgs table.
- `decodeSignature(data)` - Decode 65-byte SECP256K1 recoverable signature.
- `isWitnessArgs(data)` - Check if data looks like valid WitnessArgs.
- `isSignature(data)` - Check if data is exactly 65 bytes (signature size).

### knownScripts.ts

- `lookupTypeScript(codeHash, network)` - Look up type script info by code hash.
- `lookupLockScript(codeHash, network)` - Look up lock script info by code hash.

## Word Break Strategy

Long strings use `<wbr>` (Word Break Opportunity) elements to allow natural line wrapping without affecting copy/paste. The break point is inserted at 50% of the displayed string length.

This is preferable to:
- `&shy;` (soft hyphen) - Adds visible hyphen at break, inconsistent copy behavior.
- Zero-width space - Invisible but copied to clipboard, causes issues.
