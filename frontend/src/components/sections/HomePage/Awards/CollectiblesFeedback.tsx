export interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

/** Regiões vivas sempre montadas: o texto muda dentro delas e é anunciado (sucesso por status, erro por alerta). */
export function FeedbackRegions({ feedback }: { feedback: Feedback | null }) {
  return (
    <>
      <p className="cole-feedback" role="status">{feedback?.kind === 'success' ? feedback.text : ''}</p>
      <p className="cole-feedback is-error" role="alert">{feedback?.kind === 'error' ? feedback.text : ''}</p>
    </>
  );
}
