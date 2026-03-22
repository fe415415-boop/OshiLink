'use client'

import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
  message?: string
  onSuccess?: () => void
}

type Mode = 'login' | 'signup'

export default function AuthModal({ onClose, message, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) return
    setLoading(true)
    setError(null)

    const verifyRes = await fetch('/api/auth/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken }),
    })
    if (!verifyRes.ok) {
      setError('ボット検証に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else if (data.session) {
        if (onSuccess) onSuccess(); else onClose()
      } else setDone(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('メールアドレスまたはパスワードが正しくありません')
      else { if (onSuccess) onSuccess(); else onClose() }
    }
    setLoading(false)
  }

  async function handleXLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'ログイン' : '新規登録'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>
        {message && (
          <p className="text-white/60 text-sm text-center mb-4">{message}</p>
        )}

        {done ? (
          <p className="text-green-400 text-sm text-center py-4">
            確認メールを送信しました。<br />メール内のリンクをクリックしてください。
          </p>
        ) : (
          <>
            {/* X ログイン */}
            <button
              onClick={handleXLogin}
              className="w-full mb-4 py-2.5 rounded-lg bg-black hover:bg-zinc-900 border border-white/20 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-base">𝕏</span> で続ける
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">または</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full rounded-lg px-3 py-2.5 bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 placeholder:text-white/25"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                minLength={8}
                className="w-full rounded-lg px-3 py-2.5 bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 placeholder:text-white/25"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                options={{ theme: 'dark', size: 'flexible' }}
              />
              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {loading ? '...' : mode === 'login' ? 'ログイン' : '登録する'}
              </button>
            </form>

            <p className="text-center text-white/40 text-xs mt-4">
              {mode === 'login' ? (
                <>アカウントをお持ちでない方は{' '}
                  <button onClick={() => { setMode('signup'); setTurnstileToken(null) }} className="text-violet-400 hover:text-violet-300">
                    新規登録
                  </button>
                </>
              ) : (
                <>すでにアカウントをお持ちの方は{' '}
                  <button onClick={() => { setMode('login'); setTurnstileToken(null) }} className="text-violet-400 hover:text-violet-300">
                    ログイン
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
