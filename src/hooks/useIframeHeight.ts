import { useEffect } from 'react'

const parentOrigin = import.meta.env.VITE_PARENT_ORIGIN || '*'

export function useIframeHeight() {
  useEffect(() => {
    // Skip if not running inside an iframe
    if (window.parent === window) return

    const interval = setInterval(() => {
      const height = document.documentElement.scrollHeight
      try {
        window.parent.postMessage(['setHeight', height], parentOrigin)
      } catch {
        // Invalid parentOrigin — fall back to unrestricted
        window.parent.postMessage(['setHeight', height], '*')
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])
}
