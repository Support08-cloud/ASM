import type { AppPhase } from '../models/app'

export function phaseLabel(phase: AppPhase): string {
  switch (phase) {
    case 'loading':
      return 'Loading'
    case 'running':
      return 'Running'
    case 'load_error':
      return 'Load error'
    case 'completed':
      return 'Complete'
    case 'idle':
    case 'ready':
    case 'confirming':
      return 'Ready'
    default:
      return assertNever(phase)
  }
}

export function phaseDotClass(phase: AppPhase): string {
  switch (phase) {
    case 'loading':
    case 'running':
      return ' busy'
    case 'load_error':
      return ' err'
    case 'completed':
      return ' warn'
    case 'idle':
    case 'ready':
    case 'confirming':
      return ''
    default:
      return assertNever(phase)
  }
}

function assertNever(phase: never): never {
  throw new Error(`Unhandled phase: ${String(phase)}`)
}
