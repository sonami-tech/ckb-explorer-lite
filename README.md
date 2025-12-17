# CKB Explorer Lite

A lightweight web-based block explorer for CKB archive nodes with historical state query support.

## Features

### Core Functionality
- **Historical State Queries**: Query cell states at any past block height using the `set_block_height` RPC batch request.
- **Real-time Updates**: Automatic polling for new blocks with configurable interval (default 8 seconds).
- **Unified Search**: Search by block number, transaction hash, or CKB address with automatic type detection.
- **Network Detection**: Automatically detects and displays Mainnet or Testnet based on chain info.

### Archive Mode
- **URL-based State**: Archive height persisted in URL query parameters (`?height=N`) for shareable links.
- **Height Validation**: Warning displayed when archive height exceeds current tip block.
- **Preserved Navigation**: Archive height maintained across all page navigations.

### User Interface
- **Theme Support**: Light, dark, and auto (system preference) themes with localStorage persistence.
- **Animated Background**: Canvas-based particle animation in header (tablet/desktop only, 768px+).
- **Responsive Design**: Optimized for mobile (375px+), tablet (768px+), and desktop (1024px+).
- **iOS Viewport Handling**: Uses `dvh` viewport units for proper mobile Safari support.
- **Skeleton Loading**: Animated loading placeholders for all data views.
- **Error Handling**: Error display with retry functionality.

### Data Display
- **Copy to Clipboard**: One-click copy buttons for hashes and addresses with visual feedback.
- **Hash Truncation**: Truncated display (0x1234...5678) with full hash on hover.
- **Address Parsing**: Full CKB address format support via @ckb-ccc/core with legacy format detection.
- **Pagination**: Load More pattern with user-selectable page sizes (20/50/100) persisted in localStorage.

## Pages

### Home
- Latest blocks and transactions feeds with auto-refresh.
- Stats cards showing tip block, latest block time, and transaction count.

### Block (`/block/:id`)
- Block details including hash, number, timestamp, epoch, and parent hash.
- Expandable transaction list with input/output summaries.
- Cellbase transaction detection with special badge.

### Transaction (`/tx/:hash`)
- Transaction status badge (Committed/Pending/Proposed/Rejected).
- Inputs with links to previous output cells.
- Outputs with capacity, lock scripts, and type scripts.
- Cell dependencies with links.
- Collapsible witnesses section.

### Address (`/address/:address`)
- Balance display in CKB.
- Lock script details (code hash, hash type, args).
- Legacy format detection with deprecation badge.
- Live cells list with pagination.
- Type script and data indicators on cells.

### Cell (`/cell/:txHash/:index`)
- Cell status badge (Live/Dead/Unknown).
- Capacity display.
- Lock and type script details.
- Cell data display with byte count (truncated for large data).

## Technology Stack

- **React 19** with TypeScript 5.9
- **Vite 7** for development and building
- **Tailwind CSS v4** for styling
- **Navigo** for client-side routing
- **@ckb-ccc/core** for address parsing

## Prerequisites

