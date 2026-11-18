import { Injectable } from '@nestjs/common';
import {
  EventEmitter2,
  EventEmitterModule,
  OnEvent,
} from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';
import type { TemporadaFechadaPayload } from '../notification/notification-events';
import { DashboardService } from './dashboard.service';

const recebidos: TemporadaFechadaPayload[] = [];

@Injectable()
class OuvinteTemporada {
  @OnEvent(NOTIFICATION_EVENTS.temporadaFechada)
  aoFechar(payload: TemporadaFechadaPayload): void {
    recebidos.push(payload);
  }
}

function montarDataSource() {
  const manager = {
    query: jest.fn((sql: string) => {
      if (sql.includes('SELECT season_id FROM ranking_season_close'))
        return Promise.resolve([]);
      return Promise.resolve([]);
    }),
  };
  return {
    query: jest.fn((sql: string) => {
      if (sql.includes('DATE_FORMAT'))
        return Promise.resolve([
          { start_local_at: '2026-10-01 00:00:00.000000' },
        ]);
      if (sql.includes('FROM ranking_season_snapshot'))
        return Promise.resolve([{ usuario_id: 7, points: 90, empresa_id: 1 }]);
      return Promise.resolve([{ id: 1 }]);
    }),
    transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
      cb(manager),
    ),
  };
}

describe('temporada fechada no boot', () => {
  afterEach(() => {
    jest.useRealTimers();
    recebidos.length = 0;
  });

  it('o aviso emitido no fechamento do boot chega ao ouvinte registrado', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    jest.setSystemTime(new Date('2026-11-03T12:00:00-03:00'));
    const dataSource = montarDataSource();
    const modulo = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        OuvinteTemporada,
        {
          provide: DashboardService,
          inject: [EventEmitter2],
          useFactory: (emitter: EventEmitter2) =>
            new DashboardService(
              {} as never,
              dataSource as never,
              {} as never,
              {} as never,
              {} as never,
              emitter,
              {} as never,
              {} as never,
              {} as never,
            ),
        },
      ],
    }).compile();
    try {
      await modulo.init();
      expect(recebidos).toHaveLength(1);
      expect(recebidos[0].seasonId).toBe('2026-10');
      expect(recebidos[0].posicoes).toEqual([
        { usuarioId: 7, posicao: 1, pontos: 90 },
      ]);
    } finally {
      await modulo.close();
    }
  });
});
