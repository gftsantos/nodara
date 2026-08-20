# Nodara architecture

## Layers

```text
Application data
      │
      ▼
Public typed contracts + runtime validation
      │
      ▼
@nodara/core controller and renderers
      │
      ├── Gantt DOM renderer
      ├── Chart Canvas renderer
      ├── Topology Canvas renderer
      └── Calendar DOM renderer
      │
      ▼
React · Vue · Angular · Web Components · JavaScript
```

The framework adapters only map lifecycle and event semantics. Rendering,
validation, theme tokens, accessibility metadata, and errors belong to core.

## Controller contract

Every visual returns the same lifecycle surface:

- `update(data)` replaces the current normalized dataset.
- `resize()` requests a deterministic redraw.
- `destroy()` removes observers, listeners, and rendered nodes.
- `on(event, listener)` subscribes to domain and lifecycle events.

## Performance strategy

The first alpha uses accessible DOM for semantic, row-oriented components and
Canvas for dense analytical components. The renderer boundary is internal, so
future WebGL virtualization does not change package APIs.

## Compatibility

The public target is evergreen browsers, Node.js 20+, React 18+, Vue 3.3+ and
Angular 17+. All packages publish ESM, CommonJS, declarations and source maps.
