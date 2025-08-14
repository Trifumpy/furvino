import { loadEnvConfig } from '@next/env'

export function loadEnv() {
  const projectDir = process.cwd()
  // Force loading of .env.local when running in dev/server context
  loadEnvConfig(projectDir, true)
}
