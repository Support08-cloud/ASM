import { RecordCard } from './RecordCard'
import { useAppStore } from '../../app/state/store-context'

export function RecordList() {
  const { state, dispatch, visibleRecords } = useAppStore()
  const dense = state.settings.viewMode === 'list'

  return (
    <div className={dense ? 'record-rows' : 'card-grid'}>
      {visibleRecords.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          dense={dense}
          selected={state.selectedIds.includes(record.id)}
          onToggle={() => dispatch({ type: 'toggle-select', id: record.id })}
          onOpenDetails={() => dispatch({ type: 'open-details', id: record.id })}
        />
      ))}
    </div>
  )
}
