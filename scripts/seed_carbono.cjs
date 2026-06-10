const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler o .env.local manualmente para obter as chaves
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
} catch (e) {
  console.error("Não foi possível ler o arquivo .env.local", e);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("URL ou Key do Supabase não encontradas no arquivo .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Conectando ao Supabase em:", supabaseUrl);

  // 1. Obter ou criar a fazenda padrão
  let farmId;
  const { data: farms, error: farmError } = await supabase.from('farm').select('id').limit(1);
  
  if (farmError) {
    console.error("Erro ao obter fazenda. O DDL init_db.sql foi executado?", farmError);
    return;
  }
  
  if (!farms || farms.length === 0) {
    console.log("Nenhuma fazenda encontrada. Criando fazenda padrão 'Agropecuária Ávila'...");
    const { data: newFarm, error: createFarmError } = await supabase.from('farm').insert([
      { nome: 'Agropecuária Ávila', cidade_uf: 'Acre - AC' }
    ]).select().single();
    
    if (createFarmError) {
      console.error("Erro ao criar fazenda padrão:", createFarmError);
      return;
    }
    farmId = newFarm.id;
  } else {
    farmId = farms[0].id;
  }
  console.log("Fazenda pronta. ID:", farmId);

  // 2. Inserir o animal principal (Carbono FIV da S.Nice)
  const { data: animal, error: animalError } = await supabase.from('animal').insert([
    {
      farm_id: farmId,
      nome_exibicao: 'Carbono FIV da S.Nice',
      sexo: 'M',
      raca: 'Nelore',
      categoria_registral: 'PO',
      serie_registro: 'GRI',
      rgd: 'C3807',
      registro_composto: 'GRIC3807',
      data_nascimento: '2022-07-19',
      status: 'ativo',
      proprietario: 'FAZ. SANTA NICE LTDA',
      criador: 'Fazenda Santa Nice / Marcelo Procopio Grisi',
      fazenda: 'SANTA NICE',
      municipio_uf: 'AMAPORA - PR',
      central_semen: 'Alta Genetics',
      genotipado: true,
      consanguinidade_pct: 2.61,
      observacoes: 'Destaque absoluto avaliado nas três principais plataformas (Geneplus, PMGZ e ANCP).'
    }
  ]).select().single();

  if (animalError) {
    console.error("Erro ao cadastrar Carbono:", animalError);
    return;
  }
  const animalId = animal.id;
  console.log("Carbono cadastrado com sucesso! ID:", animalId);

  // 3. Cadastrar as relações de pedigree básicas
  const { error: pedigreeError } = await supabase.from('animal_relation').insert([
    { animal_id: animalId, relation_type: 'PAI', related_name: 'RAM DA BELA' },
    { animal_id: animalId, relation_type: 'MAE', related_name: 'B5217 FIV DA S.NICE' },
    { animal_id: animalId, relation_type: 'AVO_MATERNO', related_name: 'REM ARMADOR' }
  ]);

  if (pedigreeError) {
    console.error("Erro ao salvar genealogia:", pedigreeError);
  } else {
    console.log("Genealogia salva com sucesso!");
  }

  // 4. Inserir Avaliações
  
  // A. Avaliação GENEPLUS (Outubro/2024)
  const { data: evalGeneplus, error: epError } = await supabase.from('evaluation').insert([
    {
      animal_id: animalId,
      programa: 'GENEPLUS',
      edicao: 'Outubro/2024',
      data_ref: '2024-10-01',
      base_genetica: 'EMBRAPA GADO DE CORTE',
      indice_resumo_nome: 'IQGg',
      indice_resumo_valor: 48.26,
      rank_resumo_tipo: 'PERCENTIL',
      rank_resumo_valor: 0.1
    }
  ]).select().single();

  if (epError) {
    console.error("Erro ao criar avaliação Geneplus:", epError);
  } else {
    console.log("Avaliação Geneplus criada. Inserindo traços...");
    const traitsGP = [
      { evaluation_id: evalGeneplus.id, code: 'PN', label: 'Peso ao nascer', grp: 'CRESCIMENTO', unit: 'kg', value: 1.12, accuracy: 45, rank_type: 'PERCENTIL', rank_value: 99, classe: 'I', direction: 'MENOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'P120', label: 'Peso aos 120d (EM)', grp: 'MATERNO', unit: 'kg', value: 1.46, accuracy: 35, rank_type: 'PERCENTIL', rank_value: 26, classe: 'S', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'TM120', label: 'Total materno 120d', grp: 'MATERNO', unit: 'kg', value: 5.31, accuracy: 0, rank_type: 'PERCENTIL', rank_value: 4, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'PD', label: 'Peso à desmama', grp: 'CRESCIMENTO', unit: 'kg', value: 12.87, accuracy: 46, rank_type: 'PERCENTIL', rank_value: 0.5, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'TMD', label: 'Total materno desmama', grp: 'MATERNO', unit: 'kg', value: 8.83, accuracy: 0, rank_type: 'PERCENTIL', rank_value: 2, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'PS', label: 'Peso ao sobreano', grp: 'CRESCIMENTO', unit: 'kg', value: 27.19, accuracy: 47, rank_type: 'PERCENTIL', rank_value: 0.5, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'GPD', label: 'Ganho pós-desmama', grp: 'CRESCIMENTO', unit: 'kg', value: 14.32, accuracy: 47, rank_type: 'PERCENTIL', rank_value: 0.5, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'CFD', label: 'Carcass Feed Desmama', grp: 'CARCACA', unit: '1-6', value: 6.97, accuracy: 33, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'CFS', label: 'Carcass Feed Sobreano', grp: 'CARCACA', unit: '1-6', value: 10.97, accuracy: 35, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'HP/STAY', label: 'Stayability', grp: 'FUNCIONAL', unit: '%', value: 48.34, accuracy: 20, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'PES', label: 'Perímetro Escrotal Sobreano', grp: 'REPRODUCAO', unit: 'cm', value: 1.99, accuracy: 39, rank_type: 'PERCENTIL', rank_value: 0.5, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'IPP', label: 'Idade ao Primeiro Parto', grp: 'REPRODUCAO', unit: 'dias', value: -26.90, accuracy: 27, rank_type: 'PERCENTIL', rank_value: 2, classe: 'E', direction: 'MENOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'AOL', label: 'Área de Olho de Lombo', grp: 'CARCACA', unit: 'cm²', value: 7.35, accuracy: 42, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'EGS', label: 'Espessura de Gordura Subcutânea', grp: 'CARCACA', unit: 'mm', value: 4.84, accuracy: 36, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'MAR', label: 'Marmoreio', grp: 'CARCACA', unit: '%', value: 4.34, accuracy: 35, rank_type: 'PERCENTIL', rank_value: 0.1, classe: 'E', direction: 'MAIOR_MELHOR' },
      { evaluation_id: evalGeneplus.id, code: 'CAR', label: 'Consumo Alimentar Residual', grp: 'FUNCIONAL', unit: 'kg/dia', value: -0.08, accuracy: 15, rank_type: 'PERCENTIL', rank_value: 1, classe: 'E', direction: 'MENOR_MELHOR' }
    ];
    await supabase.from('evaluation_trait').insert(traitsGP);
  }

  // B. Avaliação PMGZ (2024-4)
  const { data: evalPmgz, error: pmgzError } = await supabase.from('evaluation').insert([
    {
      animal_id: animalId,
      programa: 'PMGZ',
      edicao: '2024-4',
      data_ref: '2024-11-01',
      base_genetica: 'ABCZ',
      indice_resumo_nome: 'iABCZg',
      indice_resumo_valor: 37.47,
      rank_resumo_tipo: 'DECA',
      rank_resumo_valor: 1
    }
  ]).select().single();

  if (pmgzError) {
    console.error("Erro ao criar avaliação PMGZ:", pmgzError);
  } else {
    console.log("Avaliação PMGZ criada. Inserindo traços...");
    const traitsPmgz = [
      { evaluation_id: evalPmgz.id, code: 'PD-EDg', label: 'Peso desmama (direto)', grp: 'CRESCIMENTO', unit: 'kg', value: 12.87, accuracy: 46, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'PA-EDg', label: 'Peso ano (direto)', grp: 'CRESCIMENTO', unit: 'kg', value: 19.68, accuracy: 43, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'PS-EDg', label: 'Peso sobreano (direto)', grp: 'CRESCIMENTO', unit: 'kg', value: 27.19, accuracy: 47, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'PM-EMg', label: 'Peso fase materna', grp: 'MATERNO', unit: 'kg', value: 1.46, accuracy: 35, rank_type: 'DECA', rank_value: 3 },
      { evaluation_id: evalPmgz.id, code: 'TMDg', label: 'Total materno desmama', grp: 'MATERNO', unit: 'kg', value: 8.83, accuracy: 0, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'IPPg', label: 'Idade primeiro parto', grp: 'REPRODUCAO', unit: 'dias', value: -26.90, accuracy: 27, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'STAYg', label: 'Stayability', grp: 'FUNCIONAL', unit: '%', value: 48.34, accuracy: 20, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'PE-365g', label: 'PE aos 365d', grp: 'REPRODUCAO', unit: 'cm', value: 1.334, accuracy: 37, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'AOLg', label: 'Área de olho de lombo', grp: 'CARCACA', unit: 'cm²', value: 7.350, accuracy: 42, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'ACABg', label: 'Acabamento de carcaça', grp: 'CARCACA', unit: 'mm', value: 4.843, accuracy: 36, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'MARg', label: 'Marmoreio', grp: 'CARCACA', unit: '%', value: 4.34, accuracy: 35, rank_type: 'DECA', rank_value: 1 },
      { evaluation_id: evalPmgz.id, code: 'PN-EDg', label: 'Peso ao nascimento', grp: 'CRESCIMENTO', unit: 'kg', value: 1.12, accuracy: 45, rank_type: 'DECA', rank_value: 10, direction: 'MENOR_MELHOR' }
    ];
    await supabase.from('evaluation_trait').insert(traitsPmgz);
  }

  // C. Avaliação ANCP (12/2024)
  const { data: evalAncp, error: ancpError } = await supabase.from('evaluation').insert([
    {
      animal_id: animalId,
      programa: 'ANCP',
      edicao: 'Dezembro/2024',
      data_ref: '2024-12-11',
      base_genetica: 'ANCP 5a AG',
      indice_resumo_nome: 'MGTe',
      indice_resumo_valor: 30.57,
      rank_resumo_tipo: 'TOP',
      rank_resumo_valor: 0.5
    }
  ]).select().single();

  if (ancpError) {
    console.error("Erro ao criar avaliação ANCP:", ancpError);
  } else {
    console.log("Avaliação ANCP criada. Inserindo traços...");
    const traitsAncp = [
      { evaluation_id: evalAncp.id, code: 'DIPPG', label: 'Idade ao primeiro parto', grp: 'REPRODUCAO', unit: 'dias', value: -1.03, accuracy: 38, rank_type: 'TOP', rank_value: 8, direction: 'MENOR_MELHOR' },
      { evaluation_id: evalAncp.id, code: 'D3PG', label: 'Stayability aos 3 anos', grp: 'FUNCIONAL', unit: '%', value: 82.90, accuracy: 54, rank_type: 'TOP', rank_value: 13 },
      { evaluation_id: evalAncp.id, code: 'DSTAYG', label: 'Stayability geral', grp: 'FUNCIONAL', unit: '%', value: 91.30, accuracy: 46, rank_type: 'TOP', rank_value: 1 },
      { evaluation_id: evalAncp.id, code: 'DPACG', label: 'Probabilidade de parto precoce', grp: 'REPRODUCAO', unit: '%', value: 13.81, accuracy: 18, rank_type: 'TOP', rank_value: 0.5 },
      { evaluation_id: evalAncp.id, code: 'DPGG', label: 'Peso ao nascimento', grp: 'CRESCIMENTO', unit: 'kg', value: -3.77, accuracy: 57, rank_type: 'TOP', rank_value: 0.5, direction: 'MENOR_MELHOR' },
      { evaluation_id: evalAncp.id, code: 'DPNG', label: 'Peso materno ao nascer', grp: 'MATERNO', unit: 'kg', value: 1.38, accuracy: 61, rank_type: 'TOP', rank_value: 93, direction: 'MENOR_MELHOR' },
      { evaluation_id: evalAncp.id, code: 'DP210G', label: 'Peso aos 210 dias', grp: 'CRESCIMENTO', unit: 'kg', value: 14.68, accuracy: 58, rank_type: 'TOP', rank_value: 3 },
      { evaluation_id: evalAncp.id, code: 'DP450G', label: 'Peso aos 450 dias', grp: 'CRESCIMENTO', unit: 'kg', value: 28.63, accuracy: 62, rank_type: 'TOP', rank_value: 2 },
      { evaluation_id: evalAncp.id, code: 'DPE365G', label: 'PE 365d', grp: 'REPRODUCAO', unit: 'cm', value: 1.51, accuracy: 57, rank_type: 'TOP', rank_value: 3 },
      { evaluation_id: evalAncp.id, code: 'DPE450G', label: 'PE 450d', grp: 'REPRODUCAO', unit: 'cm', value: 1.56, accuracy: 60, rank_type: 'TOP', rank_value: 4 },
      { evaluation_id: evalAncp.id, code: 'DAOLG', label: 'Área de olho de lombo', grp: 'CARCACA', unit: 'cm²', value: 8.17, accuracy: 62, rank_type: 'TOP', rank_value: 0.1 },
      { evaluation_id: evalAncp.id, code: 'DACABG', label: 'Acabamento de gordura', grp: 'CARCACA', unit: 'mm', value: 0.88, accuracy: 61, rank_type: 'TOP', rank_value: 2 },
      { evaluation_id: evalAncp.id, code: 'DMARG', label: 'Marmoreio', grp: 'CARCACA', unit: '%', value: 0.37, accuracy: 58, rank_type: 'TOP', rank_value: 0.1 }
    ];
    await supabase.from('evaluation_trait').insert(traitsAncp);
  }

  console.log("Carga completa do Carbono FIV da S.Nice executada com sucesso!");
}

seed();
