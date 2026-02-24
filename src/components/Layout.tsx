import type { ReactNode } from 'react'
import { SaltusLogo } from './SaltusLogo'
import { ThemeToggle } from './ThemeToggle'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <SaltusLogo className="h-8 text-coral" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <SaltusLogo className="h-6 text-muted-fg" />
          <div className="flex gap-6 font-body text-xs text-muted-fg">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
