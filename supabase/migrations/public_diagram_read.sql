-- 公開相関図のノード・エッジを非オーナーも読み取り可能にする
-- （diagrams.is_public = true のとき）

-- diagram_nodes: オーナー or 公開相関図
DROP POLICY IF EXISTS "diagram_nodes_select" ON diagram_nodes;
CREATE POLICY "diagram_nodes_select" ON diagram_nodes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM diagrams
    WHERE id = diagram_id
      AND (user_id = auth.uid() OR is_public = true)
  )
);

-- diagram_edges: オーナー or 公開相関図
DROP POLICY IF EXISTS "diagram_edges_select" ON diagram_edges;
CREATE POLICY "diagram_edges_select" ON diagram_edges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM diagrams
    WHERE id = diagram_id
      AND (user_id = auth.uid() OR is_public = true)
  )
);
