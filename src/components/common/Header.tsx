'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useDiagramStore } from '@/store/diagramStore'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/auth/AuthModal'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const [showAuth, setShowAuth] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [q, setQ] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const profileRef = useRef<HTMLDivElement>(null)

  const isEditorPage = pathname.startsWith('/editor/') || pathname.startsWith('/diagram/')
  const title = useDiagramStore((s) => s.title)
  const setTitle = useDiagramStore((s) => s.setTitle)

  // プロフィールメニューの外クリックで閉じる
  useEffect(() => {
    if (!profileOpen) return
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfileOpen(false)
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/')
  }

  return (
    <>
      <header className="shrink-0 border-b border-white/10 bg-[#0f0f1a]/90 backdrop-blur-sm z-30">
        <div className="px-4 h-12 flex items-center gap-2">
          {/* タイトル */}
          <Link href="/" className="text-base font-bold tracking-wider text-violet-400 whitespace-nowrap shrink-0">
            推しリンク
          </Link>

          {isEditorPage ? (
            /* エディタページ: タイトル入力欄 */
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトルを入力"
              className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/25 outline-none focus:border-violet-500 min-w-0"
            />
          ) : (
            <>
              {/* 検索フォーム（常に表示・虫眼鏡が実行ボタン） */}
              <form onSubmit={handleSearch} className="flex-1 flex items-center min-w-0">
                <div className="flex-1 flex items-center rounded-lg bg-white/5 border border-white/10 focus-within:border-violet-500 overflow-hidden min-w-0">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="テンプレートを検索..."
                    className="flex-1 px-3 py-1.5 text-sm bg-transparent text-white placeholder:text-white/25 outline-none min-w-0"
                  />
                  <button
                    type="submit"
                    className="px-2.5 h-full flex items-center text-white/40 hover:text-white transition-colors shrink-0"
                    aria-label="検索"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* 作成アイコン（モバイル） / テキストボタン（デスクトップ） */}
              <Link
                href="/template/new"
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors shrink-0"
                aria-label="テンプレート作成"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
              <Link
                href="/template/new"
                className="hidden sm:block px-3 py-1.5 rounded-lg text-sm font-bold bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                ＋ テンプレート作成
              </Link>
            </>
          )}

          {/* プロフィール / ログイン */}
          {user ? (
            <div ref={profileRef} className="relative shrink-0">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                title={user.email ?? 'プロフィール'}
                className="w-9 h-9 rounded-full bg-violet-700 hover:bg-violet-600 flex items-center justify-center text-white text-sm font-bold transition-colors"
              >
                {user.email?.charAt(0).toUpperCase() ?? '?'}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl overflow-hidden z-50">
                  {/* メールアドレス表示 */}
                  <div className="px-4 py-2.5 border-b border-white/5">
                    <p className="text-xs text-white/40 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    マイページ
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors border-t border-white/5"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowAuth(true)}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors shrink-0"
                aria-label="ログイン"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="hidden sm:block px-4 py-1.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors shrink-0"
              >
                ログイン
              </button>
            </>
          )}
        </div>
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); router.refresh() }}
        />
      )}
    </>
  )
}
