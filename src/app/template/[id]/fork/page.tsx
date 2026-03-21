import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TemplateForm from '@/components/template/TemplateForm'
import type { TemplateCharacter } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ForkTemplatePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('templates')
    .select('*, template_characters(*)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a]">
      <TemplateForm
        initialTitle={`${data.title}（コピー）`}
        initialCharacters={data.template_characters as TemplateCharacter[]}
        forkedFromId={id}
      />
    </div>
  )
}