- [Bun](https://bun.sh/) runtime
- CKB archive node running with RPC enabled at `http://127.0.0.1:8114`

## Configuration

Environment variables in `.env`:

```env
# CKB node RPC endpoint.
VITE_CKB_RPC_URL=http://127.0.0.1:8114

# Polling interval for new blocks (milliseconds).
VITE_POLL_INTERVAL_MS=8000
```

## Development

```bash
# Install dependencies.
bun install

# Start development server.
bun run dev

# Type check.
bun run typecheck

# Lint.
bun run lint

# Build for production.
bun run build

# Preview production build.
bun run preview
```

## Architecture

### RPC Client

The custom RPC client (`src/lib/rpc.ts`) supports both standard and archive mode requests. Archive mode uses JSON-RPC batch requests with `set_block_height` as the first call:

```typescript
// Standard request (current state).
const block = await rpc.getBlockByNumber(12345n);

// Archive request (historical state at height 10000).
const historicalBlock = await rpc.getBlockByNumber(12345n, 10000);
```

Batch request format for archive mode:

```json
[
  { "method": "set_block_height", "params": ["0x2710"] },
  { "method": "get_block_by_number", "params": ["0x3039"] }
]
```

### Routing

Navigo-based routing with URL query parameter persistence. The `?height=N` parameter is preserved across navigation when archive mode is active.

Routes:
- `/` - Home page
- `/block/:id` - Block by number or hash
- `/tx/:hash` - Transaction by hash
- `/address/:address` - Address cells
- `/cell/:txHash/:index` - Cell by outpoint

### State Management

- **ThemeContext**: Theme preference (light/dark/auto) with localStorage persistence.
- **ArchiveContext**: Archive height state with URL synchronization and tip block polling.

### Address Parsing

Uses @ckb-ccc/core for parsing CKB addresses. Supports:
- Full format addresses (current standard)
- Full data format (deprecated)
- Full type format (deprecated)
- Short format detection (not supported for queries, shows error)

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── AnimatedBackground.tsx  # Canvas particle animation
│   ├── ArchiveHeightSelector.tsx
│   ├── CopyButton.tsx   # Copy button and HashDisplay
│   ├── ErrorDisplay.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── Layout.tsx
│   ├── SearchBar.tsx
│   ├── Skeleton.tsx     # Loading placeholders
│   └── ThemeToggle.tsx
├── contexts/            # React contexts
│   ├── ArchiveContext.tsx
│   └── ThemeContext.tsx
├── hooks/               # Custom hooks
│   └── useRouter.ts
├── lib/                 # Utilities
│   ├── address.ts       # CKB address parsing
│   ├── format.ts        # Formatting helpers
│   ├── router.ts        # Navigo configuration
│   └── rpc.ts           # RPC client with archive support
├── pages/               # Page components
│   ├── AddressPage.tsx
│   ├── BlockPage.tsx
│   ├── CellPage.tsx
│   ├── HomePage.tsx
│   ├── NotFoundPage.tsx
│   └── TransactionPage.tsx
├── types/               # TypeScript types
│   └── rpc.ts
├── App.tsx
├── index.css            # Tailwind config and custom styles
└── main.tsx
```

## Design Decisions

### Why Custom RPC Client?

The @ckb-ccc/core library doesn't support JSON-RPC batch requests, which are required for the archive node's `set_block_height` method. A custom lightweight RPC client handles both standard and batch requests.

### Why Navigo?

Navigo provides simple hash-based routing without requiring a backend server for path rewrites. It also supports query parameter preservation needed for the archive height feature.

### Why Canvas Animation?

The animated particle background uses Nervos brand green (#00CC9B) and creates a subtle network visualization effect. It's disabled on mobile (< 768px) for performance and battery life.

### Archive Mode UX

When archive mode is active (height specified), the explorer queries historical state at that block height. The height is:
- Displayed prominently in the header with "Archive mode" badge
- Persisted in URL query parameters for shareable links
- Preserved across all navigation
- Validated against the current tip with warning if exceeded

### Preference Persistence

User preferences are stored in localStorage:
- `ckb-explorer-theme`: Theme preference (light/dark/auto)
- `ckb-explorer-page-size`: Pagination size (20/50/100)

## Data Display Standards

- **Block numbers**: Formatted with thousand separators (1,234,567)
- **Timestamps**: ISO format with relative time (e.g., "2 minutes ago")
- **Hashes**: Truncated with ellipsis (0x1234...5678) and copy button
- **Capacity**: Displayed in CKB with up to 8 decimal places, trailing zeros trimmed
- **Epochs**: Formatted as "epoch (index/length)"
- **Scripts**: Hash type badge + truncated code hash

## Nervos Brand

The explorer uses official Nervos brand colors:
- Primary: `#00CC9B` (nervos green)
- Dark variant: `#00B388`
- Light variant: `#33D6AF`

## Known Limitations

### Search Hash Ambiguity

Block hashes and transaction hashes are both 66-character hex strings (32 bytes). When searching by hash, the explorer currently assumes it's a transaction hash. If the hash is actually a block hash, the user will see a "Transaction not found" error and must manually navigate to `/block/:hash`. A future improvement could implement fallback detection to try both lookup types.

## License

MIT
