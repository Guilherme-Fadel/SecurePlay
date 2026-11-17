import {
  createServer,
  request as httpRequest,
  Server as HttpServer,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'socket.io';
import {
  ConnectionLimiter,
  maxConnectionsPerIpFromEnv,
  SocketIoAdapter,
  WS_DEFAULT_MAX_CONNECTIONS_PER_IP,
  WS_MAX_HTTP_BUFFER_SIZE,
} from './socket-io.adapter';

const ORIGIN = 'http://localhost:5173';

function call(
  port: number,
  path: string,
  method = 'GET',
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: text }),
        );
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

const handshake = (port: number) =>
  call(port, '/socket.io/?EIO=4&transport=polling');

function sidOf(body: string): string {
  return (JSON.parse(body.slice(1)) as { sid: string }).sid;
}

describe('SocketIoAdapter — limites do handshake (B7)', () => {
  const previousCors = process.env.CORS_ORIGIN;
  let http: HttpServer;
  let io: Server;
  let port: number;

  beforeEach(async () => {
    process.env.CORS_ORIGIN = ORIGIN;
    http = createServer();
    const adapter = new SocketIoAdapter(http, { maxConnectionsPerIp: 3 });
    io = adapter.createIOServer(0);
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    port = (http.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await io.close();
    if (previousCors === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previousCors;
  });

  it('anuncia mensagens de no máximo 100 KB', async () => {
    const first = await handshake(port);
    expect(first.status).toBe(200);
    expect(JSON.parse(first.body.slice(1))).toMatchObject({
      maxPayload: WS_MAX_HTTP_BUFFER_SIZE,
    });
  });

  it('recusa handshake acima do limite por IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await handshake(port)).status);
    expect(statuses).toEqual([200, 200, 200, 403, 403]);
  });

  it('libera a vaga após desconexão', async () => {
    const opened: Array<{ status: number; body: string }> = [];
    for (let i = 0; i < 3; i++) opened.push(await handshake(port));
    expect((await handshake(port)).status).toBe(403);

    const sid = sidOf(opened[0].body);
    await call(
      port,
      `/socket.io/?EIO=4&transport=polling&sid=${sid}`,
      'POST',
      '1',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect((await handshake(port)).status).toBe(200);
  });

  it('requisições de uma sessão já aberta não contam como conexão nova', async () => {
    const opened: Array<{ status: number; body: string }> = [];
    for (let i = 0; i < 3; i++) opened.push(await handshake(port));
    const sid = sidOf(opened[1].body);
    const poll = await call(
      port,
      `/socket.io/?EIO=4&transport=polling&sid=${sid}`,
      'POST',
      '3',
    );
    expect(poll.status).toBe(200);
  });
});

describe('ConnectionLimiter e configuração', () => {
  it('conta por IP, sem afetar outros IPs', () => {
    const limiter = new ConnectionLimiter(2);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(false);
    expect(limiter.tryAcquire('b')).toBe(true);
    limiter.release('a');
    expect(limiter.count('a')).toBe(1);
    limiter.release('a');
    limiter.release('a');
    expect(limiter.count('a')).toBe(0);
  });

  it('WS_MAX_CONNECTIONS_PER_IP inválido usa o padrão', () => {
    expect(maxConnectionsPerIpFromEnv('40')).toBe(40);
    expect(maxConnectionsPerIpFromEnv('0')).toBe(
      WS_DEFAULT_MAX_CONNECTIONS_PER_IP,
    );
    expect(maxConnectionsPerIpFromEnv('abc')).toBe(
      WS_DEFAULT_MAX_CONNECTIONS_PER_IP,
    );
    expect(maxConnectionsPerIpFromEnv(undefined)).toBe(
      WS_DEFAULT_MAX_CONNECTIONS_PER_IP,
    );
  });
});
