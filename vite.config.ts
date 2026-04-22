import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // ビルド時のターゲットをES2020（オプショナルチェイニング対応）に指定
    target: 'es2020'
  },
  optimizeDeps: {
    esbuildOptions: {
      // 開発サーバー（esbuild）のターゲットも同様に指定
      target: 'es2020'
    }
  }
})