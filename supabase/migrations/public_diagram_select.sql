-- diagrams: 本人 or 公開相関図は SELECT 可能
DROP POLICY IF EXISTS "diagrams_select" ON diagrams;
CREATE POLICY "diagrams_select" ON diagrams FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);
