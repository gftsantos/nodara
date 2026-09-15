---
"@nodara/core": minor
"@nodara/react": patch
"@nodara/vue": patch
"@nodara/angular": patch
"@nodara/web-components": patch
---

Add optional schema-2 working-plan evaluation/store and five synchronized
projections. Preserve requested starts, schedule FS/SS/FF/SF in working periods,
calculate capacity on actual work segments and provide atomic preview/apply/history.

Replace the circular-graph chord with weighted ribbons, separate radial trees and
two-sided mindmaps, and add ER attributes/cardinalities and state semantics.
Use real UTC Gantt boundaries and localized labels; expose selection-only
editable:false. Clarify six component APIs versus variants and example recipes.

Measure cartesian axis labels at 14px and cull collisions without removing data,
keeping clustered working-period timestamps legible within the canvas.
