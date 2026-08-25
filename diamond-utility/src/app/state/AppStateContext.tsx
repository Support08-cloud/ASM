import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import { filterDiamonds } from '../../services/search'
import { groupDiamonds } from '../../services/diamond-parser'
import { buildDemoDiamonds, buildDemoFolders, DEMO_OUTPUT_PATH, DEMO_SOURCE_PATH } from '../../services/demo-data'
import { scanDirectory } from '../../services/scanner'
import { countSelectedFolders, countSelectedMp4s, extractMp4s } from '../../services/mp4-processor'
import { loadHistory, loadPaths, loadSettings, saveHistory, savePaths, saveSettings } from '../../services/settings'
import { uid } from '../../utils/format'
import { initialState, reducer, type AppAction, type AppState } from './machine'
import { withSelectedFolders, type Diamond } from '../../models/diamond'
import type { EditorProject } from '../../models/editor'
import type { ConfirmSummary, HistoryRecord, ProcessResult } from '../../models/processing'
import { buildExportPlan, concatListContents } from '../../services/ffmpeg-export'
import { exportFileName } from '../../services/timeline'

interface AppStoreValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  visibleDiamonds: Diamond[]
  selectedDiamonds: Diamond[]
  confirmSummary: ConfirmSummary | null
  detailsDiamond: Diamond | null
  loadSample: () => Promise<void>
  chooseSource: () => Promise<void>
  chooseOutput: () => Promise<void>
  rescan: () => Promise<void>
  startGetMp4: () => void
  confirmGetMp4: () => Promise<void>
  exportTimeline: (project: EditorProject) => Promise<void>
  cancelProcessing: () => void
  openOutput: (target: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)
  const sourceHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const settings = loadSettings()
    const history = loadHistory()
    const paths = loadPaths()
    dispatch({
      type: 'hydrate',
      settings,
      history,
      sourcePath: paths.sourcePath,
      outputPath: paths.outputPath,
    })
  }, [])

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    saveHistory(state.history)
  }, [state.history])

  useEffect(() => {
    savePaths({
      sourcePath: state.sourcePath ?? undefined,
      outputPath: state.outputPath ?? undefined,
    })
  }, [state.sourcePath, state.outputPath])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
  }, [state.settings.theme])

  const visibleDiamonds = useMemo(
    () => filterDiamonds(state.diamonds, state.search, state.filters),
    [state.diamonds, state.search, state.filters],
  )

  const selectedDiamonds = useMemo(
    () => withSelectedFolders(state.diamonds, state.selectedIds),
    [state.diamonds, state.selectedIds],
  )

  const detailsDiamond = useMemo(
    () => state.diamonds.find((diamond) => diamond.id === state.detailsId) ?? null,
    [state.diamonds, state.detailsId],
  )

  const confirmSummary = useMemo<ConfirmSummary | null>(() => {
    if (state.phase !== 'confirming') return null
    return {
      diamondCount: selectedDiamonds.length,
      folderCount: countSelectedFolders(selectedDiamonds),
      mp4Count: countSelectedMp4s(selectedDiamonds),
      diamonds: selectedDiamonds,
      outputPath: state.outputPath ?? '',
    }
  }, [state.phase, state.outputPath, selectedDiamonds])

  const toast = (tone: 'success' | 'warning' | 'error' | 'info', title: string) => {
    const id = uid('toast')
    dispatch({ type: 'add-toast', toast: { id, tone, title } })
    window.setTimeout(() => dispatch({ type: 'dismiss-toast', id }), 4200)
  }

  const runScan = async (kind: 'demo' | 'directory') => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    dispatch({ type: 'scan-start' })
    try {
      if (kind === 'demo') {
        const folders = buildDemoFolders()
        const total = folders.length
        for (let i = 1; i <= total; i += 1) {
          if (controller.signal.aborted) return
          dispatch({
            type: 'scan-progress',
            progress: {
              foldersScanned: i,
              filesSeen: i * 6,
              percent: Math.round((i / total) * 100),
              message: 'Reading folders and media files',
            },
          })
          await wait(16)
        }
        dispatch({
          type: 'scan-success',
          diamonds: buildDemoDiamonds(),
          foldersScanned: folders.length,
          scannedAt: new Date().toISOString(),
        })
        toast('success', `${folders.length} folders scanned`)
        return
      }
      if (window.desktop?.isElectron) {
        const root = stateRef.current.sourcePath
        if (!root) {
          dispatch({
            type: 'scan-error',
            title: 'Unable to read this folder.',
            detail: 'Choose a source folder again, then retry the scan.',
          })
          return
        }
        dispatch({
          type: 'scan-progress',
          progress: { foldersScanned: 0, filesSeen: 0, percent: 8, message: 'Reading folders and media files' },
        })
        const scanned = await window.desktop.scanDirectory(root)
        if (controller.signal.aborted) return
        dispatch({
          type: 'scan-progress',
          progress: {
            foldersScanned: scanned.foldersScanned,
            filesSeen: scanned.filesSeen,
            percent: 100,
            message: 'Scan complete',
          },
        })
        dispatch({
          type: 'scan-success',
          diamonds: groupDiamonds(scanned.folders),
          foldersScanned: scanned.foldersScanned,
          scannedAt: new Date().toISOString(),
        })
        toast('success', `${scanned.foldersScanned} folders scanned`)
        return
      }
      const handle = sourceHandleRef.current
      if (!handle) {
        dispatch({
          type: 'scan-error',
          title: 'Unable to read this folder.',
          detail: 'Choose a source folder again, then retry the scan.',
        })
        return
      }
      const folders = await scanDirectory(
        handle,
        (progress) => dispatch({ type: 'scan-progress', progress }),
        controller.signal,
      )
      dispatch({
        type: 'scan-success',
        diamonds: groupDiamonds(folders),
        foldersScanned: folders.length,
        scannedAt: new Date().toISOString(),
      })
      toast('success', `${folders.length} folders scanned`)
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      dispatch({
        type: 'scan-error',
        title: 'Unable to read this folder.',
        detail:
          error instanceof Error
            ? error.message
            : 'The folder may have been moved, deleted, or you may not have permission to access it.',
        path: stateRef.current.sourcePath ?? undefined,
      })
    }
  }

  const loadSample = async () => {
    dispatch({ type: 'set-source', path: DEMO_SOURCE_PATH, kind: 'demo' })
    dispatch({ type: 'set-output', path: DEMO_OUTPUT_PATH })
    sourceHandleRef.current = null
    await runScan('demo')
  }

  const chooseSource = async () => {
    if (window.desktop?.isElectron) {
      try {
        const picked = await window.desktop.pickDirectory()
        if (!picked) return
        sourceHandleRef.current = null
        dispatch({ type: 'set-source', path: picked, kind: 'directory' })
        await runScan('directory')
      } catch {
        toast('error', 'Could not open the selected folder')
      }
      return
    }
    if (typeof window.showDirectoryPicker !== 'function') {
      await loadSample()
      toast('info', 'Folder picker is unavailable — loaded sample data')
      return
    }
    try {
      const handle = await window.showDirectoryPicker({ id: 'diamond-source', mode: 'read' })
      sourceHandleRef.current = handle
      dispatch({ type: 'set-source', path: handle.name, kind: 'directory' })
      await runScan('directory')
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast('error', 'Could not open the selected folder')
    }
  }

  const chooseOutput = async () => {
    if (window.desktop?.isElectron) {
      try {
        const picked = await window.desktop.pickDirectory()
        if (!picked) return
        dispatch({ type: 'set-output', path: picked })
        toast('success', 'Output folder selected')
      } catch {
        toast('error', 'Could not open the output folder')
      }
      return
    }
    if (typeof window.showDirectoryPicker !== 'function') {
      dispatch({ type: 'set-output', path: DEMO_OUTPUT_PATH })
      toast('info', 'Using sample output location')
      return
    }
    try {
      const handle = await window.showDirectoryPicker({ id: 'diamond-output', mode: 'readwrite' })
      dispatch({ type: 'set-output', path: handle.name })
      toast('success', 'Output folder selected')
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast('error', 'Could not open the output folder')
    }
  }

  const rescan = async () => {
    if (stateRef.current.sourceKind === 'none' || !stateRef.current.sourcePath) {
      await chooseSource()
      return
    }
    await runScan(stateRef.current.sourceKind === 'demo' ? 'demo' : 'directory')
  }

  const startGetMp4 = () => {
    if (!stateRef.current.outputPath) {
      toast('warning', 'Select an output folder first')
      return
    }
    if (stateRef.current.selectedIds.length === 0) {
      toast('info', 'Select one or more variant folders to enable processing.')
      return
    }
    dispatch({ type: 'open-confirm' })
  }

  const confirmGetMp4 = async () => {
    const current = stateRef.current
    const selected = withSelectedFolders(current.diamonds, current.selectedIds)
    if (selected.length === 0 || !current.outputPath) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({
      type: 'process-start',
      progress: {
        diamondIndex: 0,
        diamondTotal: selected.length,
        currentDiamond: selected[0]?.baseName ?? '',
        percent: 0,
        jobs: [],
      },
    })

    try {
      const result = await extractMp4s({
        diamonds: selected,
        outputPath: current.outputPath,
        duplicatePolicy: current.settings.duplicatePolicy,
        signal: controller.signal,
        onProgress: (progress) => dispatch({ type: 'process-progress', progress }),
        copyFile: window.desktop?.isElectron
          ? (sourcePath, destinationPath) => window.desktop!.copyFile(sourcePath, destinationPath)
          : undefined,
      })
      const record = toHistory(result, selected, current.sourcePath ?? 'Unknown', new Date().toISOString())
      dispatch({ type: 'process-complete', result, record })
      if (result.outcome === 'success') toast('success', `${result.copied} MP4 files copied`)
      else if (result.outcome === 'partial') toast('warning', `${result.failed} file${result.failed === 1 ? '' : 's'} failed`)
      else toast('error', result.errorMessage ?? 'Processing failed')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        dispatch({ type: 'dismiss-completion' })
        toast('info', 'Processing cancelled')
        return
      }
      const result: ProcessResult = {
        outcome: 'error',
        copied: 0,
        skipped: 0,
        failed: selected.length,
        total: selected.length,
        outputPath: current.outputPath,
        files: [],
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      }
      dispatch({
        type: 'process-complete',
        result,
        record: toHistory(result, selected, current.sourcePath ?? 'Unknown', new Date().toISOString()),
      })
    }
  }

  const openOutput = async (target: string) => {
    if (window.desktop?.isElectron) {
      try {
        await window.desktop.openPath(target)
      } catch {
        toast('error', 'Could not open the output folder')
      }
      return
    }
    toast('info', 'Open the output folder from Explorer')
  }

  const cancelProcessing = () => {
    abortRef.current?.abort()
  }

  const exportTimeline = async (project: EditorProject) => {
    const plan = buildExportPlan(project)
    dispatch({ type: 'export-start' })
    try {
      if (window.desktop?.writeTextFile) {
        const concatStep = plan.steps.find((step) => step.args.includes('concat'))
        if (concatStep) {
          const inputAt = concatStep.args.indexOf('-i')
          const listPath = concatStep.args[inputAt + 1]
          if (listPath) await window.desktop.writeTextFile(listPath, concatListContents(project.clips, project.outputDir))
        }
      }
      for (let i = 0; i < plan.steps.length; i += 1) {
        const step = plan.steps[i]
        dispatch({
          type: 'export-progress',
          percent: Math.round((i / Math.max(plan.steps.length, 1)) * 100),
          message: step.label,
        })
        if (window.desktop?.runFfmpeg) {
          await window.desktop.runFfmpeg(step.args)
        } else {
          await wait(260)
        }
      }
      dispatch({
        type: 'export-progress',
        percent: 100,
        message: 'Finishing',
      })
      const result: ProcessResult = {
        outcome: 'success',
        copied: 1,
        skipped: 0,
        failed: 0,
        total: 1,
        outputPath: plan.outputPath,
        files: [
          {
            diamondName: project.diamondName,
            viewLabel: exportFileName(project.diamondName),
            sourcePath: 'timeline',
            outputPath: plan.outputPath,
            status: 'copied',
          },
        ],
      }
      dispatch({ type: 'export-complete', result })
      toast('success', window.desktop?.runFfmpeg ? 'Edited video exported' : `Export planned: ${exportFileName(project.diamondName)}`)
    } catch (error) {
      dispatch({
        type: 'export-complete',
        result: {
          outcome: 'error',
          copied: 0,
          skipped: 0,
          failed: 1,
          total: 1,
          outputPath: plan.outputPath,
          files: [],
          errorMessage: error instanceof Error ? error.message : 'Export failed',
        },
      })
      toast('error', 'Could not export the edited video')
    }
  }

  const value: AppStoreValue = {
    state,
    dispatch,
    visibleDiamonds,
    selectedDiamonds,
    confirmSummary,
    detailsDiamond,
    loadSample,
    chooseSource,
    chooseOutput,
    rescan,
    startGetMp4,
    confirmGetMp4,
    exportTimeline,
    cancelProcessing,
    openOutput,
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore must be used within AppStoreProvider')
  return value
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function toHistory(
  result: ProcessResult,
  diamonds: Diamond[],
  sourcePath: string,
  finishedAt: string,
): HistoryRecord {
  return {
    id: uid('job'),
    startedAt: finishedAt,
    finishedAt,
    diamondCount: diamonds.length,
    diamondNames: diamonds.map((diamond) => diamond.baseName),
    copied: result.copied,
    skipped: result.skipped,
    failed: result.failed,
    outcome: result.outcome,
    outputPath: result.outputPath,
    sourcePath,
  }
}
