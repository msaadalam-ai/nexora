import { spawn } from 'node:child_process'

const commands = [
  spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit', env: process.env }),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:web', '--', '--host', '127.0.0.1'], { stdio: 'inherit', env: process.env }),
]

const shutdown = () => {
  for (const command of commands) command.kill()
  process.exit()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
for (const command of commands) command.on('exit', (code) => {
  if (code && code !== 0) shutdown()
})
