import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file from the 'env' directory
  const env = loadEnv(mode, process.cwd() + '/env', '');
  
  return {
    envDir: './env',
    server: {
      port: 3000, // Default port or use env.PORT if needed
    },
    publicDir: 'public',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});
