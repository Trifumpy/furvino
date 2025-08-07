import { loadEnvConfig } from '@next/env'
 
export default async function load() {
  const projectDir = process.cwd()
  loadEnvConfig(projectDir)
}
