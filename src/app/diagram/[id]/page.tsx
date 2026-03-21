import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DiagramLoader from '@/components/editor/DiagramLoader'
import DiagramEditor from '@/components/editor/DiagramEditor'
import type { TemplateCharacter, EdgeDirection } from '@/lib/supabase/types'
import type { EditorNode, EditorEdge } from '@/store/diagramStore'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiagramPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // ログイン中ユーザーを取得
  const { data: { user } } = await supabase.auth.getUser()

  // 相関図本体 + テンプレート情報
  const { data: diagram } = await supabase
    .from('diagrams')
    .select('*, templates(id, title, template_characters(*))')
    .eq('id', id)
    .single()

  if (!diagram) notFound()

  const isOwner = !!user && user.id === diagram.user_id

  // 非公開かつ非所有者はアクセス拒否
  if (!diagram.is_public && !isOwner) notFound()

  // 保存済みノード
  const { data: savedNodes } = await supabase
    .from('diagram_nodes')
    .select('*')
    .eq('diagram_id', id)

  // 保存済みエッジ
  const { data: savedEdges } = await supabase
    .from('diagram_edges')
    .select('*')
    .eq('diagram_id', id)

  const template = diagram.templates as { id: string; title: string; template_characters: TemplateCharacter[] }
  const characters: TemplateCharacter[] = template?.template_characters ?? []

  // EditorNode に変換（DB の pos_x / pos_y を使用）
  const editorNodes: EditorNode[] = (savedNodes ?? []).map((n) => {
    const char = characters.find((c) => c.id === n.character_id)
    return {
      id: n.id,
      characterId: n.character_id,
      label: char?.name ?? '',
      imageUrl: char?.image_url ?? null,
      x: n.pos_x,
      y: n.pos_y,
    }
  })

  // EditorEdge に変換（source/target は diagram_node.id で対応）
  const editorEdges: EditorEdge[] = (savedEdges ?? []).map((e) => ({
    id: e.id,
    sourceId: e.source_node_id,
    targetId: e.target_node_id,
    tag: e.tag,
    direction: e.direction as EdgeDirection,
  }))

  return (
    <>
      <DiagramLoader
        data={{
          templateId: template?.id ?? '',
          templateTitle: template?.title ?? '',
          characters,
          title: diagram.title,
          template: diagram.design_template,
          fontStyle: diagram.font_style,
          nodes: editorNodes,
          edges: editorEdges,
        }}
      />
      <DiagramEditor
        diagramId={id}
        isOwner={isOwner}
        initialIsPublic={diagram.is_public ?? false}
        viewerUserId={user?.id ?? null}
        requiresLogin={diagram.is_public && !user}
      />
    </>
  )
}
