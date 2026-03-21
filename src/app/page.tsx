import { createClient } from '@/lib/supabase/server'
import TemplateCard from '@/components/top/TemplateCard'
import DiagramCard from '@/components/profile/DiagramCard'
import HScrollList from '@/components/ui/HScrollList'
import type { TemplateWithCharacters, TemplateCharacter, EdgeDirection } from '@/lib/supabase/types'
import type { Template, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function TopPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // ログイン済みユーザーの作成したリンク + お気に入り
  let diagrams: any[] = []
  let allNodes: any[] = []
  let allEdges: any[] = []
  let favoriteIds = new Set<string>()
  if (user) {
    const [{ data: diagramData }, { data: favs }] = await Promise.all([
      supabase
        .from('diagrams')
        .select('*, templates(id, title, template_characters(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('template_favorites').select('template_id').eq('user_id', user.id),
    ])
    diagrams = diagramData ?? []
    favoriteIds = new Set((favs ?? []).map((f) => f.template_id))

    const diagramIds = diagrams.map((d) => d.id)
    if (diagramIds.length > 0) {
      const [{ data: nodes }, { data: edges }] = await Promise.all([
        supabase.from('diagram_nodes').select('*').in('diagram_id', diagramIds),
        supabase.from('diagram_edges').select('*').in('diagram_id', diagramIds),
      ])
      allNodes = nodes ?? []
      allEdges = edges ?? []
    }
  }

  let query = supabase
    .from('templates')
    .select('*, template_characters(*)')
    .limit(200)

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: rawTemplates } = await query

  // usage_count + favorites_count の合算スコアで降順ソート、上位48件
  const templates = (rawTemplates ?? [])
    .sort((a, b) =>
      (b.usage_count + (b.favorites_count ?? 0)) - (a.usage_count + (a.favorites_count ?? 0))
    )
    .slice(0, 48)

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* ログイン済み：作成したリンクグリッド（検索時は非表示） */}
        {user && !q && diagrams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-white/50 mb-4">作成したリンク</h2>
            <HScrollList className="gap-3 pb-1 ">
              {diagrams.map((d) => {
                const tmpl = d.templates as { id: string; title: string; template_characters: TemplateCharacter[] } | null
                const characters: TemplateCharacter[] = tmpl?.template_characters ?? []
                const diagramNodes = allNodes.filter((n) => n.diagram_id === d.id)
                const diagramEdges = allEdges.filter((e) => e.diagram_id === d.id)
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
            </HScrollList>
          </div>
        )}

        {/* 見出し */}
        <h2 className="text-sm font-bold opacity-50 mb-4">
          {q ? `「${q}」の検索結果` : '人気テンプレート'}
        </h2>

        {/* テンプレート一覧 */}
        {templates.length > 0 ? (
          <HScrollList className="gap-3 pb-1 ">
            {(templates as unknown as TemplateWithCharacters[]).map((t) => (
              <div key={t.id} className="shrink-0 w-44">
                <TemplateCard template={t} isFavorited={favoriteIds.has(t.id)} userId={user?.id ?? null} />
              </div>
            ))}
          </HScrollList>
        ) : (
          <div className="text-center py-20 opacity-30">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-sm">
              {q ? 'テンプレートが見つかりませんでした' : 'まだテンプレートがありません'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
