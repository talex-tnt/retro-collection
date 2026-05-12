import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { execSync } from 'child_process';

// Get build metadata
function getBuildMetadata() {
  const buildDate = new Date().toISOString();
  let gitHash = 'unknown';

  try {
    gitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Git not available or not in a git repo
  }

  return { buildDate, gitHash };
}

const { buildDate, gitHash } = getBuildMetadata();

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
