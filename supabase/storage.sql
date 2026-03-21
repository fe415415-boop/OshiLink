-- ============================================================
-- Storage バケット設定
-- Supabase SQL Editor で実行してください
-- ============================================================

-- character-images バケット作成（公開）
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- 既存のポリシーを削除してから再作成
DROP POLICY IF EXISTS "character_images_select" ON storage.objects;
DROP POLICY IF EXISTS "character_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "character_images_delete" ON storage.objects;

-- 全員READ可（バケットがpublicなので自動的に適用されるが念のため）
CREATE POLICY "character_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'character-images');

-- 全員アップロード可（匿名ユーザーもテンプレート作成できるようにするため）
CREATE POLICY "character_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'character-images');

-- 全員更新可（upsert のため）
CREATE POLICY "character_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'character-images');
