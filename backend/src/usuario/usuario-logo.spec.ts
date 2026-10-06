import { UsuarioService } from './usuario.service';

describe('Logo da empresa na sessão', () => {
  it('retorna URL de leitura em vez da chave persistida', async () => {
    const key = 'empresas/4/logo-1234567890abcdef12345678.webp';
    const repository = {
      findOne: jest.fn().mockResolvedValue({
        id: 9,
        name: 'Admin',
        role: 'admin',
        empresa_id: 4,
        empresa: { id: 4, nome: 'Empresa teste', logo_url: key },
      }),
    };
    const s3 = {
      resolveCompanyLogoUrl: jest.fn().mockResolvedValue('https://signed.example/logo'),
    };
    const service = new UsuarioService(repository as never, s3 as never);
    await expect(service.getUsuarioDados(9)).resolves.toMatchObject({
      empresa_logo: 'https://signed.example/logo',
    });
    expect(s3.resolveCompanyLogoUrl).toHaveBeenCalledWith(4, key);
  });
});
