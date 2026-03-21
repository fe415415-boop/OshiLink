import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditorInitializer from '@/components/editor/EditorInitializer'
import DiagramEditor from '@/components/editor/DiagramEditor'
import type { TemplateWithCharacters } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ templateId: string }>
}

export default async function EditorPage({ params }: Props) {
  const { templateId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('templates')
    .select('*, template_characters(*)')
    .eq('id', templateId)
    .single()

  if (!data) notFound()

  const template = data as TemplateWithCharacters

  return (
    <>
      <EditorInitializer template={template} />
      <DiagramEditor />
    </>
  )
}
