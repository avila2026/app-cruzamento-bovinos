-- Helpers SECURITY DEFINER: evitam a reavaliação aninhada de RLS nas
-- subconsultas encadeadas (evaluation_trait -> evaluation -> animal -> farm).
CREATE OR REPLACE FUNCTION public.user_farm_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT id FROM public.farm WHERE owner_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_animal_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT a.id FROM public.animal a WHERE a.farm_id IN (SELECT public.user_farm_ids()) $$;

CREATE OR REPLACE FUNCTION public.user_evaluation_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT e.id FROM public.evaluation e WHERE e.animal_id IN (SELECT public.user_animal_ids()) $$;

CREATE OR REPLACE FUNCTION public.user_mating_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT m.id FROM public.mating m WHERE m.farm_id IN (SELECT public.user_farm_ids()) $$;

-- Recria as políticas usando os helpers (sem nesting de RLS)
DROP POLICY IF EXISTS animal_by_farm           ON public.animal;
DROP POLICY IF EXISTS animal_relation_by_farm  ON public.animal_relation;
DROP POLICY IF EXISTS evaluation_by_farm       ON public.evaluation;
DROP POLICY IF EXISTS evaluation_trait_by_farm ON public.evaluation_trait;
DROP POLICY IF EXISTS file_asset_by_farm       ON public.file_asset;
DROP POLICY IF EXISTS mating_by_farm           ON public.mating;
DROP POLICY IF EXISTS mating_trait_by_farm     ON public.mating_trait_result;
DROP POLICY IF EXISTS report_by_farm           ON public.report;

CREATE POLICY animal_by_farm ON public.animal
  FOR ALL TO authenticated
  USING (farm_id IN (SELECT public.user_farm_ids()))
  WITH CHECK (farm_id IN (SELECT public.user_farm_ids()));

CREATE POLICY animal_relation_by_farm ON public.animal_relation
  FOR ALL TO authenticated
  USING (animal_id IN (SELECT public.user_animal_ids()))
  WITH CHECK (animal_id IN (SELECT public.user_animal_ids()));

CREATE POLICY evaluation_by_farm ON public.evaluation
  FOR ALL TO authenticated
  USING (animal_id IN (SELECT public.user_animal_ids()))
  WITH CHECK (animal_id IN (SELECT public.user_animal_ids()));

CREATE POLICY evaluation_trait_by_farm ON public.evaluation_trait
  FOR ALL TO authenticated
  USING (evaluation_id IN (SELECT public.user_evaluation_ids()))
  WITH CHECK (evaluation_id IN (SELECT public.user_evaluation_ids()));

CREATE POLICY file_asset_by_farm ON public.file_asset
  FOR ALL TO authenticated
  USING (animal_id IN (SELECT public.user_animal_ids()))
  WITH CHECK (animal_id IN (SELECT public.user_animal_ids()));

CREATE POLICY mating_by_farm ON public.mating
  FOR ALL TO authenticated
  USING (farm_id IN (SELECT public.user_farm_ids()))
  WITH CHECK (farm_id IN (SELECT public.user_farm_ids()));

CREATE POLICY mating_trait_by_farm ON public.mating_trait_result
  FOR ALL TO authenticated
  USING (mating_id IN (SELECT public.user_mating_ids()))
  WITH CHECK (mating_id IN (SELECT public.user_mating_ids()));

CREATE POLICY report_by_farm ON public.report
  FOR ALL TO authenticated
  USING (mating_id IN (SELECT public.user_mating_ids()))
  WITH CHECK (mating_id IN (SELECT public.user_mating_ids()));

-- Storage: o app exibe fotos via getPublicUrl, então o bucket precisa ser
-- público para leitura. Escrita endurecida: apenas usuários donos de fazenda
-- (cadastros avulsos via signup aberto não conseguem gravar no bucket).
UPDATE storage.buckets SET public = true WHERE id = 'animal-photos';

DROP POLICY IF EXISTS animal_photos_insert ON storage.objects;
DROP POLICY IF EXISTS animal_photos_update ON storage.objects;
DROP POLICY IF EXISTS animal_photos_delete ON storage.objects;

CREATE POLICY animal_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'animal-photos' AND EXISTS (SELECT 1 FROM public.user_farm_ids()));
CREATE POLICY animal_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'animal-photos' AND EXISTS (SELECT 1 FROM public.user_farm_ids()))
  WITH CHECK (bucket_id = 'animal-photos' AND EXISTS (SELECT 1 FROM public.user_farm_ids()));
CREATE POLICY animal_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'animal-photos' AND EXISTS (SELECT 1 FROM public.user_farm_ids()));
