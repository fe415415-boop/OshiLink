'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import type { TemplateCharacter } from '@/lib/supabase/types'

interface CharacterDraft {
  id: string  // ローカル一時ID
  name: string
  imageFile: File | null
  imagePreview: string | null
}

interface Props {
  initialTitle?: string
  initialCharacters?: TemplateCharacter[]
  forkedFromId?: string
  editingTemplateId?: string  // 編集モード時に既存テンプレートIDを渡す
  canDelete?: boolean         // 削除ボタンを表示するか（作成者本人 or 管理者）
}

export default function TemplateForm({ initialTitle = '', initialCharacters = [], forkedFromId, editingTemplateId, canDelete = false }: Props) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [title, setTitle] = useState(initialTitle)
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [characters, setCharacters] = useState<CharacterDraft[]>(
    initialCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      imageFile: null,
      imagePreview: c.image_url,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeCharIdx, setActiveCharIdx] = useState<number | null>(null)

  function bulkAddCharacters() {
    const existingNames = new Set(characters.map((c) => c.name.trim()).filter(Boolean))
    const newNames = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((name) => name && !existingNames.has(name))
    if (newNames.length === 0) { setBulkText(''); setShowBulk(false); return }
    const newChars: CharacterDraft[] = newNames.map((name) => ({
      id: `draft-${Date.now()}-${Math.random()}`,
      name,
      imageFile: null,
      imagePreview: null,
    }))
    setCharacters((prev) => [...newChars, ...prev])
    setBulkText('')
    setShowBulk(false)
  }

  function addCharacter() {
    setCharacters((prev) => [
      {
        id: `draft-${Date.now()}`,
        name: '',
        imageFile: null,
        imagePreview: null,
      },
      ...prev,
    ])
  }

  async function removeCharacter(idx: number) {
    const c = characters[idx]
    if (!c.id.startsWith('draft-')) {
      const { data: usageCount } = await supabase.rpc('count_character_usages', {
        p_character_ids: [c.id],
      })
      if (usageCount && usageCount > 0) {
        window.alert('リンクで使用されている人物のため削除できません。\nテンプレートから削除したい場合はテンプレートをコピーして編集してください。')
        return
      }
    }
    setCharacters((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateName(idx: number, name: string) {
    setCharacters((prev) => prev.map((c, i) => (i === idx ? { ...c, name } : c)))
  }

  function handleImageClick(idx: number) {
    setActiveCharIdx(idx)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || activeCharIdx === null) return
    const preview = URL.createObjectURL(file)
    setCharacters((prev) =>
      prev.map((c, i) => (i === activeCharIdx ? { ...c, imageFile: file, imagePreview: preview } : c))
    )
    e.target.value = ''
  }

  async function uploadImage(file: File, templateId: string, characterId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${templateId}/${characterId}.${ext}`
    const { error } = await supabase.storage
      .from('character-images')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('character-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleDelete() {
    if (!editingTemplateId) return
    setDeleting(true)
    const { error: delErr } = await supabase.rpc('safe_delete_template', { p_template_id: editingTemplateId })
    if (delErr) {
      console.error('delete template error:', JSON.stringify(delErr), delErr)
      setError('削除に失敗しました')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    router.push('/')
  }

  async function handleSave() {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (characters.some((c) => !c.name.trim())) { setError('人物名を入力してください'); return }

    setSaving(true)
    setError(null)

    // ── 編集モード ──
    if (editingTemplateId) {
      const { error: titleErr } = await supabase
        .from('templates')
        .update({ title: title.trim() })
        .eq('id', editingTemplateId)
      if (titleErr) { setError('保存に失敗しました'); setSaving(false); return }

      // 削除された既存キャラ（初期IDのうち現在リストにないもの）
      const currentIds = new Set(characters.map((c) => c.id))
      const deletedIds = initialCharacters.map((c) => c.id).filter((id) => !currentIds.has(id))
      if (deletedIds.length > 0) {
        await supabase.from('template_characters').delete().in('id', deletedIds)
      }

      for (let i = 0; i < characters.length; i++) {
        const c = characters[i]
        const isDraft = c.id.startsWith('draft-')
        let imageUrl: string | null = c.imagePreview?.startsWith('http') ? c.imagePreview : null
        if (c.imageFile) {
          const tempId = isDraft ? `tmp-${Date.now()}-${i}` : c.id
          const uploaded = await uploadImage(c.imageFile, editingTemplateId, tempId)
          if (uploaded) imageUrl = uploaded
        }
        if (isDraft) {
          await supabase.from('template_characters').insert({
            template_id: editingTemplateId, name: c.name.trim(), image_url: imageUrl, sort_order: i,
          })
        } else {
          await supabase.from('template_characters').update({
            name: c.name.trim(), image_url: imageUrl, sort_order: i,
          }).eq('id', c.id)
        }
      }

      router.push(`/template/${editingTemplateId}`)
      return
    }

    // ── 新規作成 ──
    const { data: tmpl, error: tmplErr } = await supabase
      .from('templates')
      .insert({
        title: title.trim(),
        user_id: user?.id ?? null,
        forked_from: forkedFromId ?? null,
      })
      .select()
      .single()

    if (tmplErr || !tmpl) { setError('保存に失敗しました'); setSaving(false); return }

    for (let i = 0; i < characters.length; i++) {
      const c = characters[i]
      let imageUrl: string | null = c.imagePreview?.startsWith('http') ? c.imagePreview : null
      if (c.imageFile) {
        const tempId = `tmp-${Date.now()}-${i}`
        const uploaded = await uploadImage(c.imageFile, tmpl.id, tempId)
        if (uploaded) imageUrl = uploaded
      }
      await supabase.from('template_characters').insert({
        template_id: tmpl.id, name: c.name.trim(), image_url: imageUrl, sort_order: i,
      })
    }

    router.push(`/editor/${tmpl.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">
          {editingTemplateId ? 'テンプレートを編集' : forkedFromId ? 'テンプレートをコピーして編集' : '新規テンプレート作成'}
        </h1>
        {/* 削除ボタン（ヘッダー右） */}
        {editingTemplateId && canDelete && (
          !confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400/60 hover:text-red-400 transition-colors shrink-0"
            >
              このテンプレートを削除
            </button>
          ) : (
            <div className="text-right shrink-0">
              <p className="text-xs text-white/50 mb-1.5">
                削除しますか？<br />
                <span className="text-white/30">使用中の相関図は画像なしコピーに移し替えられます</span>
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* タイトル */}
      <div className="mb-6">
        <label className="block text-sm text-white/50 mb-1.5">テンプレートタイトル<span className="text-red-400 ml-1">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：にじさんじライバーズ、ホロライブ4期生"
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus:border-violet-500 placeholder:text-white/25"
        />
      </div>

      {/* 保存ボタン */}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold disabled:opacity-50 transition-colors mb-6"
      >
        {saving ? '保存中...' : '保存して開始'}
      </button>

      {/* 人物リスト */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/50">人物一覧</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulk((v) => !v)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              一括追加
            </button>
            <button
              onClick={addCharacter}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              ＋ 追加
            </button>
          </div>
        </div>

        {/* 一括追加エリア */}
        {showBulk && (
          <div className="mb-3 rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-white/40 mb-2">1行に1人物名を入力（既存の同名はスキップ）</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'ルフィ\nナミ\nゾロ\nウソップ'}
              rows={5}
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/20 resize-none border-b border-white/10 focus:border-violet-500 pb-1"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setBulkText(''); setShowBulk(false) }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1"
              >
                キャンセル
              </button>
              <button
                onClick={bulkAddCharacters}
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-lg transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {characters.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
              {/* 画像 */}
              <div className="relative shrink-0 w-12 h-12">
                <button
                  onClick={() => handleImageClick(idx)}
                  className="w-full h-full rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-white/30 hover:border-violet-500 transition-colors"
                >
                  {c.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imagePreview} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">📷</span>
                  )}
                </button>
                {!c.imagePreview && (
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-violet-500 text-white text-[11px] font-bold grid place-items-center pointer-events-none">
                    +
                  </span>
                )}
              </div>

              {/* 名前 */}
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateName(idx, e.target.value)}
                placeholder="人物名 *"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-red-400/50 border-b border-white/10 focus:border-violet-500 pb-0.5"
              />

              <button
                onClick={() => removeCharacter(idx)}
                className="text-white/20 hover:text-red-400 transition-colors shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />


    </div>
  )
}
