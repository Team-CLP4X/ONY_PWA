import React from "react"

import ReactDOM from "react-dom/client"

import { registerSW } from "virtual:pwa-register"

import App from "./App"

import "./index.css"
import { initThemeSystem } from "./theme/ThemeContext"

// Initialize theme tokens & dark mode immediately to prevent flash
initThemeSystem();

registerSW({
  immediate: true,

  onNeedRefresh() {
    // New app shell version downloaded; automatically adopted
  },

  onOfflineReady() {
    console.info("ONY app shell is ready for offline loading.")
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
