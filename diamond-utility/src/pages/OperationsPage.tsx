import { useMemo } from 'react'
import { useAppStore } from '../app/state/AppStateContext'
import { CompletionDialog, copiedDiamondNames } from '../components/dialogs/CompletionDialog'
import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { ProcessingPanel } from '../components/processing/ProcessingPanel'
import { VideoEditor } from '../components/editor/VideoEditor'
import { outputDirFromFiles, projectFromCopiedFiles } from '../services/timeline'

export function OperationsPage() {
  const { state, dispatch, cancelProcessing, openOutput, exportTimeline } = useAppStore()
  const result = state.processResult ?? state.lastProcessResult
  const editorSource = state.lastProcessResult ?? state.processResult
  const readyDiamonds = result ? copiedDiamondNames(result) : []

  const project = useMemo(() => {
    if (!editorSource) return null
    const copied = editorSource.files.filter((file) => file.status === 'copied' && !file.outputPath.endsWith('-edit.mp4'))
    const files = copied.length > 0 ? copied : editorSource.files.filter((file) => file.status === 'copied')
    const scoped = state.editorDiamond ? files.filter((file) => file.diamondName === state.editorDiamond) : files
    if (scoped.length === 0) return null
    const diamondName = state.editorDiamond || scoped[0].diamondName || 'diamond'
    return projectFromCopiedFiles(scoped, outputDirFromFiles(scoped, editorSource.outputPath), diamondName)
  }, [editorSource, state.editorDiamond])

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
          onEdit={(diamondName) => dispatch({ type: 'open-editor', diamondName })}
          onOpenOutput={() => {
            void openOutput(state.processResult?.outputPath ?? '')
          }}
        />
      ) : result ? (
        <>
          <EmptyState
            title="Ready to edit"
            body={
              readyDiamonds.length > 1
                ? 'Choose one diamond. The editor opens a single diamond at a time.'
                : 'Open the last extracted diamond videos in the timeline editor.'
            }
            actionLabel={readyDiamonds.length === 1 ? 'Edit videos' : undefined}
            onAction={
              readyDiamonds.length === 1
                ? () => dispatch({ type: 'open-editor', diamondName: readyDiamonds[0] })
                : undefined
            }
            secondaryLabel="Go to Dashboard"
            onSecondary={() => dispatch({ type: 'navigate', route: 'dashboard' })}
          />
          {readyDiamonds.length > 1 ? (
            <div className="btn-row" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              {readyDiamonds.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="btn primary"
                  onClick={() => dispatch({ type: 'open-editor', diamondName: name })}
                >
                  Edit {name}
                </button>
              ))}
            </div>
          ) : null}
        </>
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
