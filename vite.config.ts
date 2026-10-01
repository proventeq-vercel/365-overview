import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { helpLlms } from './src/help-center/vitePlugin'
import { HELP_LLMS, HELP_SECTIONS } from './src/app/help/helpSections'
import { HELP_PATH } from './src/config/helpPath'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    helpLlms({
      dir: path.resolve(__dirname, 'docs/help'),
      sections: HELP_SECTIONS,
      basePath: HELP_PATH,
      ...HELP_LLMS,
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
