import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { legalDocuments, LegalDocumentContent, type LegalDocument } from './LegalDocuments';
import '@/pages/legal-pages.css';

export function RegistrationLegalNotice() {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!document || !dialog) return;
    dialog.showModal();
    return () => {
      dialog.close();
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [document]);
  return <>
    <p className="invite-legal-note">Ao criar sua conta, você confirma que leu a <button type="button" aria-haspopup="dialog" onClick={event => { triggerRef.current = event.currentTarget; setDocument('privacy'); }}>Privacidade</button> e os <button type="button" aria-haspopup="dialog" onClick={event => { triggerRef.current = event.currentTarget; setDocument('terms'); }}>Termos de uso</button>. Se for criança, peça ajuda a um responsável ou educador.</p>
    <dialog ref={dialogRef} className="registration-legal-dialog" aria-labelledby={titleId} onClose={() => setDocument(null)}>
      {document && <>
        <button type="button" className="legal-back" autoFocus onClick={() => setDocument(null)}><ArrowLeft size={17} aria-hidden="true" /> Voltar ao cadastro</button>
        <p className="legal-eyebrow">{legalDocuments[document].eyebrow}</p>
        <h2 id={titleId}>{legalDocuments[document].title}</h2>
        <div className="legal-content"><LegalDocumentContent document={document} /></div>
      </>}
    </dialog>
  </>;
}
