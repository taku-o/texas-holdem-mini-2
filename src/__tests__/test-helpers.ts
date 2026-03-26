import { loadConfigFromFile } from 'vite'
import type { UserConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(__dirname, '../../')

export async function loadConfig(filename: string): Promise<UserConfig> {
  const configPath = path.resolve(PROJECT_ROOT, filename)
  const result = await loadConfigFromFile({ command: 'serve', mode: 'test' }, configPath)
  if (!result) {
    throw new Error(`Failed to load config from ${configPath}`)
  }
  return result.config
}

export function loadProjectFile(relativePath: string): string {
  const filePath = path.resolve(PROJECT_ROOT, relativePath)
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadPackageJson(): Record<string, unknown> {
  return JSON.parse(loadProjectFile('package.json')) as Record<string, unknown>
}
