import { serializeRequestForLog, urlWithoutQuery } from './request-log';

describe('log de requisições sem query string', () => {
  it('remove a query string e o fragmento da URL', () => {
    expect(urlWithoutQuery('/usuarios?search=maria@escola.test&page=2')).toBe(
      '/usuarios',
    );
    expect(urlWithoutQuery('/ranking#topo')).toBe('/ranking');
    expect(urlWithoutQuery('/saude')).toBe('/saude');
    expect(urlWithoutQuery(undefined)).toBeUndefined();
  });

  it('registra método, URL sem query, host, IP e porta, sem cabeçalhos', () => {
    const logged = serializeRequestForLog({
      method: 'GET',
      url: '/admin/alunos?search=Maria%20Souza',
      host: 'api.secureplaybr.com',
      ip: '203.0.113.7',
      headers: { authorization: 'Bearer segredo', 'accept-version': '1.0.0' },
      socket: { remotePort: 4433 },
    });
    expect(logged).toEqual({
      method: 'GET',
      url: '/admin/alunos',
      version: '1.0.0',
      host: 'api.secureplaybr.com',
      remoteAddress: '203.0.113.7',
      remotePort: 4433,
    });
    expect(JSON.stringify(logged)).not.toMatch(/Maria|segredo/);
  });
});
