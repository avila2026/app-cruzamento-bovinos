-- Índices nas foreign keys identificadas pelo Performance Advisor
CREATE INDEX IF NOT EXISTS idx_animal_farm_id           ON public.animal(farm_id);
CREATE INDEX IF NOT EXISTS idx_animal_relation_animal   ON public.animal_relation(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_relation_related  ON public.animal_relation(related_animal_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_animal        ON public.evaluation(animal_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_trait_eval    ON public.evaluation_trait(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_file_asset_animal        ON public.file_asset(animal_id);
CREATE INDEX IF NOT EXISTS idx_mating_farm              ON public.mating(farm_id);
CREATE INDEX IF NOT EXISTS idx_mating_sire              ON public.mating(sire_id);
CREATE INDEX IF NOT EXISTS idx_mating_dam               ON public.mating(dam_id);
CREATE INDEX IF NOT EXISTS idx_mating_trait_mating      ON public.mating_trait_result(mating_id);
CREATE INDEX IF NOT EXISTS idx_report_mating            ON public.report(mating_id);
