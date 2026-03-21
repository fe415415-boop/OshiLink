'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  templateId: string
  initialFavorited: boolean
  userId: string | null
  className?: string
}

export default function FavoriteButton({ templateId, initialFavorited, userId, className = '' }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userId || loading) return
    setLoading(true)
    const supabase = createClient()
    if (favorited) {
      const { error: delErr } = await supabase
        .from('template_favorites')
        .delete()
        .eq('template_id', templateId)
        .eq('user_id', userId)
      if (delErr) {
        console.error('favorite delete error:', delErr)
        setLoading(false)
        return
      }
      const { error: rpcErr } = await supabase.rpc('decrement_favorites_count', { template_id: templateId })
      if (rpcErr) console.error('decrement_favorites_count error:', rpcErr)
    } else {
      const { error: insErr } = await supabase
        .from('template_favorites')
        .insert({ template_id: templateId, user_id: userId })
      if (insErr) {
        console.error('favorite insert error:', insErr)
        setLoading(false)
        return
      }
      const { error: rpcErr } = await supabase.rpc('increment_favorites_count', { template_id: templateId })
      if (rpcErr) console.error('increment_favorites_count error:', rpcErr)
    }
    setFavorited(!favorited)
    setLoading(false)
  }

  if (!userId) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? 'お気に入りを解除' : 'お気に入りに追加'}
      className={`text-xl leading-none transition-colors disabled:opacity-40 ${
        favorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/30 hover:text-yellow-400'
      } ${className}`}
    >
      {favorited ? '★' : '☆'}
    </button>
  )
}
