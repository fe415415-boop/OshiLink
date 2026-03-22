'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

function AuthReloader() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const loading = useAuthStore((s) => s.loading)
  const isInitial = useRef(true)

  useEffect(() => {
    if (loading) return
    if (isInitial.current) {
      isInitial.current = false
      return
    }
    if (!userId) return
    window.location.reload()
  }, [userId, loading])

  return null
}

export default function DiagramNotFound() {
  return (
    <>
      <AuthReloader />
      <div className="flex items-center justify-center h-full text-white/60 text-sm text-center">
        <p>
          削除された、または現在のステータスが非公開の相関図です。<br />
          作成者の方はログインすることで編集が可能です。
        </p>
      </div>
    </>
  )
}
