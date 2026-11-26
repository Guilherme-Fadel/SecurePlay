import { ValidationPipe } from '@nestjs/common';
import { CHARACTER_COLORS } from '../character-color';
import { CharacterColorDto } from './character-color.dto';

describe('CharacterColorDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: CharacterColorDto });

  it.each([...CHARACTER_COLORS])('aceita %s', async (color) => {
    await expect(run({ color })).resolves.toMatchObject({ color });
  });

  it.each([
    {},
    { color: 'verde' },
    { color: 'AZUL' },
    { color: '' },
    { color: null },
    { color: 1 },
  ])('recusa %j com 400', async (body) => {
    await expect(run(body)).rejects.toMatchObject({ status: 400 });
  });
});
