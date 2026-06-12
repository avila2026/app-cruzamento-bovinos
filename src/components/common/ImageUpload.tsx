import React, { useCallback, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ImagePlus, Loader2, X } from 'lucide-react';

const BUCKET = 'animal-photos';

interface ImageUploadProps {
  /** URL já existente (modo edição/visualização). */
  value?: string | null;
  /** Disparado quando o upload conclui com a URL pública gerada. */
  onUploaded: (url: string) => void;
  /** Disparado ao remover a imagem selecionada. */
  onRemoved?: () => void;
}

/**
 * Componente reutilizável de upload de imagens conectado ao Supabase Storage.
 * Faz drag-and-drop ou seleção manual, envia para o bucket público `animal-photos`
 * e devolve a URL pública gerada para ser salva em `file_asset`.
 */
const ImageUpload: React.FC<ImageUploadProps> = ({ value, onUploaded, onRemoved }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.type.startsWith('image/')) {
        setError('Selecione um arquivo de imagem válido.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5 MB.');
        return;
      }

      // Preview local imediato
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        setUploading(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        setPreview(data.publicUrl);
        onUploaded(data.publicUrl);
      } catch (err) {
        const error = err as Error;
        console.error('Erro no upload:', error);
        setError(error.message || 'Falha ao enviar a imagem.');
        setPreview(value ?? null);
      } finally {
        setUploading(false);
        URL.revokeObjectURL(localUrl);
      }
    },
    [onUploaded, value]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onRemoved?.();
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors min-h-[180px] overflow-hidden ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-neutral-700 bg-neutral-950 hover:border-neutral-600'
        } ${!preview ? 'cursor-pointer' : ''}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Pré-visualização" className="h-full w-full max-h-64 object-contain" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/60">
                <Loader2 className="animate-spin text-emerald-400" size={28} />
              </div>
            )}
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 rounded-full bg-neutral-950/80 p-1.5 text-neutral-300 hover:text-white hover:bg-red-600/80 transition-colors"
              title="Remover imagem"
            >
              <X size={16} />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center text-neutral-400">
            <Loader2 className="animate-spin text-emerald-400 mb-2" size={28} />
            <span className="text-sm">Enviando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-neutral-500 p-4 text-center">
            <ImagePlus size={32} className="mb-2 text-neutral-600" />
            <span className="text-sm font-medium text-neutral-300">Arraste uma foto aqui</span>
            <span className="text-xs mt-1">ou clique para selecionar (PNG/JPG até 5MB)</span>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onSelect} className="hidden" title="Upload de imagem" />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default ImageUpload;
