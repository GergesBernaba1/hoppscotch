import { tuple } from "io-ts"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        soap: resolve(__dirname, "src/soap/index.ts"),
      },
      fileName: (format, entryName) => {
        if (entryName === "index") {
          return `hoppscotch-data.${format === "es" ? "js" : "cjs"}`
        }
        return `${entryName}.${format === "es" ? "js" : "cjs"}`
      },
      formats: ["es", "cjs"],
    },
  },
})
