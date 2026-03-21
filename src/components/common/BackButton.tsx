'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-white/30 hover:text-white/60 transition-colors mb-6 inline-block"
    >
      ← 前の画面に戻る
    </button>
  )
}
