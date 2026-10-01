import { useAppKitEvents } from '@reown/appkit/react'
import { useEffect } from 'react'

// ============================================================================
// Types
// ============================================================================

type StyleConfig = Record<string, string>

// ============================================================================
// DOM Helpers
// ============================================================================

/**
 * Apply multiple CSS styles with !important priority to an element
 */
const setStyles = (element: HTMLElement, styles: StyleConfig): void => {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, 'important')
  })
}

/**
 * Find an element recursively through Shadow DOM
 */
const findInShadowDOM = (root: Document | ShadowRoot | Element, selector: string): HTMLElement | null => {
  const element = root.querySelector(selector) as HTMLElement | null

  if (element) return element

  const children = Array.from(root.querySelectorAll('*'))

  for (const child of children) {
    if (child.shadowRoot) {
      const result = findInShadowDOM(child.shadowRoot, selector)

      if (result) return result
    }
  }

  return null
}

/**
 * Inject CSS into a Shadow Root with a unique ID (prevents duplicates)
 */
const injectShadowStyle = (shadowRoot: ShadowRoot, id: string, css: string): HTMLStyleElement => {
  let styleEl = shadowRoot.querySelector(`#${id}`) as HTMLStyleElement | null

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = id
    shadowRoot.appendChild(styleEl)
  }
  styleEl.textContent = css

  return styleEl
}

// ============================================================================
// Constants
// ============================================================================

const TAB_STYLES: StyleConfig = {
  'margin-top': '0px',
  height: '52px',
  width: '100%',
  background: 'var(--wui-color-gray-glass-002)',
  display: 'flex',
  justifyContent: 'center',
  borderRadius: 'var(--wui-border-radius-xs)',
  'border-radius': '16px',
}

const DESKTOP_TAB_STYLES: StyleConfig = {
  fontWeight: '400',
  display: 'flex',
  width: '100%',
  height: '48px',
  minHeight: '0px',
  boxSizing: 'border-box',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0px',
  backgroundColor: 'transparent',
  background: 'transparent',
  'border-radius': '16px',
  color: 'var(--wui-color-fg-200)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  'font-size': 'var(--wui-font-size-paragraph)',
  'font-family': 'var(--wui-font-family)',
}

const INNER_FLEX_STYLES: StyleConfig = {
  background: 'transparent',
  width: '100%',
  height: 'auto',
  minHeight: '0',
  padding: '0',
  margin: '0',
}

const TAB_CSS = `
  :host::before,
  *::before {
    display: none !important;
    content: none !important;
  }
`

const RETRY_DELAYS = [10, 100] as const
const MOVE_TAB_RETRY_DELAYS = [10, 100] as const

// ============================================================================
// Customize AppKit Tabs
// ============================================================================

export function customizeAppKitTabs(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  let stopped = false
  let observer: MutationObserver | null = null

  const customize = (): void => {
    if (stopped) return

    const tabs = findInShadowDOM(document, 'wui-tabs')

    if (!tabs?.shadowRoot) return

    const mobileTab = tabs.shadowRoot.querySelector('wui-tab-item[data-testid="tab-mobile"]') as HTMLElement | null
    const desktopTab = tabs.shadowRoot.querySelector('wui-tab-item[data-testid="tab-desktop"]') as HTMLElement | null
    const buttonDesktopTab = desktopTab?.querySelector('button') as HTMLElement | null

    if (!desktopTab) return

    // Apply styles to wui-tabs container
    setStyles(tabs, TAB_STYLES)
    injectShadowStyle(tabs.shadowRoot, 'custom-wui-tabs-style', TAB_CSS)

    // Hide mobile tab
    mobileTab?.style.setProperty('display', 'none', 'important')

    // Customize desktop tab
    // desktopTab.innerText = 'KEYRING PRO Desktop'
    if (buttonDesktopTab) {
      buttonDesktopTab?.innerText == 'KEYRING PRO Desktop'
    }
    setStyles(desktopTab, DESKTOP_TAB_STYLES)

    // Style inner flex containers
    Array.from(tabs.shadowRoot.querySelectorAll('wui-flex')).forEach((el) => {
      setStyles(el as HTMLElement, INNER_FLEX_STYLES)
    })
  }

  // Initial run
  customize()

  // Retry with delays for async rendering
  const timers = RETRY_DELAYS.map((delay) => window.setTimeout(() => customize(), delay))

  // Watch for DOM changes
  observer = new MutationObserver(() => customize())
  observer.observe(document.body, { childList: true, subtree: true })

  // Cleanup
  return () => {
    stopped = true
    timers.forEach((timer) => window.clearTimeout(timer))
    observer?.disconnect()
    observer = null
  }
}

