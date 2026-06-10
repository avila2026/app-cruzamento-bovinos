import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Play } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedAnimalRow {
  nome_exibicao: string;
  sexo: 'M' | 'F';
  raca: string;
  categoria_registral: string;
  rgd: string;
  registro_composto: string;
  data_nascimento: string;
  pai?: string;
  mae?: string;
  avo_materno?: string;
  isValid: boolean;
  errors: string[];
}

const ImportCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ParsedAnimalRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): ParsedAnimalRow[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const result: ParsedAnimalRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Suporte simples para aspas no CSV
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          rowData[header] = values[index];
        }
      });

      const nome_exibicao = rowData['nome_exibicao'] || rowData['nome'] || '';
      let sexo = (rowData['sexo'] || '').toUpperCase();
      if (sexo !== 'M' && sexo !== 'F') {
        // Fallback simples
        if (sexo.startsWith('M') || sexo.startsWith('T') || sexo.startsWith('B')) sexo = 'M';
        else if (sexo.startsWith('F') || sexo.startsWith('M') || sexo.startsWith('D')) sexo = 'F';
      }
      const raca = rowData['raca'] || 'Nelore';
      const categoria_registral = rowData['categoria_registral'] || 'PO';
      const rgd = rowData['rgd'] || '';
      const registro_composto = rowData['registro_composto'] || rgd || '';
      let data_nascimento = rowData['data_nascimento'] || rowData['nascimento'] || '';
      
      // Validações básicas
      const errors: string[] = [];
      if (!nome_exibicao) errors.push('Nome de exibição é obrigatório');
      if (sexo !== 'M' && sexo !== 'F') errors.push('Sexo deve ser M ou F');
      if (!data_nascimento) {
        // Se vazio, bota data padrão de hoje para passar validações de constraint
        data_nascimento = new Date().toISOString().split('T')[0];
        errors.push('Data de nascimento é obrigatória (AAAA-MM-DD)');
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) {
        errors.push('Data de nascimento deve estar no formato AAAA-MM-DD');
      }

      result.push({
        nome_exibicao,
        sexo: sexo as 'M' | 'F',
        raca,
        categoria_registral,
        rgd,
        registro_composto,
        data_nascimento,
        pai: rowData['pai'] || undefined,
        mae: rowData['mae'] || undefined,
        avo_materno: rowData['avo_materno'] || rowData['avo'] || undefined,
        isValid: errors.length === 0,
        errors
      });
    }

    return result;
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('O arquivo CSV parece estar vazio ou não possuir cabeçalhos válidos.');
      } else {
        setRows(parsed);
        toast.success(`${parsed.length} animais carregados para prévia.`);
      }
    };
    reader.readAsText(file);
  };

  const startImport = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('Nenhum animal válido para importar.');
      return;
    }

    setIsImporting(true);
    try {
      // 1. Buscar a fazenda padrão
      const { data: farms, error: farmError } = await supabase.from('farm').select('id').limit(1);
      if (farmError || !farms || farms.length === 0) {
        throw new Error('Não foi possível carregar a fazenda padrão.');
      }
      const farmId = farms[0].id;

      let successCount = 0;

      for (const row of validRows) {
        // 2. Inserir animal
        const { data: animalData, error: animalError } = await supabase
          .from('animal')
          .insert({
            farm_id: farmId,
            nome_exibicao: row.nome_exibicao,
            sexo: row.sexo,
            raca: row.raca,
            categoria_registral: row.categoria_registral,
            rgd: row.rgd || null,
            registro_composto: row.registro_composto || row.nome_exibicao,
            data_nascimento: row.data_nascimento,
            is_observed: true, // Importa como animal em observação
            status: 'ativo'
          })
          .select('id')
          .single();

        if (animalError) {
          console.error(`Erro ao importar ${row.nome_exibicao}:`, animalError.message);
          continue;
        }

        successCount++;

        // 3. Inserir pedigree relations se houverem
        const relations = [];
        if (row.pai) {
          relations.push({ animal_id: animalData.id, relation_type: 'PAI', related_name: row.pai });
        }
        if (row.mae) {
          relations.push({ animal_id: animalData.id, relation_type: 'MAE', related_name: row.mae });
        }
        if (row.avo_materno) {
          relations.push({ animal_id: animalData.id, relation_type: 'AVO_MATERNO', related_name: row.avo_materno });
        }

        if (relations.length > 0) {
          const { error: relError } = await supabase.from('animal_relation').insert(relations);
          if (relError) console.error(`Erro ao salvar relações de pedigree para ${row.nome_exibicao}:`, relError.message);
        }
      }

      toast.success(`${successCount} animais importados com sucesso para a lista de observação!`);
      navigate('/observacao');
    } catch (err: any) {
      toast.error(err.message || 'Erro durante a importação.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "nome_exibicao,sexo,raca,categoria_registral,rgd,registro_composto,data_nascimento,pai,mae,avo_materno\n"
      + "Carbono FIV da S.Nice,M,Nelore,PO,GRIB9435,GRIB9435,2019-09-03,B5968 FIV DA S.NICE,B6444 DA S.NICE,B2887 DA S.NICE\n"
      + "Maori da Santa Nice,M,Nelore,PO,C3807,C3807,2022-07-19,RAM DA BELA,B5217 FIV DA S.NICE,REM ARMADOR";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_catalogo_cattlegen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/animais')}
          className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-gray-200 transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Importar Catálogo</h1>
          <p className="text-sm text-neutral-500">Adicione múltiplos animais em lote para a lista de observação.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="md:col-span-1 bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between h-[300px]">
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-2">Selecione o Arquivo</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Faça o upload do seu catálogo de touros ou matrizes em formato CSV.
            </p>
          </div>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-neutral-700 hover:border-emerald-500/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="text-neutral-500 mb-2" />
            <span className="text-xs text-neutral-400 text-center px-4">
              Arraste o arquivo CSV aqui ou clique para buscar
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv"
              title="Arquivo CSV de catálogo"
            />
          </div>

          <button
            onClick={downloadTemplate}
            className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 py-2 border border-emerald-500/20 bg-emerald-600/5 rounded-lg hover:bg-emerald-600/10 transition-colors"
          >
            <FileSpreadsheet size={14} />
            <span>Baixar Planilha Modelo (CSV)</span>
          </button>
        </div>

        {/* Informações de Auxílio */}
        <div className="md:col-span-2 bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Como deve ser o arquivo:</h3>
            <ul className="text-sm text-neutral-400 space-y-2 list-disc list-inside">
              <li>O arquivo deve conter cabeçalhos na primeira linha.</li>
              <li>A coluna <strong>nome_exibicao</strong> é o nome completo do animal (ex: <i>Carbono FIV da S.Nice</i>).</li>
              <li>A coluna <strong>sexo</strong> deve conter apenas <strong>M</strong> para Machos ou <strong>F</strong> para Fêmeas.</li>
              <li>A coluna <strong>data_nascimento</strong> deve seguir o formato <strong>AAAA-MM-DD</strong>.</li>
              <li>As colunas <strong>pai</strong>, <strong>mae</strong> e <strong>avo_materno</strong> são opcionais e importam a genealogia como texto.</li>
            </ul>
          </div>
          
          <div className="bg-neutral-950/40 border border-neutral-850 rounded-lg p-4 flex gap-3 items-start mt-6">
            <AlertTriangle className="text-amber-500 shrink-0" size={18} />
            <p className="text-xs text-neutral-400 leading-relaxed">
              <strong>Importante:</strong> Os animais importados por este módulo serão cadastrados automaticamente com a tag <strong>Em Observação</strong>. Eles não aparecerão nos seus relatórios de rebanho ativos até que você os "promova" individualmente.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {rows.length > 0 && (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-200">Prévia do Catálogo</h2>
              <p className="text-xs text-neutral-500">
                Total detectado: {rows.length} animais · Válidos: {rows.filter(r => r.isValid).length}
              </p>
            </div>
            <button
              onClick={startImport}
              disabled={isImporting || rows.filter(r => r.isValid).length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 disabled:text-neutral-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-950/10"
            >
              <Play size={16} />
              <span>{isImporting ? 'Importando...' : 'Iniciar Importação'}</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-neutral-800 rounded-lg">
            <table className="w-full text-left text-sm text-neutral-300">
              <thead className="bg-neutral-950 text-xs font-semibold uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Sexo</th>
                  <th className="p-3">RGD</th>
                  <th className="p-3">Raça</th>
                  <th className="p-3">Nascimento</th>
                  <th className="p-3">Pai</th>
                  <th className="p-3">Mãe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/20">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-neutral-900/30">
                    <td className="p-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded text-xs border border-emerald-500/10">
                          <CheckCircle2 size={12} />
                          <span>Válido</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-red-400 bg-red-500/5 px-2 py-0.5 rounded text-xs border border-red-500/10 cursor-help"
                          title={row.errors.join('\n')}
                        >
                          <AlertTriangle size={12} />
                          <span>Erro</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-gray-200">{row.nome_exibicao}</td>
                    <td className="p-3">{row.sexo}</td>
                    <td className="p-3 font-mono text-xs text-neutral-400">{row.rgd || '-'}</td>
                    <td className="p-3">{row.raca}</td>
                    <td className="p-3 text-xs">{row.data_nascimento}</td>
                    <td className="p-3 text-xs text-neutral-400 truncate max-w-[120px]">{row.pai || '-'}</td>
                    <td className="p-3 text-xs text-neutral-400 truncate max-w-[120px]">{row.mae || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportCatalog;
