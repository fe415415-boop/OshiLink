import { Theme, FontStyle } from '@/store/diagramStore'

type RelationTag = string
type Strength = 'strong' | 'medium' | 'weak'

export interface ThemeConfig {
  background: string
  nodeBg: string
  nodeBorder: string
  nodeText: string
  edgeDefault: string
  labelBg: string
  labelText: string
  panelBg: string
  panelBorder: string
  inputBg: string
  boxDefaultColor: string
  boxBorderColor: string
  boxTextColor: string
}

export const THEMES: Record<Theme, ThemeConfig> = {
  dark: {
    background: '#0f0f1a',
    nodeBg: '#1a1a2e',
    nodeBorder: '#7c3aed',
    nodeText: '#e2e8f0',
    edgeDefault: '#7c3aed',
    labelBg: '#1e1b4b',
    labelText: '#c4b5fd',
    panelBg: '#13131f',
    panelBorder: '#2d2d4a',
    inputBg: 'rgba(255,255,255,0.06)',
    boxDefaultColor: '#1e1e3a',
    boxBorderColor: '#3d3d6a',
    boxTextColor: '#a0a0c0',
  },
  pink: {
    background: '#fff0f5',
    nodeBg: '#fce7f3',
    nodeBorder: '#ec4899',
    nodeText: '#831843',
    edgeDefault: '#ec4899',
    labelBg: '#fdf2f8',
    labelText: '#be185d',
    panelBg: '#fce7f3',
    panelBorder: '#fbcfe8',
    inputBg: 'rgba(0,0,0,0.04)',
    boxDefaultColor: '#fce7f3',
    boxBorderColor: '#f9a8d4',
    boxTextColor: '#9d174d',
  },
  simple: {
    background: '#ffffff',
    nodeBg: '#f9fafb',
    nodeBorder: '#374151',
    nodeText: '#111827',
    edgeDefault: '#374151',
    labelBg: '#f3f4f6',
    labelText: '#374151',
    panelBg: '#f9fafb',
    panelBorder: '#e5e7eb',
    inputBg: 'rgba(0,0,0,0.04)',
    boxDefaultColor: '#f3f4f6',
    boxBorderColor: '#d1d5db',
    boxTextColor: '#374151',
  },
  night: {
    background: '#edf2ff',
    nodeBg: '#dbeafe',
    nodeBorder: '#3b82f6',
    nodeText: '#1e3a8a',
    edgeDefault: '#3b82f6',
    labelBg: '#eff6ff',
    labelText: '#1d4ed8',
    panelBg: '#dbeafe',
    panelBorder: '#bfdbfe',
    inputBg: 'rgba(0,0,0,0.04)',
    boxDefaultColor: '#dbeafe',
    boxBorderColor: '#93c5fd',
    boxTextColor: '#1e40af',
  },
  sunset: {
    background: '#fff7ed',
    nodeBg: '#ffedd5',
    nodeBorder: '#f97316',
    nodeText: '#7c2d12',
    edgeDefault: '#f97316',
    labelBg: '#fff8f0',
    labelText: '#c2410c',
    panelBg: '#ffedd5',
    panelBorder: '#fed7aa',
    inputBg: 'rgba(0,0,0,0.04)',
    boxDefaultColor: '#ffedd5',
    boxBorderColor: '#fdba74',
    boxTextColor: '#9a3412',
  },
  mint: {
    background: '#ecfdf5',
    nodeBg: '#d1fae5',
    nodeBorder: '#10b981',
    nodeText: '#064e3b',
    edgeDefault: '#10b981',
    labelBg: '#f0fdf4',
    labelText: '#059669',
    panelBg: '#d1fae5',
    panelBorder: '#a7f3d0',
    inputBg: 'rgba(0,0,0,0.04)',
    boxDefaultColor: '#d1fae5',
    boxBorderColor: '#6ee7b7',
    boxTextColor: '#065f46',
  },
}

export const TAG_COLORS: Record<string, string> = {
  親友: '#3b82f6',
  相棒: '#8b5cf6',
  ライバル: '#ef4444',
  ビジネス: '#06b6d4',
  '♥': '#f43f5e',
}

export function getTagColor(tag: RelationTag, theme: ThemeConfig): string {
  return TAG_COLORS[tag] ?? theme.edgeDefault
}

export const STRENGTH_WIDTH: Record<Strength, number> = {
  strong: 4,
  medium: 2,
  weak: 1,
}

export const STRENGTH_LABELS: Record<Strength, string> = {
  strong: '強',
  medium: '中',
  weak: '弱',
}

export const FONT_FAMILIES: Record<FontStyle, string> = {
  cool: '"Noto Sans JP", sans-serif',
  pop: '"Zen Maru Gothic", sans-serif',
  emo: '"Klee One", cursive',
  elegant: '"Shippori Mincho", serif',
}

export const FONT_LABELS: Record<FontStyle, string> = {
  cool: 'クール',
  pop: 'ポップ',
  emo: 'エモ',
  elegant: '高級感',
}

export const THEME_LABELS: Record<Theme, string> = {
  dark: 'ダーク',
  pink: 'ピンク',
  simple: 'シンプル',
  night: 'ナイト',
  sunset: 'サンセット',
  mint: 'ミント',
}
