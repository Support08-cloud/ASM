import { forwardRef } from 'react'
import { IconSearch } from '../common/Icon'
import { useAppStore } from '../../app/state/store-context'

export const SearchBar = forwardRef<HTMLInputElement>(function SearchBar(_props, ref) {
  const { state, dispatch } = useAppStore()

  return (
    <div className="search-row">
      <div className="search-field">
        <IconSearch />
        <input
          ref={ref}
          type="search"
          value={state.search}
          placeholder="Search records, tags, or status"
          aria-label="Search records"
          onChange={(event) => dispatch({ type: 'set-search', search: event.target.value })}
        />
      </div>
      <div className="segmented" role="group" aria-label="View mode">
        <button
          type="button"
          className={state.settings.viewMode === 'cards' ? 'is-active' : ''}
          onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'cards' })}
        >
          Cards
        </button>
        <button
          type="button"
          className={state.settings.viewMode === 'list' ? 'is-active' : ''}
          onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'list' })}
        >
          List
        </button>
      </div>
    </div>
  )
})
