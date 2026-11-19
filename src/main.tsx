import React from "react"
import ReactDOM from "react-dom/client"
import { registerSW } from "virtual:pwa-register"

import App from "./App"
import "./index.css"
import { initThemeSystem } from "./theme/ThemeContext"

declare global {
  interface Window {
    __onyApplyPwaUpdate?: () => Promise<void>
  }
}

// Initialize theme tokens & dark mode immediately to prevent flash
initThemeSystem()

const updateSW = registerSW({
  immediate: true,

  onNeedRefresh() {
    window.__onyApplyPwaUpdate = () => updateSW(true)
    window.dispatchEvent(new CustomEvent("ony-pwa-update-ready"))
  },

  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("ony-pwa-offline-ready"))
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
