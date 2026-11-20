import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { isAxiosError } from 'axios';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { mensagemDeErro } from '@/components/admin/turmas/turmaUi';
import { FieldError } from './FormSection';

/** Texto do erro de upload: recusa do cliente (Error) ou explicação do backend (resposta da API). */
export function uploadErrorText(error: unknown): string {
  if (isAxiosError(error)) return mensagemDeErro(error, 'Não foi possível enviar a arte.');
  return error instanceof Error && error.message ? error.message : 'Não foi possível enviar a arte.';
}

interface ArtUploadProps {
  /** Nome do que recebe a arte, para o leitor de tela ("Enviar arte de Cabeça"). */
  name: string;
  artKey: string | null;
  artUrl: string | null;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
}

/** Botão "Enviar arte" (PNG ou SVG) e o estado da arte: miniatura, "Arte enviada" ou "Sem arte". Devolve duas células da grade. */
export function ArtUploadField({ name, artKey, artUrl, disabled = false, onUpload }: ArtUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setBusy(true); setError(undefined);
    try { await onUpload(file); } catch (failure) { setError(uploadErrorText(failure)); } finally { setBusy(false); }
  };
  return <>
    <AppButton variant="ghost" size="control" icon={<Upload size={16} aria-hidden="true" />} aria-label={`Enviar arte de ${name}`} disabled={disabled || busy} onClick={() => input.current?.click()}>{busy ? 'Enviando…' : 'Enviar arte'}</AppButton>
    <input ref={input} className="collectible-art-file" type="file" accept=".png,.svg,image/png,image/svg+xml" tabIndex={-1} aria-hidden="true" onChange={(event) => void pick(event.target.files?.[0])} />
    <div className="collectible-art-state">
      <span className="collectible-art-status">
        {artUrl ? <img src={artUrl} alt={`Arte de ${name}`} /> : artKey ? 'Arte enviada' : 'Sem arte'}
      </span>
      <FieldError>{error}</FieldError>
    </div>
  </>;
}
