#!/usr/bin/env node
/**
 * In ra URL truy cập LAN cho frontend/backend (Linux / macOS / Windows).
 * Dùng: node scripts/print-lan-urls.mjs [--open]
 */
import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import os from 'node:os'

const FE_PORT = String(process.env.VITE_PORT || '5173')
const BE_PORT = String(process.env.PORT || '3000')
const OPEN = process.argv.includes('--open')

function ipv4LanAddresses() {
  const nets = os.networkInterfaces()
  const out = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        out.push({ name, address: net.address })
      }
    }
  }
  return out
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: Number(port) }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(1000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

function openUrl(url) {
  const platform = process.platform
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
  } else if (platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
  }
}

async function main() {
  const ips = ipv4LanAddresses()
  console.log('')
  console.log('Growatt — truy cập qua mạng LAN')
  console.log('────────────────────────────────')
  if (ips.length === 0) {
    console.log('Không tìm thấy IPv4 LAN (Wi-Fi/Ethernet). Kiểm tra kết nối mạng.')
    process.exit(1)
  }
  console.log('Địa chỉ LAN:')
  for (const { name, address } of ips) {
    console.log(`  • ${address}  (${name})`)
  }
  const primary = ips[0].address
  console.log('')
  console.log('URL gợi ý (thiết bị khác cùng Wi-Fi/LAN):')
  for (const { address } of ips) {
    console.log(`  Frontend: http://${address}:${FE_PORT}`)
    console.log(`  Backend:  http://${address}:${BE_PORT}`)
    console.log('')
  }
  const localFe = await checkPort('127.0.0.1', FE_PORT)
  const localBe = await checkPort('127.0.0.1', BE_PORT)
  const lanFe = await checkPort(primary, FE_PORT)
  const lanBe = await checkPort(primary, BE_PORT)
  console.log('Trạng thái (localhost):')
  console.log(`  Frontend :${FE_PORT}  ${localFe ? '✓' : '✗ (chưa chạy?)'}`)
  console.log(`  Backend  :${BE_PORT}  ${localBe ? '✓' : '✗ (chưa chạy?)'}`)
  console.log('')
  console.log(`Trạng thái (LAN ${primary}):`)
  console.log(`  Frontend :${FE_PORT}  ${lanFe ? '✓' : '✗'}`)
  console.log(`  Backend  :${BE_PORT}  ${lanBe ? '✓' : '✗'}`)
  console.log('')
  console.log('Chạy server (hai terminal):')
  console.log('  cd server && npm run dev')
  console.log('  npm run dev')
  console.log('')
  console.log('Lần đầu trên máy mới: npm run setup   (cài deps + migrate + tài khoản dev)')
  console.log('')
  console.log('Firewall: mở cổng TCP ' + FE_PORT + ' và ' + BE_PORT + ' nếu thiết bị khác không vào được.')
  console.log('')

  if (OPEN) {
    const url = `http://${primary}:${FE_PORT}`
    console.log('Đang mở trình duyệt:', url)
    try {
      openUrl(url)
    } catch {
      console.log('Không mở được trình duyệt tự động; mở thủ công URL trên.')
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
