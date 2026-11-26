import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "envelope-reveal": "src/components/envelope-reveal/index.ts",
        "wedding-journey": "src/components/wedding-journey/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "cn"],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
