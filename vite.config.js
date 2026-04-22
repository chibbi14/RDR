import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // ターゲットをES2019に下げて、?. などの新構文を互換性のあるコードに変換させる
    target: 'es2019'
  },
  optimizeDeps: {
    esbuildOptions: {
      // 依存関係（node_modules）のプリビルド時もES2019をターゲットにする
      target: 'es2019'
    }
  },
  server: {
    host: true,
    hmr: {
      // CodeSandbox のプロキシ環境下で HMR を動作させるため、
      // クライアントが接続するポートを HTTPS (443) に固定します
      clientPort: 443
    }
  }
})