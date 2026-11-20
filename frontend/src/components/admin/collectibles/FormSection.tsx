import { useId, type ReactNode } from 'react';
import { AdminHelpTip } from '@/components/admin/AdminHelpTip';

/** Bloco do formulário: título `h2` e ajuda da seção em `AdminHelpTip` (sem ícone decorativo). */
export function FormSection({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  const id = useId();
  return <section className="admin-console-settings-card collectible-form-section" aria-labelledby={id}>
    <div className="admin-heading-title"><h2 id={id}>{title}</h2><AdminHelpTip label={title} text={help} /></div>
    {children}
  </section>;
}

/** Mensagem de erro de um campo ou bloco; `role="alert"` para o leitor de tela anunciar. */
export function FieldError({ children }: { children?: string }) {
  return children ? <small className="collectible-field-error" role="alert">{children}</small> : null;
}
