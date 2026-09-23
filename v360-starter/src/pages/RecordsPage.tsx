import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { RecordList } from '../components/records/RecordList'
import { SearchBar } from '../components/records/SearchBar'
import { SelectionToolbar } from '../components/records/SelectionToolbar'
import { useAppStore } from '../app/state/store-context'
import { formatCount } from '../utils/format'
import type { RefObject } from 'react'

export function RecordsPage({ searchRef }: { searchRef: RefObject<HTMLInputElement | null> }) {
  const { state, dispatch, visibleRecords, loadSample } = useAppStore()

  if (state.records.length === 0) {
    return (
      <EmptyState
        title="No records loaded"
        body="Connect a source or load the sample dataset to start working."
        actionLabel="Load sample dataset"
        onAction={() => void loadSample()}
      />
    )
  }

  const allVisibleSelected =
    visibleRecords.length > 0 && visibleRecords.every((record) => state.selectedIds.includes(record.id))

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE"
        title="Records"
        description="Search, select, and run the task against any subset of the loaded records."
        actions={
          <div className="btn-row">
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                allVisibleSelected
                  ? dispatch({ type: 'clear-selection' })
                  : dispatch({ type: 'select-visible', ids: visibleRecords.map((record) => record.id) })
              }
            >
              {allVisibleSelected ? 'Clear selection' : 'Select all'}
            </button>
          </div>
        }
      />

      <SearchBar ref={searchRef} />

      <div className="results-head">
        <div>
          <div className="results-count">{formatCount(visibleRecords.length, 'record')}</div>
          <div className="results-sub">
            {state.search ? `Filtered from ${state.records.length}` : 'Showing everything from the source'}
          </div>
        </div>
      </div>

      {visibleRecords.length === 0 ? (
        <EmptyState
          title="No matches"
          body={`Nothing matches “${state.search}”. Try a different term or clear the search.`}
          actionLabel="Clear search"
          onAction={() => dispatch({ type: 'set-search', search: '' })}
        />
      ) : (
        <RecordList />
      )}

      <SelectionToolbar />
    </>
  )
}
