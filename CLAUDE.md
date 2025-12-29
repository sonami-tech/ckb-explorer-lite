# CLAUDE.md

Project-specific guidance for CKB Explorer Lite development.

## Development

```bash
bun run dev --port 5273   # Start dev server.
bun run typecheck         # Type check.
bun run lint              # Lint.
bun run build             # Production build.
```

## Key Files

| Task | File(s) |
|------|---------|
| Add/modify page | `src/pages/*.tsx` |
| Add route | `src/lib/router.ts` |
| Modify header/footer | `src/components/Header.tsx`, `Footer.tsx` |
| Change network config | `src/config/networks.ts` |
| Add timeline event | `src/config/events.ts` |
| Modify RPC client | `src/lib/rpc.ts` |
| Change cache behavior | `src/lib/rpcCache.ts`, `src/config/defaults.ts` |
| Display components | `src/components/CopyButton.tsx` (HashDisplay, OutPoint, TruncatedData) |

## Patterns

**Archive height in titles**: Append ` @ Block {height}` using `formatNumber()` for thousand separators.
```tsx
{title}{archiveHeight !== undefined && ` @ Block ${formatNumber(archiveHeight)}`}
```

**Responsive layout breakpoint**: `lg` (1024px) for stacked vs side-by-side in DetailRow.

**Hash/address display**: Use `HashDisplay` component, not manual truncation.

## Documentation

- `docs/DISPLAY_STANDARDS.md` - Data display formats and components.
- `docs/CACHE_POLICY.md` - RPC caching strategy.
- `docs/TEST_DATA.md` - Test data for manual QA.

## Architecture

- **RPC**: Custom client with batch request support for `set_block_height`.
- **Routing**: Navigo with `?height=N` query param preservation.
- **State**: NetworkContext, ThemeContext, ArchiveContext.
- **Styling**: Tailwind CSS v4, mobile-first breakpoints.
