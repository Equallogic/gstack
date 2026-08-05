# Perchance Builder

A no-code, drag-and-drop builder for [Perchance](https://perchance.org) generators.

Build a random-text or AI generator by editing lists and output blocks visually,
watch it run in a live sandboxed preview, then export ready-to-paste Perchance
source.

## Why

Perchance is powerful but authoring a generator means hand-writing its strict,
indentation-based, bracket-templated source across a two-panel editor. This tool
lets anyone build one visually and ships working Perchance source you paste into
`perchance.org/editgen`.

## How it works

One canonical JSON model (`GeneratorProject`) is the single source of truth.
Everything is a pure function of it:

```
   Builder UI  ──►  GeneratorProject JSON  ──┬─►  Engine     ──►  live preview (sandboxed iframe)
                                             └─►  Serializer ──►  Perchance source (export)
```

- **Engine** (`src/engine`) — a tree-walk evaluator (seeded RNG, weighted picks,
  references, methods, inline lists, expressions). No Perchance-text parser.
- **Serializer** (`src/serializer`) — emits the two Perchance panels (lists + HTML)
  with strict 2-space indentation. Golden-file tested byte-for-byte.
- **Preview** (`src/preview`) — renders engine output into a `sandbox="allow-scripts"`
  iframe (no same-origin), bridged over `postMessage`.

## Develop

```bash
bun install
bun run dev        # http://localhost:5173
bun test           # engine + serializer tests
bun run build      # typecheck + production build
```

## Status

Early milestones (see the plan in the PR). Working today: lists with weights,
references, a live preview with re-roll, and Perchance export. In progress:
drag-and-drop, variables/inputs, conditionals, and image/text plugins.
