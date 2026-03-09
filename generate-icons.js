#!/usr/bin/env node
// Run: node generate-icons.js
// Generates placeholder PNG icons for PWA manifest

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#2563eb'
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.arcTo(size, 0, size, r, r)
  ctx.lineTo(size, size - r)
  ctx.arcTo(size, size, size - r, size, r)
  ctx.lineTo(r, size)
  ctx.arcTo(0, size, 0, size - r, r)
  ctx.lineTo(0, r)
  ctx.arcTo(0, 0, r, 0, r)
  ctx.closePath()
  ctx.fill()

  // Center dot
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // 4 satellite dots
  const dist = size * 0.3
  const dotR = size * 0.07
  const cx = size / 2, cy = size / 2
  const positions = [
    [cx, cy - dist], [cx, cy + dist],
    [cx - dist, cy], [cx + dist, cy]
  ]
  positions.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fill()
  })

  // Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.04
  ctx.lineCap = 'round'
  const lineGap = size * 0.12
  positions.forEach(([x, y]) => {
    const dx = x - cx, dy = y - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / len, uy = dy / len
    ctx.beginPath()
    ctx.moveTo(cx + ux * lineGap, cy + uy * lineGap)
    ctx.lineTo(cx + ux * (dist - dotR - 2), cy + uy * (dist - dotR - 2))
    ctx.stroke()
  })

  return canvas.toBuffer('image/png')
}

;[192, 512].forEach(size => {
  const buf = generateIcon(size)
  const outPath = path.join(__dirname, 'public', 'icons', `icon-${size}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`Generated: icon-${size}.png`)
})
