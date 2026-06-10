-- Enums
create type sexo_animal as enum ('M','F');
create type status_animal as enum ('ativo','vendido','morto','inativo');
create type programa_aval as enum ('GENEPLUS','PMGZ','ANCP');
create type rank_tipo as enum ('PERCENTIL','DECA','TOP','CLASSE','NENHUM');
create type trait_group as enum ('REPRODUCAO','CRESCIMENTO','CARCACA','FUNCIONAL','MATERNO');
create type trait_dir  as enum ('MAIOR_MELHOR','MENOR_MELHOR');

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
  nome_exibicao text not null check (char_length(nome_exibicao) between 3 and 120),
  sexo sexo_animal not null,
  raca text not null,
  categoria_registral text not null,          -- ex.: PO
  serie_registro text,                         -- ex.: GRI
  rgn text,
  rgd text,
  registro_composto text not null,             -- ex.: GRIB9435
  data_nascimento date not null check (data_nascimento <= current_date),
  status status_animal default 'ativo',
  proprietario text, criador text, fazenda text, municipio_uf text,
  central_semen text,                          -- usado p/ touro
  categoria_reprodutiva text,                  -- usado p/ fêmea (novilha/matriz/doadora)
  genotipado boolean default false,
  consanguinidade_pct numeric(5,2) check (consanguinidade_pct between 0 and 100),
  observacoes text,
  created_at timestamptz default now()
);

-- Pedigree (texto ou FK para outro animal cadastrado)
create table animal_relation (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animal(id) on delete cascade,
  relation_type text not null,                 -- PAI / MAE / AVO_MATERNO
  related_animal_id uuid references animal(id),
  related_name text                            -- usado quando não cadastrado
);

create table evaluation (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animal(id) on delete cascade,
  programa programa_aval not null,
  edicao text,                                 -- ex.: '2023-3', '4ª AG AGO/2023'
  data_ref date,
  base_genetica text,
  indice_resumo_nome text,                     -- IQGg / iABCZg / MGTe
  indice_resumo_valor numeric,
  rank_resumo_tipo rank_tipo default 'NENHUM',
  rank_resumo_valor numeric,
  fonte_imagem text,                           -- url no storage
  raw_payload jsonb,                           -- trilha de auditoria
  created_at timestamptz default now(),
  unique (animal_id, programa, edicao)
);

create table evaluation_trait (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluation(id) on delete cascade,
  code text not null,                          -- código ORIGINAL do programa (AOLg, DAOLG...)
  label text,                                  -- rótulo exibido
  grp trait_group,
  unit text,
  value numeric,                               -- DEP na unidade da característica
  accuracy numeric check (accuracy between 0 and 100),
  rank_type rank_tipo default 'NENHUM',
  rank_value numeric,
  classe text,
  direction trait_dir default 'MAIOR_MELHOR'
);

create table trait_dictionary (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null,                   -- chave canônica (ex.: 'AREA_OLHO_LOMBO')
  grp trait_group not null,
  unit text,
  direction trait_dir not null default 'MAIOR_MELHOR',
  code_geneplus text, code_pmgz text, code_ancp text,
  label text not null
);

create table file_asset (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animal(id) on delete cascade,
  tipo text,                                   -- FOTO / FICHA / PDF
  arquivo_url text not null, origem text,
  created_at timestamptz default now()
);

create table mating (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farm(id) on delete cascade,
  sire_id uuid not null references animal(id),
  dam_id  uuid not null references animal(id),
  programa_base programa_aval not null,
  objetivo text not null,                      -- novilhas / reposicao / terminal
  score_composto numeric, confianca numeric,
  alertas jsonb, created_at timestamptz default now()
);

create table mating_trait_result (
  id uuid primary key default gen_random_uuid(),
  mating_id uuid not null references mating(id) on delete cascade,
  trait_code text, sire_value numeric, dam_value numeric,
  expected_value numeric, normalized_score numeric, weight numeric
);

create table report (
  id uuid primary key default gen_random_uuid(),
  mating_id uuid references mating(id) on delete cascade,
  formato text, arquivo_url text, gerado_em timestamptz default now()
);

-- Ativar RLS nas tabelas
alter table farm enable row level security;
alter table animal enable row level security;
alter table animal_relation enable row level security;
alter table evaluation enable row level security;
alter table evaluation_trait enable row level security;
alter table trait_dictionary enable row level security;
alter table file_asset enable row level security;
alter table mating enable row level security;
alter table mating_trait_result enable row level security;
alter table report enable row level security;
