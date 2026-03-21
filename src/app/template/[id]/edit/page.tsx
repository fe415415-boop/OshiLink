import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import TemplateForm from '@/components/template/TemplateForm'
import type { TemplateCharacter } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from('templates').select('*, template_characters(*)').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (!data) notFound()
  if (!user) redirect(`/template/${id}`)

  const isOwner = user.id === data.user_id
  let isAdmin = false
  if (!isOwner) {
    const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    isAdmin = !!adminRow
  }
  if (!isOwner && !isAdmin) redirect(`/template/${id}`)

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a]">
      <TemplateForm
        initialTitle={data.title}
        initialCharacters={data.template_characters as TemplateCharacter[]}
        editingTemplateId={id}
        canDelete={isOwner || isAdmin}
      />
    </div>
  )
}
