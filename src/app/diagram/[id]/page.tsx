import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DiagramLoader from '@/components/editor/DiagramLoader'
import DiagramEditor from '@/components/editor/DiagramEditor'
import AutoCopyRedirect from '@/components/editor/AutoCopyRedirect'
import type { TemplateCharacter, EdgeDirection } from '@/lib/supabase/types'
import type { EditorNode, EditorEdge, Theme, FontStyle } from '@/store/diagramStore'

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

  // 非公開かつ非所有者はカスタム404を表示
  if (!isOwner && !diagram.is_public) {
    notFound()
  }

  const template = diagram.templates as { id: string; title: string; template_characters: TemplateCharacter[] }
  const characters: TemplateCharacter[] = template?.template_characters ?? []

  // 公開かつ非所有者 → 自動コピーリダイレクト
  if (!isOwner && diagram.is_public) {
    const [{ data: savedNodes }, { data: savedEdges }] = await Promise.all([
      supabase.from('diagram_nodes').select('*').eq('diagram_id', id),
      supabase.from('diagram_edges').select('*').eq('diagram_id', id),
    ])

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

    const editorEdges: EditorEdge[] = (savedEdges ?? []).map((e) => ({
      id: e.id,
      sourceId: e.source_node_id,
      targetId: e.target_node_id,
      tag: e.tag,
      direction: e.direction as EdgeDirection,
    }))

    const copyData = {
      templateId: template?.id ?? '',
      templateTitle: template?.title ?? '',
      characters,
      title: diagram.title,
      theme: diagram.theme as Theme,
      fontStyle: diagram.font_style as FontStyle,
      nodes: editorNodes,
      edges: editorEdges,
    }

    if (user) {
      // ログイン済み: サーバーサイドで DB コピー → リダイレクト
      const { data: newDiag } = await supabase
        .from('diagrams')
        .insert({
          user_id: user.id,
          template_id: template?.id ?? '',
          title: diagram.title,
          theme: diagram.theme,
          font_style: diagram.font_style,
          is_public: false,
        })
        .select()
        .single()

      if (newDiag) {
        const nodeRows = (savedNodes ?? []).map((n) => ({
          diagram_id: newDiag.id,
          character_id: n.character_id,
          pos_x: n.pos_x,
          pos_y: n.pos_y,
        }))
        const { data: newNodes } = await supabase.from('diagram_nodes').insert(nodeRows).select()

        if (newNodes && savedEdges && savedNodes) {
          const nodeIdMap = new Map<string, string>()
          savedNodes.forEach((n, i) => { if (newNodes[i]) nodeIdMap.set(n.id, newNodes[i].id) })
          const edgeRows = savedEdges
            .map((e) => ({
              diagram_id: newDiag.id,
              source_node_id: nodeIdMap.get(e.source_node_id),
              target_node_id: nodeIdMap.get(e.target_node_id),
              tag: e.tag,
              direction: e.direction,
            }))
            .filter((e) => e.source_node_id && e.target_node_id)
          if (edgeRows.length > 0) {
            await supabase.from('diagram_edges').insert(edgeRows)
          }
        }

        redirect(`/diagram/${newDiag.id}`)
      }
    }

    // 未ログイン: クライアントで sessionStorage に保存して editor に遷移
    return <AutoCopyRedirect data={copyData} />
  }

  // オーナーの場合: 保存済みデータを読み込んで編集画面表示
  const { data: savedNodes } = await supabase
    .from('diagram_nodes')
    .select('*')
    .eq('diagram_id', id)

  const { data: savedEdges } = await supabase
    .from('diagram_edges')
    .select('*')
    .eq('diagram_id', id)

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
          theme: diagram.theme,
          fontStyle: diagram.font_style,
          nodes: editorNodes,
          edges: editorEdges,
        }}
      />
      <DiagramEditor
        diagramId={id}
        initialIsPublic={diagram.is_public ?? false}
      />
    </>
  )
}
