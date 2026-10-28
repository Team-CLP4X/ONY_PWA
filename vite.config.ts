import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === "development"

  return {
    base: "/",

    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
    },

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        manifestFilename: "manifest.webmanifest",
        includeAssets: [
          "favicon.png",
          "apple-touch-icon.png",
          "apple-touch-icon-180x180.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
          "pwa-maskable-512x512.png",
        ],
        manifest: {
          name: "ONY",
          short_name: "ONY",
          description:
            "Designed for Malaysian young adults, this emotional-support app offers a friendly chatbot, community engagement, and personalized resources for everyday well-being.",
          theme_color: "#fff9f1",
          background_color: "#fff9f1",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "3000", 10),
      strictPort: true,
      allowedHosts: true,
      hmr: false,
      watch: {
        ignored: ["**/.figma/**"],
      },
    },

    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "3000", 10),
    },
  }
})
