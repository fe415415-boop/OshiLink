-- ============================================================
-- サイト管理者ロール
-- Supabase SQL Editor で実行してください
-- 実行後、管理者にしたいユーザーのUUIDを admins テーブルに INSERT してください
-- ============================================================

-- 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- 誰でも参照可（is_admin チェックのため）
DROP POLICY IF EXISTS "admins_select" ON admins;
CREATE POLICY "admins_select" ON admins FOR SELECT USING (true);

-- is_admin() 関数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
$$;

-- templates UPDATE：作成者 または 管理者
DROP POLICY IF EXISTS "templates_update" ON templates;
CREATE POLICY "templates_update" ON templates FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());

-- template_characters UPDATE/DELETE/INSERT：管理者も許可
DROP POLICY IF EXISTS "template_chars_update" ON template_characters;
CREATE POLICY "template_chars_update" ON template_characters FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND (user_id = auth.uid() OR is_admin())
  )
);

DROP POLICY IF EXISTS "template_chars_delete" ON template_characters;
CREATE POLICY "template_chars_delete" ON template_characters FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND (user_id = auth.uid() OR is_admin())
  )
);

DROP POLICY IF EXISTS "template_chars_insert" ON template_characters;
CREATE POLICY "template_chars_insert" ON template_characters FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
  )
);

-- ============================================================
-- 管理者の追加例（UUIDはSupabase Auth > Users で確認）
-- INSERT INTO admins (user_id) VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
-- ============================================================
