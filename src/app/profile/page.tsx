import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiagramCard from '@/components/profile/DiagramCard'
import TemplateCard from '@/components/top/TemplateCard'
import type { Template, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'
import type { EdgeDirection, TemplateCharacter, TemplateWithCharacters } from '@/lib/supabase/types'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // 相関図・テンプレート・お気に入りを並列取得
  const [
    { data: diagrams },
    { data: templates },
    { data: favRows },
  ] = await Promise.all([
    supabase
      .from('diagrams')
      .select('*, templates(id, title, template_characters(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('templates')
      .select('*, template_characters(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('template_favorites')
      .select('template_id, templates(*, template_characters(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])
  const favoriteIds = new Set((favRows ?? []).map((f) => f.template_id))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const favoritedTemplates = (favRows ?? []).map((f) => f.templates).filter(Boolean) as any[]

  // 全相関図の nodes / edges を一括取得
  const diagramIds = (diagrams ?? []).map((d) => d.id)
  const [{ data: allNodes }, { data: allEdges }] = await Promise.all([
    diagramIds.length > 0
      ? supabase.from('diagram_nodes').select('*').in('diagram_id', diagramIds)
      : Promise.resolve({ data: [] }),
    diagramIds.length > 0
      ? supabase.from('diagram_edges').select('*').in('diagram_id', diagramIds)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── 作成したリンク ── */}
        <h2 className="text-sm font-bold text-white/50 mb-4">作成したリンク</h2>

        {!diagrams || diagrams.length === 0 ? (
          <div className="py-8 opacity-30 text-center">
            <p className="text-sm">保存された相関図はありません</p>
            <Link href="/" className="mt-2 inline-block text-violet-400 hover:text-violet-300 text-sm">
              テンプレートを探す →
            </Link>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-3 pb-2">
            {diagrams.map((d) => {
              const tmpl = d.templates as { id: string; title: string; template_characters: TemplateCharacter[] } | null
              const characters: TemplateCharacter[] = tmpl?.template_characters ?? []

              const diagramNodes = (allNodes ?? []).filter((n) => n.diagram_id === d.id)
              const diagramEdges = (allEdges ?? []).filter((e) => e.diagram_id === d.id)

              const editorNodes: EditorNode[] = diagramNodes.map((n) => {
                const char = characters.find((c) => c.id === n.character_id)
                return { id: n.id, characterId: n.character_id, label: char?.name ?? '', imageUrl: char?.image_url ?? null, x: n.pos_x, y: n.pos_y }
              })
              const editorEdges: EditorEdge[] = diagramEdges.map((e) => ({
                id: e.id, sourceId: e.source_node_id, targetId: e.target_node_id, tag: e.tag, direction: e.direction as EdgeDirection,
              }))

              return (
                <div key={d.id} className="shrink-0 w-44">
                  <DiagramCard
                    id={d.id}
                    title={d.title}
                    templateTitle={tmpl?.title ?? ''}
                    createdAt={d.created_at}
                    nodes={editorNodes}
                    edges={editorEdges}
                    template={(d.design_template as Template) || 'stylish'}
                    fontStyle={(d.font_style as FontStyle) || 'cool'}
                    thumbnail={d.thumbnail ?? null}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* ── 作成したテンプレート ── */}
        <h2 className="text-sm font-bold text-white/50 mt-10 mb-4">作成したテンプレート</h2>

        {!templates || templates.length === 0 ? (
          <div className="py-8 opacity-30 text-center">
            <p className="text-sm">作成したテンプレートはありません</p>
            <Link href="/template/new" className="mt-2 inline-block text-violet-400 hover:text-violet-300 text-sm">
              テンプレートを作成する →
            </Link>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-3 pb-2">
            {(templates as unknown as TemplateWithCharacters[]).map((t) => (
              <div key={t.id} className="shrink-0 w-44">
                <TemplateCard template={t} isFavorited={favoriteIds.has(t.id)} userId={user.id} />
              </div>
            ))}
          </div>
        )}

        {/* ── お気に入りテンプレート ── */}
        <h2 className="text-sm font-bold text-white/50 mt-10 mb-4">お気に入りテンプレート</h2>

        {favoritedTemplates.length === 0 ? (
          <div className="py-8 opacity-30 text-center">
            <p className="text-sm">お気に入りのテンプレートはありません</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-3 pb-2">
            {(favoritedTemplates as unknown as TemplateWithCharacters[]).map((t) => (
              <div key={t.id} className="shrink-0 w-44">
                <TemplateCard template={t} isFavorited={true} userId={user.id} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
