-- Habilita RLS em todas as tabelas públicas com escopo por fazenda:
-- o dono (farm.owner_id = auth.uid()) acessa apenas os dados da própria farm.
-- Pré-requisito: farm.owner_id preenchido (sem isso o dono perde acesso aos dados).

ALTER TABLE public.farm                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_relation     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_trait    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trait_dictionary    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_asset          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mating              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mating_trait_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report              ENABLE ROW LEVEL SECURITY;

-- farm: dono acessa tudo da própria fazenda
CREATE POLICY farm_owner ON public.farm
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- animal: escopo via farm
CREATE POLICY animal_by_farm ON public.animal
  FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farm WHERE owner_id = (SELECT auth.uid())))
  WITH CHECK (farm_id IN (SELECT id FROM public.farm WHERE owner_id = (SELECT auth.uid())));

-- animal_relation: escopo via animal -> farm
CREATE POLICY animal_relation_by_farm ON public.animal_relation
  FOR ALL TO authenticated
  USING (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- evaluation: escopo via animal -> farm
CREATE POLICY evaluation_by_farm ON public.evaluation
  FOR ALL TO authenticated
  USING (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- evaluation_trait: escopo via evaluation -> animal -> farm
CREATE POLICY evaluation_trait_by_farm ON public.evaluation_trait
  FOR ALL TO authenticated
  USING (evaluation_id IN (
    SELECT e.id FROM public.evaluation e
    JOIN public.animal a ON a.id = e.animal_id
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (evaluation_id IN (
    SELECT e.id FROM public.evaluation e
    JOIN public.animal a ON a.id = e.animal_id
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- trait_dictionary: referência compartilhada, somente leitura para o app;
-- escrita fica restrita ao service role (seeds/migrations)
CREATE POLICY trait_dictionary_read ON public.trait_dictionary
  FOR SELECT TO authenticated
  USING (true);

-- file_asset: escopo via animal -> farm
CREATE POLICY file_asset_by_farm ON public.file_asset
  FOR ALL TO authenticated
  USING (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (animal_id IN (
    SELECT a.id FROM public.animal a
    JOIN public.farm f ON f.id = a.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- mating: escopo via farm
CREATE POLICY mating_by_farm ON public.mating
  FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farm WHERE owner_id = (SELECT auth.uid())))
  WITH CHECK (farm_id IN (SELECT id FROM public.farm WHERE owner_id = (SELECT auth.uid())));

-- mating_trait_result: escopo via mating -> farm
CREATE POLICY mating_trait_by_farm ON public.mating_trait_result
  FOR ALL TO authenticated
  USING (mating_id IN (
    SELECT m.id FROM public.mating m
    JOIN public.farm f ON f.id = m.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (mating_id IN (
    SELECT m.id FROM public.mating m
    JOIN public.farm f ON f.id = m.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- report: escopo via mating -> farm
CREATE POLICY report_by_farm ON public.report
  FOR ALL TO authenticated
  USING (mating_id IN (
    SELECT m.id FROM public.mating m
    JOIN public.farm f ON f.id = m.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (mating_id IN (
    SELECT m.id FROM public.mating m
    JOIN public.farm f ON f.id = m.farm_id
    WHERE f.owner_id = (SELECT auth.uid())
  ));

-- Storage: políticas do bucket animal-photos (privado, acesso para autenticados)
CREATE POLICY animal_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'animal-photos');
CREATE POLICY animal_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'animal-photos');
CREATE POLICY animal_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'animal-photos')
  WITH CHECK (bucket_id = 'animal-photos');
CREATE POLICY animal_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'animal-photos');
