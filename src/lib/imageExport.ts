import { Core } from 'cytoscape'
import { THEMES, FONT_FAMILIES } from './themes'
import { Theme, FontStyle } from '@/store/diagramStore'

export interface ExportOptions {
  cy: Core
  title: string
  theme: Theme
  fontStyle: FontStyle
}

/** グラフ + 右上ブランディングを合成した OffscreenCanvas を返す */
async function buildCompositeCanvas(options: ExportOptions, scale: number): Promise<OffscreenCanvas> {
  const { cy, title, theme: selectedTheme, fontStyle } = options
  const theme = THEMES[selectedTheme]
  const fontFamily = FONT_FAMILIES[fontStyle]

  try { await document.fonts.load(`bold 14px ${fontFamily}`) } catch { /* ignore */ }

  // グラフを余白付きで取得（padding はピクセル単位）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphDataUrl = (cy as any).png({ output: 'base64uri', scale, full: true, padding: 32, bg: theme.background }) as string
  const blob = await fetch(graphDataUrl).then((r) => r.blob())
  const img = await createImageBitmap(blob)

  // ヘッダー帯
  const PAD = Math.round(14 * scale)
  const HEADER_H = Math.round(44 * scale)
  const canvasW = img.width
  const canvasH = img.height + HEADER_H

  const canvas = new OffscreenCanvas(canvasW, canvasH)
  const ctx = canvas.getContext('2d')!

  // 全体背景
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, canvasW, canvasH)

  // ヘッダー背景（少し明るめのパネル色）
  ctx.fillStyle = theme.panelBg
  ctx.fillRect(0, 0, canvasW, HEADER_H)

  // ヘッダー下ボーダー
  ctx.fillStyle = theme.panelBorder
  ctx.fillRect(0, HEADER_H - Math.round(1 * scale), canvasW, Math.round(1 * scale))

  // サイト名（左寄せ・小）
  const SITE_FONT = Math.round(11 * scale)
  ctx.font = `${SITE_FONT}px ${fontFamily}`
  ctx.fillStyle = '#7c3aed'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('推しリンク', PAD, HEADER_H * 0.38)

  // 図タイトル（左寄せ・大）
  const TITLE_FONT = Math.round(15 * scale)
  ctx.font = `bold ${TITLE_FONT}px ${fontFamily}`
  ctx.fillStyle = theme.nodeText
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  if (title) ctx.fillText(title, PAD, HEADER_H * 0.72)

  // グラフをヘッダーの下に配置
  ctx.drawImage(img, 0, HEADER_H)

  return canvas
}

/** モーダルプレビュー用 data URL を生成（非同期） */
export async function buildPreviewDataUrl(options: ExportOptions): Promise<string> {
  const canvas = await buildCompositeCanvas(options, 1.5)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** ダウンロード */
export async function exportToPng(options: ExportOptions): Promise<void> {
  const canvas = await buildCompositeCanvas(options, 2)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${options.title || 'oshilink'}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
