export type SexoAnimal = 'M' | 'F';
export type StatusAnimal = 'ativo' | 'vendido' | 'morto' | 'inativo';
export type ProgramaAvaliacao = 'GENEPLUS' | 'PMGZ' | 'ANCP';
export type RankTipo = 'PERCENTIL' | 'DECA' | 'TOP' | 'CLASSE' | 'NENHUM';
export type TraitGroup = 'REPRODUCAO' | 'CRESCIMENTO' | 'CARCACA' | 'FUNCIONAL' | 'MATERNO';
export type TraitDirection = 'MAIOR_MELHOR' | 'MENOR_MELHOR';

export interface Farm {
  id: string;
  nome: string;
  owner_id?: string;
  cidade_uf?: string;
  created_at?: string;
}

export interface Animal {
  id: string;
  farm_id: string;
  nome_exibicao: string;
  sexo: SexoAnimal;
  raca: string;
  categoria_registral: string;
  serie_registro?: string;
  rgn?: string;
  rgd?: string;
  registro_composto: string;
  data_nascimento: string;
  status: StatusAnimal;
  proprietario?: string;
  criador?: string;
  fazenda?: string;
  municipio_uf?: string;
  central_semen?: string;
  categoria_reprodutiva?: string;
  genotipado: boolean;
  consanguinidade_pct?: number;
  observacoes?: string;
  created_at?: string;
}

export interface AnimalRelation {
  id: string;
  animal_id: string;
  relation_type: 'PAI' | 'MAE' | 'AVO_MATERNO';
  related_animal_id?: string;
  related_name?: string;
}

export interface Evaluation {
  id: string;
  animal_id: string;
  programa: ProgramaAvaliacao;
  edicao?: string;
  data_ref?: string;
  base_genetica?: string;
  indice_resumo_nome?: string;
  indice_resumo_valor?: number;
  rank_resumo_tipo?: RankTipo;
  rank_resumo_valor?: number;
  fonte_imagem?: string;
  raw_payload?: Record<string, any>;
  created_at?: string;
}

export interface EvaluationTrait {
  id: string;
  evaluation_id: string;
  code: string;
  label?: string;
  grp?: TraitGroup;
  unit?: string;
  value?: number;
  accuracy?: number;
  rank_type?: RankTipo;
  rank_value?: number;
  classe?: string;
  direction?: TraitDirection;
}

export interface TraitDictionary {
  id: string;
  concept_key: string;
  grp: TraitGroup;
  unit?: string;
  direction: TraitDirection;
  code_geneplus?: string;
  code_pmgz?: string;
  code_ancp?: string;
  label: string;
}

export interface FileAsset {
  id: string;
  animal_id?: string;
  tipo?: 'FOTO' | 'FICHA' | 'PDF';
  arquivo_url: string;
  origem?: string;
  created_at?: string;
}
