import { useAppStore } from '../app/state/AppStateContext'
import { DiamondCard } from '../components/diamond/DiamondCard'
import { DiamondDetailsDrawer } from '../components/diamond/DiamondDetailsDrawer'
import { DiamondTable } from '../components/diamond/DiamondTable'
import { FilterPopover } from '../components/diamond/FilterPopover'
import { PathCard } from '../components/diamond/PathCard'
import { SearchBar } from '../components/diamond/SearchBar'
import { SelectionToolbar } from '../components/diamond/SelectionToolbar'
import { ConfirmationDialog } from '../components/dialogs/ConfirmationDialog'
import { EmptyState, ErrorState, ScanPanel, SkeletonGrid } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { formatRelativeTime } from '../utils/format'
import { activeFilterCount } from '../services/search'

export function DashboardPage() {
  const {
    state,
    dispatch,
    visibleDiamonds,
    chooseSource,
    chooseOutput,
    clearSource,
    clearOutput,
    loadSample,
    rescan,
    startGetMp4,
    confirmGetMp4,
    detailsDiamond,
    confirmSummary,
  } = useAppStore()

  const showing = visibleDiamonds.length
  const total = state.diamonds.length
  const filterCount = activeFilterCount(state.filters)
  const searching = Boolean(state.search.trim()) || filterCount > 0
  const getMp4Reason =
    state.phase === 'scanning'
      ? 'Scan in progress'
      : !state.sourcePath
        ? 'Select a source folder first'
        : !state.outputPath
          ? 'Choose an output folder first'
          : state.selectedIds.length === 0
            ? 'Select one or more variant folders'
            : undefined

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Diamond Data"
        description="Search a diamond, select the variant folders you need, then Get MP4."
        meta={
          total > 0 ? (
            <>
              {total.toLocaleString()} diamonds found
              {searching ? ` · Showing ${showing} of ${total}` : null}
            </>
          ) : (
            'No diamond data loaded'
          )
        }
        actions={
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'navigate', route: 'settings' })}>
            Settings
          </button>
        }
      />

      <div className="path-grid">
        <PathCard
          label="Source"
          path={state.sourcePath}
          hint={state.lastScanAt ? `Last scanned: ${formatRelativeTime(state.lastScanAt)}` : 'Select an input folder to begin.'}
          onChange={chooseSource}
          onClear={clearSource}
        />
        <PathCard
          label="Output"
          path={state.outputPath}
          hint="One folder per diamond base name is created here"
          onChange={chooseOutput}
          onClear={clearOutput}
        />
      </div>

      {state.phase === 'scanning' && state.scanProgress ? <ScanPanel progress={state.scanProgress} /> : null}
      {state.phase === 'scanning' && !state.scanProgress ? <SkeletonGrid /> : null}

      {state.phase === 'scan_error' && state.scanError ? (
        <ErrorState
          title={state.scanError.title}
          path={state.scanError.path}
          detail={state.scanError.detail}
          onRetry={rescan}
        />
      ) : null}

      {state.phase === 'idle' || (state.phase === 'ready' && total === 0) ? (
        <EmptyState
          title="No diamond data loaded"
          body="Select an input folder to begin, or load the built-in sample dataset."
          actionLabel="Select Folder"
          onAction={chooseSource}
          secondaryLabel="Load sample dataset"
          onSecondary={loadSample}
        />
      ) : null}

      {state.phase !== 'scanning' && state.phase !== 'scan_error' && total > 0 ? (
        <>
          <div className="results-head">
            <div>
              <div className="section-label">Diamond data</div>
              <div className="results-count">{total.toLocaleString()} diamonds</div>
              <div className="results-sub">
                {state.selectedIds.length} folder{state.selectedIds.length === 1 ? '' : 's'} selected
                {searching ? ` · Showing ${showing} of ${total} diamonds` : null}
              </div>
            </div>
            <div className="segmented" role="tablist" aria-label="Result density">
              <button
                type="button"
                className={state.settings.viewMode === 'cards' ? 'is-active' : undefined}
                onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'cards' })}
              >
                Cards
              </button>
              <button
                type="button"
                className={state.settings.viewMode === 'list' ? 'is-active' : undefined}
                onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'list' })}
              >
                List
              </button>
            </div>
          </div>

          <div className="search-row">
            <SearchBar
              value={state.search}
              onChange={(search) => dispatch({ type: 'set-search', search })}
              resultLabel={`Showing ${showing} of ${total}`}
            />
            <FilterPopover filters={state.filters} onChange={(filters) => dispatch({ type: 'set-filters', filters })} />
            <button type="button" className="btn ghost" onClick={rescan} title="Rescan source (Ctrl+R)">
              Refresh
            </button>
            <button type="button" className="btn ghost" onClick={() => void loadSample()}>
              Load sample
            </button>
          </div>

          <div className="toolbar-row">
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  dispatch({
                    type: 'select-visible',
                    ids: visibleDiamonds.flatMap((item) => item.folders.map((folder) => folder.id)),
                  })
                }
              >
                Select All
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: 'clear-selection' })}>
                Clear
              </button>
            </div>
          </div>

          {showing === 0 ? (
            <EmptyState title="No diamonds found" body="Try a different search term or remove filters." />
          ) : state.settings.viewMode === 'list' ? (
            <DiamondTable
              diamonds={visibleDiamonds}
              selectedIds={state.selectedIds}
              onToggleDiamond={(diamond) =>
                dispatch({ type: 'toggle-group', ids: diamond.folders.map((folder) => folder.id) })
              }
              onToggleFolder={(id) => dispatch({ type: 'toggle-select', id })}
              onDetails={(id) => dispatch({ type: 'open-details', id })}
            />
          ) : (
            <div className="card-grid">
              {visibleDiamonds.map((diamond) => (
                <DiamondCard
                  key={diamond.id}
                  diamond={diamond}
                  selectedIds={state.selectedIds}
                  onToggleDiamond={() =>
                    dispatch({ type: 'toggle-group', ids: diamond.folders.map((folder) => folder.id) })
                  }
                  onToggleFolder={(id) => dispatch({ type: 'toggle-select', id })}
                  onDetails={() => dispatch({ type: 'open-details', id: diamond.id })}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      <SelectionToolbar
        count={state.selectedIds.length}
        disabled={Boolean(getMp4Reason)}
        reason={getMp4Reason}
        onClear={() => dispatch({ type: 'clear-selection' })}
        onProcess={startGetMp4}
      />

      {detailsDiamond ? (
        <DiamondDetailsDrawer
          diamond={detailsDiamond}
          sourcePath={state.sourcePath}
          onClose={() => dispatch({ type: 'close-details' })}
        />
      ) : null}

      {state.phase === 'confirming' && confirmSummary ? (
        <ConfirmationDialog
          summary={confirmSummary}
          onCancel={() => dispatch({ type: 'cancel-confirm' })}
          onConfirm={confirmGetMp4}
        />
      ) : null}
    </>
  )
}
