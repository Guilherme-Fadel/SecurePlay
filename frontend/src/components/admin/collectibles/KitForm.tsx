import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { CollectibleSlotType } from '@/services/adminCollectibles';
import type { FormErrors, KitForm as KitFormState, PieceDraft } from './adminCollectiblesForm';
import { CommonFields } from './CommonFields';
import { FieldError, FormSection } from './FormSection';
import { KitPiecesGrid } from './KitPiecesGrid';
import { RequirementsEditor } from './RequirementsEditor';

interface KitFormProps {
  value: KitFormState;
  errors: FormErrors;
  onChange: Dispatch<SetStateAction<KitFormState>>;
  /** Slug fixo depois do primeiro salvamento. */
  locked: boolean;
  /** Seletor Item avulso | Kit, só na criação. */
  kindSwitch?: ReactNode;
}

const BASICS_HELP = 'O kit é comprado inteiro, com um preço só; as peças nascem com ele e depois o aluno usa cada uma separada. Em raridade Comemorativa, informe também a data e o período de venda.';
const PIECES_HELP = 'Uma linha por encaixe. Marque as peças do kit, dê nome e envie a arte de cada uma (PNG ou SVG, até 200 KB). Todas as peças marcadas precisam de arte para publicar. Desmarcar uma peça já salva a tira do kit; quem já a tem continua com ela.';

/** Kit: dados comuns, exigências e a grade fixa de peças com arte e ajuste fino. */
export function KitForm({ value, errors, onChange, locked, kindSwitch }: KitFormProps) {
  const patchPiece = (type: CollectibleSlotType, change: Partial<PieceDraft>) => onChange((previous) => ({
    ...previous, pieces: previous.pieces.map((piece) => (piece.type === type ? { ...piece, ...change } : piece)),
  }));
  return <>
    <FormSection title="Dados do kit" help={BASICS_HELP}>
      {kindSwitch}
      <CommonFields value={value} errors={errors} onChange={onChange} slugLocked={locked} slugMax={70} nameLabel="Nome do kit" />
    </FormSection>
    <RequirementsEditor rule={value.rule} errors={errors} onChange={(rule) => onChange((previous) => ({ ...previous, rule }))} />
    <FormSection title="Peças do kit" help={PIECES_HELP}>
      <KitPiecesGrid pieces={value.pieces} errors={errors} onPiece={patchPiece} />
      <FieldError>{errors.pieces}</FieldError>
    </FormSection>
  </>;
}
