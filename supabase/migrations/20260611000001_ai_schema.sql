-- =====================================================
-- CattleGen — Schema de IA (embeddings + knowledge base)
-- =====================================================

-- 1. Colunas de embedding na tabela animal existente
ALTER TABLE animal ADD COLUMN IF NOT EXISTS dep_embedding vector(1024);

-- 2. Tabela de base de conhecimento (documentos ABCZ/ANCP/Geneplus)
CREATE TABLE IF NOT EXISTS knowledge_base (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source text NOT NULL, -- 'abcz_artigo' | 'pmgz_sumario' | 'ancp_doc'
 title text,
 content text NOT NULL, -- chunk de ~800 tokens
 url text,
 published_at timestamptz,
 embedding vector(1024),
 metadata jsonb DEFAULT '{}'::jsonb,
 created_at timestamptz DEFAULT now()
);

-- 3. Índices HNSW para busca rápida por similaridade (cosseno)
CREATE INDEX IF NOT EXISTS idx_animal_dep_embedding
 ON animal USING hnsw (dep_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_kb_embedding
 ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- 4. Função: buscar documentos relevantes (RAG)
CREATE OR REPLACE FUNCTION match_knowledge(
 query_embedding vector(1024),
 match_threshold float DEFAULT 0.72,
 match_count int DEFAULT 5,
 source_filter text DEFAULT NULL
)
RETURNS TABLE (id uuid, title text, content text, source text, url text, similarity float)
LANGUAGE sql STABLE AS $$
 SELECT 
   id, 
   title, 
   content, 
   source, 
   url,
   1 - (embedding <=> query_embedding) AS similarity
 FROM knowledge_base
 WHERE embedding IS NOT NULL
 AND 1 - (embedding <=> query_embedding) > match_threshold
 AND (source_filter IS NULL OR source = source_filter)
 ORDER BY embedding <=> query_embedding
 LIMIT match_count;
$$;

-- 5. Função: buscar animais geneticamente similares
CREATE OR REPLACE FUNCTION match_animals_by_genetics(
 query_embedding vector(1024),
 match_count int DEFAULT 5,
 exclude_id uuid DEFAULT NULL,
 farm_filter uuid DEFAULT NULL
)
RETURNS TABLE (animal_id uuid, name text, similarity float)
LANGUAGE sql STABLE AS $$
 SELECT 
   id AS animal_id, 
   name,
   1 - (dep_embedding <=> query_embedding) AS similarity
 FROM animal
 WHERE dep_embedding IS NOT NULL
 AND (exclude_id IS NULL OR id <> exclude_id)
 AND (farm_filter IS NULL OR farm_id = farm_filter)
 ORDER BY dep_embedding <=> query_embedding
 LIMIT match_count;
$$;
