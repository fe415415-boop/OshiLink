-- ============================================================
-- テンプレート安全削除関数
-- 使用中テンプレートは user_id=NULL のコピーに相関図を移してから削除
-- ※ admin_role.sql を先に実行してから実行してください
-- Supabase SQL Editor で実行してください
-- ============================================================

CREATE OR REPLACE FUNCTION safe_delete_template(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_template_id uuid;
  v_new_char_id uuid;
  v_char RECORD;
BEGIN
  -- RLS をこの関数の実行中だけ無効化（他ユーザーの diagrams/diagram_nodes も更新するため）
  SET LOCAL row_security = off;

  -- 権限チェック：作成者本人 または 管理者
  IF NOT EXISTS (
    SELECT 1 FROM templates WHERE id = p_template_id AND user_id = auth.uid()
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- 使用中のdiagramが存在する場合はコピーに移し替え
  IF EXISTS (SELECT 1 FROM diagrams WHERE template_id = p_template_id) THEN

    -- コピーテンプレートを作成（user_id=NULL、favorites_count=0）
    INSERT INTO templates (title, user_id, forked_from, usage_count, favorites_count)
    SELECT title, NULL, id, usage_count, 0
    FROM templates WHERE id = p_template_id
    RETURNING id INTO v_new_template_id;

    -- キャラクターをコピー（image_url=NULL）し、diagram_nodes を書き換え
    FOR v_char IN
      SELECT id, name, sort_order FROM template_characters WHERE template_id = p_template_id
    LOOP
      INSERT INTO template_characters (template_id, name, image_url, sort_order)
      VALUES (v_new_template_id, v_char.name, NULL, v_char.sort_order)
      RETURNING id INTO v_new_char_id;

      -- 該当テンプレートを使う diagrams のノードのみ書き換え
      UPDATE diagram_nodes
      SET character_id = v_new_char_id
      WHERE character_id = v_char.id
        AND diagram_id IN (SELECT id FROM diagrams WHERE template_id = p_template_id);
    END LOOP;

    -- diagrams を新テンプレートに付け替え
    UPDATE diagrams SET template_id = v_new_template_id WHERE template_id = p_template_id;

  END IF;

  -- 元テンプレートを削除（template_characters・template_favorites は CASCADE）
  DELETE FROM templates WHERE id = p_template_id;
END;
$$;
