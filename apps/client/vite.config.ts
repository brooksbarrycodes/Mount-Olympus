import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import type { Connect } from "vite";

const BG_MUSIC_FILENAME =
  "Valley of Olympus - Ethereal Ancient Greek Mythology Ambient Music - Athena IV (128k).wav";
const audioRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../audio");

/** Serve repo-root ambient track at /audio/bg-music.wav without copying the large file. */
function serveBackgroundMusic(): Plugin {
  return {
    name: "olympus-background-music",
    configureServer(server) {
      mountBgMusic(server.middlewares);
    },
    configurePreviewServer(server) {
      mountBgMusic(server.middlewares);
    },
  };
}

function mountBgMusic(middlewares: Connect.Server): void {
  middlewares.use("/audio/bg-music.wav", (req, res) => {
    const filePath = path.join(audioRoot, BG_MUSIC_FILENAME);
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Background music file not found in /audio");
      return;
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : total - 1;
        if (start >= total || end >= total) {
          res.statusCode = 416;
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
        res.setHeader("Content-Length", String(end - start + 1));
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.setHeader("Content-Length", String(total));
    fs.createReadStream(filePath).pipe(res);
  });
}

export default defineConfig({
  plugins: [react(), serveBackgroundMusic()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    sourcemap: true,
    // Phaser is large; bump the warning ceiling so builds stay quiet.
    chunkSizeWarningLimit: 1500,
  },
});
