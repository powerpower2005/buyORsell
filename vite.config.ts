import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serveDataDir() {
  return {
    name: "serve-data-dir",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/data", (req, res, next) => {
        const rel = (req.url ?? "/").split("?")[0];
        const filePath = path.join(__dirname, "data", rel);
        if (!filePath.startsWith(path.join(__dirname, "data"))) {
          res.statusCode = 403;
          res.end();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const src = path.join(__dirname, "data");
      const dest = path.join(__dirname, "dist", "data");
      if (!fs.existsSync(src)) return;
      fs.mkdirSync(dest, { recursive: true });
      const copy = (from: string, to: string) => {
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
          const s = path.join(from, entry.name);
          const d = path.join(to, entry.name);
          if (entry.isDirectory()) {
            fs.mkdirSync(d, { recursive: true });
            copy(s, d);
          } else {
            fs.copyFileSync(s, d);
          }
        }
      };
      copy(src, dest);
    },
  };
}

const pagesRepoName =
  process.env.VITE_GITHUB_REPO?.split("/")[1] ?? "buyORsell";

export default defineConfig({
  base:
    process.env.GITHUB_PAGES === "true" ? `/${pagesRepoName}/` : "/",
  plugins: [
    react(),
    serveDataDir(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "manifest.json"],
      manifest: {
        name: "개미브레인롯",
        short_name: "개미브레인롯",
        description: "OHLCV 기술 분석",
        theme_color: "#191919",
        background_color: "#191919",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,svg,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "github-raw-data",
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
  publicDir: "public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
