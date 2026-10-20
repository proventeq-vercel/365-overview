import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { helpLlms } from './src/help-center/vitePlugin'
import { HELP_LLMS, HELP_SECTIONS } from './src/app/help/helpSections'
import { helpBoot } from './src/app/help/helpBoot'
import { HELP_PATH } from './src/config/helpPath'
import { readFeatures } from './src/config/featureFlags'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const features: ReadonlySet<string> = readFeatures(loadEnv(mode, __dirname).VITE_FEATURES)
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      helpLlms({
        dir: path.resolve(__dirname, 'docs/help'),
        sections: HELP_SECTIONS,
        basePath: HELP_PATH,
        ...HELP_LLMS,
        enabled: (feature) => features.has(feature),
      }),
      helpBoot({ entry: 'src/app/help/HelpPage.tsx' }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
