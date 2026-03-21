'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/auth/AuthModal'

export default function TopHeader() {
  const user = useAuthStore((s) => s.user)
  const [showAuth, setShowAuth] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <>
      <header className="border-b border-white/10 bg-[#0f0f1a]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-wider text-violet-400">
            推しリンク
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-white/40 hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-1.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
