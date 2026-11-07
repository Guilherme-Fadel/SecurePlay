const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');
const progression = load('src/lib/levelProgress.ts', {});
const { HomeLevelWeek } = load('src/components/sections/HomePage/Dashboard/HomeLevelWeek.tsx', {
  'lucide-react': { Check: 'svg' },
  '@/components/shared/BrandCharacter': { BrandCharacter: 'svg' },
  '@/lib/levelProgress': progression,
});
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  const children = [node.props?.children].flat(Infinity);
  return [node, ...children.flatMap(nodes)];
}
for (const [totalPoints, level, xpToNextLevel, expected] of [
  [0, 0, 1000, 0], [219, 0, 781, 21.9], [999, 0, 1, 99.9], [1000, 1, 1000, 0],
  [1999, 1, 1, 99.9], [2000, 2, 1000, 0], [2219, 2, 781, 21.9],
  [2999, 2, 1, 99.9], [3000, 3, 1000, 0],
]) {
  test(`${totalPoints} total XP: level ${level} bar shows ${expected}% without changing accumulated XP`, () => {
    const stats = Object.freeze({ totalPoints, level, xpToNextLevel });
    const tree = nodes(HomeLevelWeek({ stats, streak: null }));
    const bar = tree.find(node => node.props['aria-label'] === 'Progresso de experiência');
    assert.equal(bar.props['aria-valuenow'], expected);
    const fill = [bar.props.children].flat().find(child => child?.props?.className === 'hv-track-fill');
    assert.equal(fill.props.style.width, `${expected}%`);
    assert.ok(tree.some(node => node.type === 'strong' && node.props.children === totalPoints.toLocaleString('pt-BR')));
    assert.ok(bar.props['aria-valuetext'].includes(`Faltam ${xpToNextLevel.toLocaleString('pt-BR')} XP`));
    assert.ok(tree.some(node => node.type === 'p' && [node.props.children].flat().includes(' XP no total')));
    assert.ok(tree.some(node => node.type === 'b' && node.props.children === level));
  });
}
test('missing stats leaves the experience bar empty', () => {
  const tree = nodes(HomeLevelWeek({ stats: null, streak: null }));
  assert.equal(tree.find(node => node.props['aria-label'] === 'Progresso de experiência').props['aria-valuenow'], 0);
});
