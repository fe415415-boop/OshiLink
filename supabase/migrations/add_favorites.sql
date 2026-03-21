-- ============================================================
-- お気に入り機能マイグレーション
-- このファイルは何度実行しても安全です
-- Supabase SQL Editor で実行してください
-- ============================================================

-- template_favorites テーブル
CREATE TABLE IF NOT EXISTS template_favorites (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

-- ポリシー（重複エラーを防ぐため DROP してから作成）
DROP POLICY IF EXISTS "favorites_select" ON template_favorites;
DROP POLICY IF EXISTS "favorites_insert" ON template_favorites;
DROP POLICY IF EXISTS "favorites_delete" ON template_favorites;

CREATE POLICY "favorites_select" ON template_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "favorites_insert" ON template_favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites_delete" ON template_favorites FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_favorites_user ON template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_template ON template_favorites(template_id);

-- templates テーブルに favorites_count カラム追加
ALTER TABLE templates ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;

-- お気に入り数インクリメント関数
CREATE OR REPLACE FUNCTION increment_favorites_count(template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE templates SET favorites_count = favorites_count + 1 WHERE id = template_id;
END;
$$;

-- お気に入り数デクリメント関数
CREATE OR REPLACE FUNCTION decrement_favorites_count(template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE templates SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = template_id;
END;
$$;
