import { AppStoreProvider } from './app/state/AppStateContext'
import { AppShell } from './app/AppShell'

export default function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  )
}
