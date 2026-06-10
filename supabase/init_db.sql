-- Enums
create type sexo_animal as enum ('M', 'F');
create type status_animal as enum ('ativo', 'vendido', 'morto', 'inativo');
create type programa_aval as enum ('GENEPLUS', 'PMGZ', 'ANCP');
create type rank_tipo as enum ('PERCENTIL', 'DECA', 'TOP', 'CLASSE', 'NENHUM');
create type trait_group as enum (
  'REPRODUCAO',
  'CRESCIMENTO',
  'CARCACA',
  'FUNCIONAL',
  'MATERNO'
);
create type trait_dir as enum ('MAIOR_MELHOR', 'MENOR_MELHOR');
-- Escopo por fazenda
create table farm (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  owner_id uuid references auth.users(id),
  cidade_uf text,
  created_at timestamptz default now()
);
-- Cadastro mestre
create table animal (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farm(id) on delete cascade,
  nome_exibicao text not null check (
    char_length(nome_exibicao) between 3 and 120
  ),
  sexo sexo_animal not null,
  raca text not null,
  categoria_registral text not null,
  serie_registro text,
  rgn text,
  rgd text,
  registro_composto text not null,
  data_nascimento date not null check (data_nascimento <= current_date),
  status status_animal default 'ativo',
  proprietario text,
  criador text,
  fazenda text,
  municipio_uf text,
  central_semen text,
  categoria_reprodutiva text,
  genotipado boolean default false,
  consanguinidade_pct numeric(5, 2) check (
    consanguinidade_pct between 0 and 100
  ),
  observacoes text,
  created_at timestamptz default now()
);
-- Pedigree
create table animal_relation (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animal(id) on delete cascade,
  relation_type text not null,
  related_animal_id uuid references animal(id),
  related_name text
);
create table evaluation (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animal(id) on delete cascade,
  programa programa_aval not null,
  edicao text,
  data_ref date,
  base_genetica text,
  indice_resumo_nome text,
  indice_resumo_valor numeric,
  rank_resumo_tipo rank_tipo default 'NENHUM',
  rank_resumo_valor numeric,
  fonte_imagem text,
  raw_payload jsonb,
  created_at timestamptz default now(),
  unique (animal_id, programa, edicao)
);
create table evaluation_trait (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluation(id) on delete cascade,
  code text not null,
  label text,
  grp trait_group,
  unit text,
  value numeric,
  accuracy numeric check (
    accuracy between 0 and 100
  ),
  rank_type rank_tipo default 'NENHUM',
  rank_value numeric,
  classe text,
  direction trait_dir default 'MAIOR_MELHOR'
);
create table trait_dictionary (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null,
  grp trait_group not null,
  unit text,
  direction trait_dir not null default 'MAIOR_MELHOR',
  code_geneplus text,
  code_pmgz text,
  code_ancp text,
  label text not null
);
create table file_asset (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animal(id) on delete cascade,
  tipo text,
  arquivo_url text not null,
  origem text,
  created_at timestamptz default now()
);
create table mating (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farm(id) on delete cascade,
  sire_id uuid not null references animal(id),
  dam_id uuid not null references animal(id),
  programa_base programa_aval not null,
  objetivo text not null,
  score_composto numeric,
  confianca numeric,
  alertas jsonb,
  created_at timestamptz default now()
);
create table mating_trait_result (
  id uuid primary key default gen_random_uuid(),
  mating_id uuid not null references mating(id) on delete cascade,
  trait_code text,
  sire_value numeric,
  dam_value numeric,
  expected_value numeric,
  normalized_score numeric,
  weight numeric
);
create table report (
  id uuid primary key default gen_random_uuid(),
  mating_id uuid references mating(id) on delete cascade,
  formato text,
  arquivo_url text,
  gerado_em timestamptz default now()
);
-- Inserindo Dicionário de Traços (Semente Inicial)
insert into trait_dictionary (
    concept_key,
    grp,
    unit,
    direction,
    code_geneplus,
    code_pmgz,
    code_ancp,
    label
  )
values (
    'PESO_DESMAMA',
    'CRESCIMENTO',
    'kg',
    'MAIOR_MELHOR',
    'PD',
    'PD-EDg',
    'DPDG',
    'Peso à desmama'
  ),
  (
    'PESO_SOBREANO',
    'CRESCIMENTO',
    'kg',
    'MAIOR_MELHOR',
    'PS',
    'PS-EDg',
    'DPSG',
    'Peso ao sobreano'
  ),
  (
    'GANHO_POS_DESMAMA',
    'CRESCIMENTO',
    'kg',
    'MAIOR_MELHOR',
    'GPD',
    null,
    null,
    'Ganho pós-desmama'
  ),
  (
    'HABILIDADE_MATERNAL',
    'MATERNO',
    'kg',
    'MAIOR_MELHOR',
    'TMD',
    'TMDg',
    'DMDG',
    'Habilidade maternal (peso)'
  ),
  (
    'IDADE_PRIMEIRO_PARTO',
    'REPRODUCAO',
    'dias',
    'MENOR_MELHOR',
    'IPP',
    'IPPg',
    'DIPPG',
    'Idade ao 1º parto'
  ),
  (
    'PERIMETRO_ESCROTAL_365D',
    'REPRODUCAO',
    'cm',
    'MAIOR_MELHOR',
    'PES',
    'PE-365g',
    'DPE365G',
    'Perímetro escrotal 365d'
  ),
  (
    'PERIMETRO_ESCROTAL_450D',
    'REPRODUCAO',
    'cm',
    'MAIOR_MELHOR',
    null,
    'PE-450g',
    'DPE450G',
    'Perímetro escrotal 450d'
  ),
  (
    'STAYABILITY',
    'FUNCIONAL',
    '%',
    'MAIOR_MELHOR',
    'HP/STAY',
    'STAYg',
    'DSTAYG',
    'Stay / permanência'
  ),
  (
    'AREA_OLHO_LOMBO',
    'CARCACA',
    'cm²',
    'MAIOR_MELHOR',
    'AOL',
    'AOLg',
    'DAOLG',
    'Área de olho de lombo'
  ),
  (
    'ACABAMENTO_GORDURA',
    'CARCACA',
    'mm',
    'MAIOR_MELHOR',
    'EGS',
    'ACABg',
    'DACABG',
    'Acabamento de gordura'
  ),
  (
    'MARMOREIO',
    'CARCACA',
    'escore',
    'MAIOR_MELHOR',
    'MAR',
    'MARg',
    'DMARG',
    'Marmoreio'
  ),
  (
    'PESO_NASCER',
    'CRESCIMENTO',
    'kg',
    'MENOR_MELHOR',
    'PN',
    'PN-EDg',
    'DPNG',
    'Peso ao nascer'
  );
-- Inserindo Fazenda Padrão (Agropecuária Ávila) para testes
insert into farm (nome, cidade_uf)
values ('Agropecuária Ávila', 'Acre - AC');