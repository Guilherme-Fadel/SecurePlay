const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');
const progression = load('src/lib/levelProgress.ts', {});
const { AdventureHero } = load('src/components/sections/HomePage/Dashboard/AdventureHero.tsx', {
  'lucide-react': { BookOpen: 'svg', Check: 'svg', Play: 'svg', Star: 'svg' },
  '@/components/ui/buttons/AppButton': { AppButton: 'button' },
  '@/lib/levelProgress': progression,
  '@/lib/staticArtwork': { missionRoomAssets: {} },
  '@/assets/dashboard/streak-calendar-pixel-v1.png': {},
  '@/assets/dashboard/mission-page-tab-pixel-v1.png': {},
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
    const tree = nodes(AdventureHero({ stats, streak: null }));
    const bar = tree.find(node => node.props['aria-label'] === 'Progresso de experiência');
    assert.equal(bar.props['aria-valuenow'], expected);
    assert.equal(bar.props.children.props.style.width, `${expected}%`);
    assert.ok(tree.some(node => node.type === 'strong' && node.props.children === totalPoints.toLocaleString('pt-BR')));
    assert.ok(bar.props['aria-valuetext'].includes(`Faltam ${xpToNextLevel.toLocaleString('pt-BR')} XP`));
    assert.ok(tree.some(node => node.type === 'span' && node.props.children === 'XP totais'));
  });
}
test('missing stats leaves the experience bar empty', () => {
  const tree = nodes(AdventureHero({ stats: null, streak: null }));
  assert.equal(tree.find(node => node.props['aria-label'] === 'Progresso de experiência').props['aria-valuenow'], 0);
});
