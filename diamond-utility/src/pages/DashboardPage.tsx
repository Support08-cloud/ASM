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
    loadSample,
    rescan,
    startGetMp4,
    confirmGetMp4,
    detailsDiamond,
  } = useAppStore()

  const showing = visibleDiamonds.length
  const total = state.diamonds.length
  const filterCount = activeFilterCount(state.filters)
  const searching = Boolean(state.search.trim()) || filterCount > 0

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Diamond Data"
        description="Select and process diamond folders from your local source."
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
        />
        <PathCard
          label="Output"
          path={state.outputPath}
          hint="New diamond folders will be created here"
          onChange={chooseOutput}
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
                {state.selectedIds.length} selected
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
          </div>

          <div className="toolbar-row">
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => dispatch({ type: 'select-visible', ids: visibleDiamonds.map((item) => item.id) })}
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
              onToggle={(id) => dispatch({ type: 'toggle-select', id })}
              onDetails={(id) => dispatch({ type: 'open-details', id })}
            />
          ) : (
            <div className="card-grid">
              {visibleDiamonds.map((diamond) => (
                <DiamondCard
                  key={diamond.id}
                  diamond={diamond}
                  selected={state.selectedIds.includes(diamond.id)}
                  onToggle={() => dispatch({ type: 'toggle-select', id: diamond.id })}
                  onDetails={() => dispatch({ type: 'open-details', id: diamond.id })}
                />
              ))}
            </div>
          )}

          <SelectionToolbar
            count={state.selectedIds.length}
            disabled={!state.outputPath}
            onClear={() => dispatch({ type: 'clear-selection' })}
            onProcess={startGetMp4}
          />
        </>
      ) : null}

      {detailsDiamond ? (
        <DiamondDetailsDrawer
          diamond={detailsDiamond}
          sourcePath={state.sourcePath}
          onClose={() => dispatch({ type: 'close-details' })}
        />
      ) : null}

      {state.phase === 'confirming' && (
        <ConfirmationDialog
          summary={{
            diamondCount: state.selectedIds.length,
            folderCount: state.diamonds
              .filter((diamond) => state.selectedIds.includes(diamond.id))
              .reduce((sum, diamond) => sum + diamond.sourceFolderCount, 0),
            mp4Count: state.diamonds
              .filter((diamond) => state.selectedIds.includes(diamond.id))
              .reduce((sum, diamond) => sum + diamond.mp4.found, 0),
            diamonds: [],
            outputPath: state.outputPath ?? '',
          }}
          onCancel={() => dispatch({ type: 'cancel-confirm' })}
          onConfirm={confirmGetMp4}
        />
      )}
    </>
  )
}
