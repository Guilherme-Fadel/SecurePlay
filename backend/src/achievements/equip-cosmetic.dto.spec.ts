import { ValidationPipe } from '@nestjs/common';
import { EquipCosmeticDto } from './dto/equip-cosmetic.dto';

describe('EquipCosmeticDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: EquipCosmeticDto });

  it.each([{}, { color: '#2662E7' }, { color: '#aabbcc' }, { color: null }])(
    'aceita %j',
    async (body) => {
      await expect(run(body)).resolves.toBeDefined();
    },
  );

  it.each(['2662E7', '#2662E', '#2662E7F', '#GGGGGG', 'red', ''])(
    'recusa a cor "%s" com 400',
    async (color) => {
      await expect(run({ color })).rejects.toMatchObject({ status: 400 });
    },
  );
});
