import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { APP } from '../src/app.config'

const TIMEOUT = { timeout: 8_000 }

describe('app shell', () => {
  it('walks from the empty state through a completed run', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText(`Welcome to ${APP.name}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load sample dataset' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' }, TIMEOUT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Records' }))
    expect(screen.getByRole('heading', { name: 'Records' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select AURORA' }))
    expect(screen.getByText('1 record selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Run task/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start run' }))
    expect(await screen.findByText('Run complete', undefined, TIMEOUT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View history' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument())
    expect(screen.getByText('1 record')).toBeInTheDocument()
  })

  it('filters records from the search field', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Load sample dataset' }))
    await screen.findByRole('heading', { name: 'Dashboard' }, TIMEOUT)

    await user.click(screen.getByRole('button', { name: 'Records' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search records' }), 'aurora')

    expect(screen.getByText('1 record')).toBeInTheDocument()
    expect(screen.getByText('AURORA')).toBeInTheDocument()
    expect(screen.queryByText('BASALT')).not.toBeInTheDocument()
  })

  it('persists the theme choice to local storage', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'light' }))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(localStorage.getItem(`${APP.slug}.settings.v1`)).toContain('"theme":"light"')
  })
})
