import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { TemplateCharacter } from '@/lib/supabase/types'
import FavoriteButton from '@/components/common/FavoriteButton'
import BackButton from '@/components/common/BackButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from('templates').select('*, template_characters(*)').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (!data) notFound()

  const characters = (data.template_characters as TemplateCharacter[])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  let isFavorited = false
  let isAdmin = false
  if (user) {
    const [{ data: fav }, { data: adminRow }] = await Promise.all([
      supabase.from('template_favorites').select('template_id').eq('template_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])
    isFavorited = !!fav
    isAdmin = !!adminRow
  }

  const canEdit = user && (user.id === data.user_id || isAdmin)

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* 戻る */}
        <BackButton />

        {/* タイトル + お気に入りボタン */}
        <div className="flex items-center justify-between mb-1 gap-3">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <FavoriteButton
            templateId={id}
            initialFavorited={isFavorited}
            userId={user?.id ?? null}
            className="text-2xl shrink-0"
          />
        </div>
        <p className="text-sm text-white/30 mb-8">
          使用回数 {data.usage_count.toLocaleString()} · お気に入り数 {(data.favorites_count ?? 0).toLocaleString()}
        </p>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href={`/editor/${id}`}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-center text-sm font-bold transition-colors"
          >
            このテンプレートで開始
          </Link>
          <Link
            href={`/template/${id}/fork`}
            className="flex-1 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-center text-sm font-bold transition-colors"
          >
            このテンプレートをコピーして編集
          </Link>
        </div>
        {canEdit && (
          <div className="-mt-5 mb-8">
            <Link
              href={`/template/${id}/edit`}
              className="block w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-center text-sm font-bold transition-colors"
            >
              このテンプレートを編集
            </Link>
          </div>
        )}

        {/* 人物一覧 */}
        <div className="mb-8">
          <p className="text-xs text-white/40 font-bold mb-3">登場人物 ({characters.length}人)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {characters.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 rounded-full bg-violet-900/40 border border-white/10 overflow-hidden flex items-center justify-center text-sm font-bold text-white/50 shrink-0">
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    : c.name.slice(0, 2)
                  }
                </div>
                <span className="text-xs text-white/70 text-center line-clamp-2 w-full text-center">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
