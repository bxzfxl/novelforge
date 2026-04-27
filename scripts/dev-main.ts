import { spawn } from 'child_process'
import path from 'path'

const electronPath = path.join(
  __dirname, '..', 'apps', 'desktop', 'node_modules', '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)

const p = spawn(electronPath, ['.'], {
  cwd: path.join(__dirname, '..', 'apps', 'desktop'),
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit',
})

p.on('close', (code) => process.exit(code ?? 0))
