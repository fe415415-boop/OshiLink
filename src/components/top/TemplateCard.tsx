import Link from 'next/link'
import type { TemplateWithCharacters } from '@/lib/supabase/types'
import FavoriteButton from '@/components/common/FavoriteButton'

interface Props {
  template: TemplateWithCharacters
  isFavorited: boolean
  userId: string | null
}

export default function TemplateCard({ template, isFavorited, userId }: Props) {
  const chars = template.template_characters.slice(0, 5)

  return (
    <Link
      href={`/template/${template.id}`}
      className="group block rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 transition-all overflow-hidden"
    >
      {/* 人物アイコングリッド（サムネイルエリア） */}
      <div className="aspect-video bg-[#0a0a14] overflow-hidden flex items-center justify-center p-3">
        <div className="grid grid-cols-3 gap-1.5 content-start">
          {chars.map((c) => (
            <div
              key={c.id}
              className="w-10 h-10 rounded-full bg-violet-900/50 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white/60"
            >
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                c.name.slice(0, 2)
              )}
            </div>
          ))}
          {template.template_characters.length > 5 && (
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/40">
              +{template.template_characters.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* 情報 */}
      <div className="p-2.5">
        <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
          {template.title}
        </p>
        <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
          <span className="flex items-center gap-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {template.template_characters.length}
          </span>
          <span>▶ {template.usage_count.toLocaleString()}</span>
          <span>★ {(template.favorites_count ?? 0).toLocaleString()}</span>
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-white/20">
            {new Date(template.updated_at ?? template.created_at).toLocaleDateString('ja-JP')}
          </p>
          <FavoriteButton templateId={template.id} initialFavorited={isFavorited} userId={userId} />
        </div>
      </div>
    </Link>
  )
}
