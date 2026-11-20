import {
  EYES, EYE_Y, FACE_PATH, LEFT_EYE_X, RIGHT_EYE_X, SYMBOL_TRANSFORM,
  type BrandCharacterExpression,
} from '../../BrandCharacter';
import { CREAM } from './palette';

interface EyeSpec { color: string; expression: BrandCharacterExpression }

/** Olhos abertos e sorridentes do canvas aprovado; as demais expressões vêm do BrandCharacter. */
function Eyes({ color, expression }: EyeSpec) {
  if (expression === 'open') {
    return (
      <>
        <ellipse cx={LEFT_EYE_X} cy={EYE_Y} rx="5.4" ry="11.2" fill={color} />
        <ellipse cx={RIGHT_EYE_X} cy={EYE_Y} rx="5.4" ry="11.2" fill={color} />
        <circle cx="70" cy="78" r="2" fill="#fff" />
        <circle cx="91.4" cy="78" r="2" fill="#fff" />
      </>
    );
  }
  if (expression === 'happy') {
    return (
      <path
        d="M62 88 Q68.5 75 75 88 M83.4 88 Q89.9 75 96.4 88"
        fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
      />
    );
  }
  const Shape = EYES[expression] ?? EYES.open;
  return <Shape color={color} lx={LEFT_EYE_X} rx={RIGHT_EYE_X} y={EYE_Y} />;
}

/** Rosto creme do símbolo, o queixo e os olhos; o encaixe de rosto é desenhado por cima. */
export function FaceBase({ color, expression }: EyeSpec) {
  return (
    <>
      <path transform={SYMBOL_TRANSFORM} fill={CREAM} d={FACE_PATH} />
      <path d="M50 100 Q79 116 110 100 Q100 108 79 109 Q58 108 50 100 Z" fill="#E6D9C2" />
      <Eyes color={color} expression={expression} />
    </>
  );
}
