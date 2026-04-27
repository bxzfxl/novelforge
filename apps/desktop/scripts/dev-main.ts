import { spawn } from 'child_process'
import path from 'path'

process.env.NODE_ENV = 'development'

// Resolve electron binary path from installed package
const electronPath: unknown = require('electron')
const electron: string = typeof electronPath === 'string' ? electronPath : String(electronPath)

const bootstrap = path.join(__dirname, 'dev-bootstrap.js')

const child = spawn(electron, [bootstrap], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})

process.on('SIGINT', () => child.kill())
process.on('SIGTERM', () => child.kill())