// ============================================================================
// Move AppKit Tabs Below Copy Link
// ============================================================================

export function moveAppKitTabsBelowCopyLink(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  let stopped = false
  let observer: MutationObserver | null = null

  const moveTabs = (): boolean => {
    if (stopped) return false

    const copyLink = findInShadowDOM(document, 'wui-button')

    if (!copyLink) return false

    const tabs = findInShadowDOM(document, 'wui-tabs')

    if (!tabs) return false

    const parent = copyLink.parentElement

    if (!parent) return false

    // Already in correct position
    if (tabs.parentElement === parent && tabs.previousElementSibling === copyLink) {
      return true
    }

    parent.insertBefore(tabs, copyLink.nextSibling)

    // Style the moved tabs
    tabs.style.setProperty('margin-top', '16px', 'important')
    tabs.style.setProperty('width', '100%', 'important')

    return true
  }

  // Initial run
  moveTabs()

  // Retry with delays
  const timers = MOVE_TAB_RETRY_DELAYS.map((delay) => window.setTimeout(() => moveTabs(), delay))

  // Watch for DOM changes
  observer = new MutationObserver(() => moveTabs())
  observer.observe(document.body, { childList: true, subtree: true })

  // Cleanup
  return () => {
    stopped = true
    timers.forEach((timer) => window.clearTimeout(timer))
    observer?.disconnect()
    observer = null
  }
}

// ============================================================================
// Hide AppKit Help Button
// ============================================================================

export function hideAppKitHelpButton(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const hiddenMarker = 'data-help-hidden-by-app'
  const selectors = ['wui-ux-by-reown', 'w3m-connecting-header']

  const visitRoot = (root: ParentNode | null): void => {
    if (!root) return
    hideInsideRoot(root as HTMLElement | Document)

    if (!root.querySelectorAll) return

    Array.from(root.querySelectorAll('*')).forEach((node: Element) => {
      if (node.shadowRoot) {
        visitRoot(node.shadowRoot)
      }
    })
  }

  const hideInsideRoot = (root: HTMLElement | Document): void => {
    if (!root?.querySelectorAll) return

    selectors.forEach((selector: string) => {
      Array.from(root.querySelectorAll(selector)).forEach((node: Element) => {
        const el = node as HTMLElement

        el.setAttribute(hiddenMarker, 'true')
        el.style.setProperty('display', 'none', 'important')
        el.style.setProperty('visibility', 'hidden', 'important')
        el.style.setProperty('opacity', '0', 'important')
        el.style.setProperty('pointer-events', 'none', 'important')
        el.style.setProperty('width', '0', 'important')
        el.style.setProperty('min-width', '0', 'important')
        el.style.setProperty('overflow', 'hidden', 'important')
      })
    })
  }

  const scanAll = (): void => {
    visitRoot(document)
  }

  scanAll()

  const observer = new MutationObserver(() => {
    scanAll()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  })

  return () => observer.disconnect()
}

// ============================================================================
// Hook
// ============================================================================

export const useReCustomWeb3Modal = (): void => {
  const { data } = useAppKitEvents()

  useEffect(() => {
    const cleanupHideHelpButton = hideAppKitHelpButton()
    const moveBelowCopyLink = moveAppKitTabsBelowCopyLink()
    const cleanupCustomizeTabs = customizeAppKitTabs()

    return () => {
      cleanupHideHelpButton()
      moveBelowCopyLink()
      cleanupCustomizeTabs()
    }
  }, [data])
}
