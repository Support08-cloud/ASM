import { useAppStore } from '../app/state/AppStateContext'
import { CompletionDialog } from '../components/dialogs/CompletionDialog'
import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { ProcessingPanel } from '../components/processing/ProcessingPanel'

export function OperationsPage() {
  const { state, dispatch, cancelProcessing, openOutput } = useAppStore()

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Operations"
        description="Watch Get MP4 jobs as they run. Source files are never modified."
      />
      {state.phase === 'processing' && state.processProgress ? (
        <ProcessingPanel progress={state.processProgress} onCancel={cancelProcessing} />
      ) : state.phase === 'completed' && state.processResult ? (
        <CompletionDialog
          result={state.processResult}
          onDone={() => dispatch({ type: 'dismiss-completion' })}
          onOpenOutput={() => {
            void openOutput(state.processResult?.outputPath ?? '')
          }}
        />
      ) : (
        <EmptyState
          title="No active operation"
          body="Select diamonds on the Dashboard, then run Get MP4. Live progress appears here."
          actionLabel="Go to Dashboard"
          onAction={() => dispatch({ type: 'navigate', route: 'dashboard' })}
        />
      )}
    </>
  )
}
