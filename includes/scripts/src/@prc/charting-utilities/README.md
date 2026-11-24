# `@prc/charting-utilities`

The headless base of PRC charts: types, compute, React hooks, pure helpers, and static data. It has no JSX. `@prc/charting-library` draws with it. `prc-custom-charts` also bundles it.

The source of truth for the rules is [`.cursor/rules/charting-architecture.mdc`](../../../../../../../.cursor/rules/charting-architecture.mdc). It covers this package, `@prc/charting-library`, and `prc-chart-builder`. `npm run lint:repo` checks the rules marked **(lint)**.

## Folders

The package has six folders. Do not add a folder **(lint)**. To place a file, use the first row that is true.

| The file…                                                                                                           | Folder         |
| ------------------------------------------------------------------------------------------------------------------- | -------------- |
| Holds only types                                                                                                    | `types/`       |
| Calls a React hook (name it `use*`)                                                                                 | `hooks/`       |
| Is static data (JSON)                                                                                               | `data/`        |
| Is part of the label layout engine (declutter, measure, leader lines)                                               | `labelLayout/` |
| Returns what a renderer draws or positions with: geometry, scales, layout, ticks, mark props, plot rows             | `compute/`     |
| Does other pure work: resolves one config value or style, formats a value, holds defaults or palettes, loads a file | `utilities/`   |

The files that are in `compute/` and `utilities/` today are not all sorted by this table. Apply it to each new file and to each file that you move.

## Compute is named for what it computes

Compute that only one chart can use is the start of single-purpose code. Write compute that the next chart can call.

- Name a file for its output, for example `barRects.ts`, `cellGrid.ts`, `panelLayout.ts`, `valueColorScale.ts`.
- Do not put a chart type in a file name or a folder name. A chart with a unique mark gets a file named for the mark.
- Before you write compute, search `compute/` for the mark. Extend the file that is there.

## One entry, no inner barrels

- [`index.ts`](./index.ts) is the public surface. `index.js` forwards to it.
- Do not write an `index` file in a subfolder **(lint)**. In the package, import the file that defines the symbol.
- Add a public symbol to `index.ts` one time, by name. Use `export *` only for a file that holds only types.

## Who imports this package

- `@prc/charting-library` and `prc-custom-charts` import `@prc/charting-utilities` by name.
- `prc-chart-builder` does not import this package **(lint)**. It gets these helpers from `@prc/charting-library`. This entry includes React hooks, so the chart-builder `view.js` Script Module cannot import it. To give chart-builder a helper, export it from [`index.ts`](./index.ts), then add its name to the library entry `plugins/prc-charting-library/src/lib/index.ts`.
- No package imports a file in this folder by a relative path or by a path below the name **(lint)**. Unit tests are the exception.

## Where the chart-type folders went

PRC-996 removed the folders `heatMapTable/`, `hemicycle/`, `smallMultiples/`, `unifiedTooltip/`, and `waffle/`, and the `index.ts` file in each subfolder. The export names did not change. This package has no entry in `bin/prc-lint-charting-baseline.json`.

| Before                                                                                                             | Now                                           |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `heatMapTable/createValueColorScale.ts`                                                                            | `compute/valueColorScale.ts`                  |
| `heatMapTable/thresholdLegendLabels.ts`                                                                            | `compute/thresholdLegendLabels.ts`            |
| `heatMapTable/computeHeatMapTableCells.ts`                                                                         | `compute/tableCells.ts`                       |
| `heatMapTable/computeHeatMapTableLayout.ts`                                                                        | `compute/tableColumnLayout.ts`                |
| `hemicycle/computeHemicycleSeats.ts`                                                                               | `compute/seatArcs.ts`                         |
| `hemicycle/computeHemicycleBarSegments.ts`                                                                         | `compute/seatBarSegments.ts`                  |
| `hemicycle/computeHemicycleSquareScale.ts`                                                                         | `compute/seatSquareScale.ts`                  |
| `hemicycle/hemicycleTooltipPoint.ts`                                                                               | `compute/seatTooltipPoint.ts`                 |
| `waffle/computeWaffleCells.ts`                                                                                     | `compute/cellGrid.ts`                         |
| `waffle/computeWaffleLayout.ts`                                                                                    | `compute/cellGridLayout.ts`                   |
| `waffle/computeWafflePanelRatios.ts`                                                                               | `compute/cellGridPanelRatios.ts`              |
| `waffle/resolveWaffleCellSize.ts`                                                                                  | `compute/cellSize.ts`                         |
| `waffle/getWaffleCategoryInputs.ts`                                                                                | `compute/categoryInputs.ts`                   |
| `unifiedTooltip/buildUnifiedTooltipColumns.ts`, `findNearestColumn.ts`                                             | `compute/unifiedTooltipColumns.ts` (one file) |
| `smallMultiples/computeColumnBarRects.ts`, `computeHorizontalBarRects.ts`                                          | `compute/barRects.ts` (one file)              |
| `smallMultiples/computePanelRects.ts`                                                                              | `compute/panelLayout.ts`                      |
| `smallMultiples/resolvePanelRect.ts`                                                                               | `compute/panelRect.ts`                        |
| `smallMultiples/planPanelAxes.ts`                                                                                  | `compute/panelAxes.ts`                        |
| `smallMultiples/computeSharedDomain.ts`                                                                            | `compute/sharedDomain.ts`                     |
| `smallMultiples/resolveSliceDomain.ts`                                                                             | `compute/sliceDomain.ts`                      |
| `smallMultiples/enrichFacetRow.ts`, `facetDataByColumn.ts`, `facetDataByGroup.ts`, `sortPanelRowsByIndependent.ts` | `compute/` (same file names)                  |
| `smallMultiples/resolveGhostStroke.ts`                                                                             | `utilities/resolveGhostStroke.ts`             |
| `compute/index.ts` (`getSharedProps`)                                                                              | `compute/sharedProps.ts`                      |

One file came from `@prc/charting-library`, because `prc-chart-builder` also uses it. The export names did not change.

| Before                                                           | Now                           |
| ---------------------------------------------------------------- | ----------------------------- |
| `prc-charting-library` `src/lib/overlays/getPositioningScale.ts` | `compute/positioningScale.ts` |

`compute/positioningScale.ts` exports `getPositioningScale`, `scalePositionToDisplay`, `scalePositionToLayout`, and their types.

[`CHARTING-UTILITIES-REORG.md`](./CHARTING-UTILITIES-REORG.md) is the record of the earlier reorg (`hooks/` → `compute/`, label engine extraction). It is history, not the current rules.
