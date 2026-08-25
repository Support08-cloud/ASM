import { useMemo } from 'react'
import { useAppStore } from '../app/state/AppStateContext'
import { CompletionDialog } from '../components/dialogs/CompletionDialog'
import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { ProcessingPanel } from '../components/processing/ProcessingPanel'
import { VideoEditor } from '../components/editor/VideoEditor'
import { outputDirFromFiles, projectFromCopiedFiles } from '../services/timeline'

export function OperationsPage() {
  const { state, dispatch, cancelProcessing, openOutput, exportTimeline } = useAppStore()
  const result = state.processResult ?? state.lastProcessResult

  const project = useMemo(() => {
    if (!result) return null
    const copied = result.files.filter((file) => file.status === 'copied')
    if (copied.length === 0) return null
    const diamondName = copied[0].diamondName || 'diamond'
    return projectFromCopiedFiles(copied, outputDirFromFiles(copied, result.outputPath), diamondName)
  }, [result])

  if (state.phase === 'editing' || state.phase === 'exporting') {
    if (!project) {
      return (
        <EmptyState
          title="Nothing to edit"
          body="Run Get MP4 first, then open Edit from the completion screen."
          actionLabel="Go to Dashboard"
          onAction={() => dispatch({ type: 'navigate', route: 'dashboard' })}
        />
      )
    }
    return (
      <VideoEditor
        project={project}
        exporting={state.exportProgress}
        onClose={() => dispatch({ type: 'close-editor' })}
        onExport={(next) => {
          void exportTimeline(next)
        }}
      />
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Operations"
        description="Watch Get MP4 jobs, then edit the extracted videos on a CapCut-style timeline."
      />
      {state.phase === 'processing' && state.processProgress ? (
        <ProcessingPanel progress={state.processProgress} onCancel={cancelProcessing} />
      ) : state.phase === 'completed' && state.processResult ? (
        <CompletionDialog
          result={state.processResult}
          onDone={() => dispatch({ type: 'dismiss-completion' })}
          onEdit={() => dispatch({ type: 'open-editor' })}
          onOpenOutput={() => {
            void openOutput(state.processResult?.outputPath ?? '')
          }}
        />
      ) : result ? (
        <EmptyState
          title="Ready to edit"
          body="Open the last extracted diamond videos in the timeline editor."
          actionLabel="Edit videos"
          onAction={() => dispatch({ type: 'open-editor' })}
          secondaryLabel="Go to Dashboard"
          onSecondary={() => dispatch({ type: 'navigate', route: 'dashboard' })}
        />
      ) : (
        <EmptyState
          title="No active operation"
          body="Select variant folders on the Dashboard, then run Get MP4. Live progress and Edit appear here."
          actionLabel="Go to Dashboard"
          onAction={() => dispatch({ type: 'navigate', route: 'dashboard' })}
        />
      )}
    </>
  )
}
