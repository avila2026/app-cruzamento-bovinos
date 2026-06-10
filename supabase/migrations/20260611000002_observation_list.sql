-- Adiciona coluna para sinalizar se o animal está em observação (catálogo importado)
ALTER TABLE public.animal ADD COLUMN IF NOT EXISTS is_observed boolean DEFAULT false;
