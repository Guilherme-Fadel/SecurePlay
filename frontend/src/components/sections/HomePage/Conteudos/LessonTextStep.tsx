import type { Ref } from 'react';
import { MessageCircleQuestion, Target, TriangleAlert } from 'lucide-react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { LessonBlock, LessonStep } from './lessonSteps';

interface LessonTextStepProps {
  step: LessonStep;
  index: number;
  headingRef: Ref<HTMLHeadingElement>;
}

function Block({ block }: { block: LessonBlock }) {
  if (block.kind === 'goal') {
    return (
      <div className="lesson-goal">
        <Target size={28} aria-hidden="true" />
        <div><small>Objetivo da aula</small><span>{block.text}</span></div>
      </div>
    );
  }
  if (block.kind === 'alert') {
    return (
      <div className="lesson-alert" role="note">
        <TriangleAlert size={28} aria-hidden="true" />
        <div><strong>Sinal de alerta</strong><span>{block.text}</span></div>
      </div>
    );
  }
  if (block.kind === 'question') {
    return (
      <div className="lesson-reflect">
        <small><MessageCircleQuestion size={16} aria-hidden="true" />Para refletir</small>
        <p>{block.text}</p>
      </div>
    );
  }
  return <p className="lesson-body">{block.text}</p>;
}

/** Conteúdo de uma etapa da aula em texto (padrão do piloto ou página simples). */
export function LessonTextStep({ step, index, headingRef }: LessonTextStepProps) {
  const paragraphs = step.blocks.filter((block) => block.kind === 'paragraph');
  const highlights = step.blocks.filter((block) => block.kind !== 'paragraph');

  let body;
  if (!step.blocks.length) {
    body = <p className="lesson-empty">Esta página não possui texto.</p>;
  } else if (step.kind === 'situation') {
    body = <>
      <div className="lesson-scene">
        <span className="lesson-scene-art" aria-hidden="true"><BrandCharacter expression="curious" /></span>
        <div>{paragraphs.map((block, i) => <p key={i}>{block.text}</p>)}</div>
      </div>
      {highlights.map((block, i) => <Block key={i} block={block} />)}
    </>;
  } else if (step.kind === 'act') {
    body = (
      <ol className="lesson-act-list">
        {paragraphs.map((block, i) => <li key={i}><b aria-hidden="true">{i + 1}</b><span>{block.text}</span></li>)}
      </ol>
    );
  } else if (step.kind === 'reflect') {
    body = <>
      {paragraphs.map((block, i) => <p key={i} className="lesson-note">{block.text}</p>)}
      {highlights.map((block, i) => <Block key={i} block={block} />)}
    </>;
  } else {
    body = step.blocks.map((block, i) => <Block key={i} block={block} />);
  }

  return (
    <div className="lesson-page lesson-enter">
      <h2 ref={headingRef} tabIndex={-1} className={step.heading ? 'lesson-display lesson-step-title' : 'lesson-page-title'}>
        {step.heading ?? `Página ${index + 1}`}
      </h2>
      {body}
    </div>
  );
}
