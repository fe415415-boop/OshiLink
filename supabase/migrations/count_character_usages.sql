-- ============================================================
-- 人物使用件数カウント関数
-- diagram_nodes から指定キャラクターIDの使用件数を返す（RLS bypass）
-- Supabase SQL Editor で実行してください
-- ============================================================

CREATE OR REPLACE FUNCTION count_character_usages(p_character_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  SET LOCAL row_security = off;
  SELECT COUNT(*) INTO v_count
  FROM diagram_nodes
  WHERE character_id = ANY(p_character_ids);
  RETURN v_count;
END;
$$;
