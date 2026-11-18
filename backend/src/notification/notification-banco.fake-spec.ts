/**
 * Banco em memória só para testes: interpreta as poucas formas de SQL que
 * `notification-sql.ts` e os listeners usam sobre a tabela `notification`, para
 * provar o efeito (quem grava, reabre, fica lido ou é publicado) em vez do
 * texto do SQL. Não é um parser de SQL: formas desconhecidas lançam erro.
 */
export interface LinhaFake {
  id: number;
  usuario_id: number;
  title: string;
  message: string;
  type: string;
  link: string | null;
  group_key: string | null;
  readed: boolean;
  created_at: Date;
}

export class BancoNotificacoesFake {
  linhas: LinhaFake[] = [];
  consultas: string[] = [];
  private proximoId = 1;
  private relogio = 1;

  /** Avança o "NOW()" do banco em um segundo. */
  avancar(): void {
    this.relogio += 1;
  }

  private agora(): Date {
    return new Date(Date.UTC(2026, 10, 18, 12, 0, this.relogio));
  }

  achar(usuarioId: number, groupKey: string): LinhaFake | undefined {
    return this.linhas.find(
      (linha) => linha.usuario_id === usuarioId && linha.group_key === groupKey,
    );
  }

  marcarLida(usuarioId: number, groupKey: string): void {
    const linha = this.achar(usuarioId, groupKey);
    if (linha) linha.readed = true;
  }

  private inserir(
    parametros: unknown[],
    aoDuplicar: 'ignorar' | 'atualizar',
  ): void {
    for (let i = 0; i < parametros.length; i += 6) {
      const [usuario_id, title, message, type, link, group_key] =
        parametros.slice(i, i + 6) as [
          number,
          string,
          string,
          string,
          string | null,
          string,
        ];
      const atual = this.achar(usuario_id, group_key);
      if (atual) {
        if (aoDuplicar === 'atualizar')
          Object.assign(atual, {
            title,
            message,
            link,
            type,
            readed: false,
            created_at: this.agora(),
          });
        continue;
      }
      this.linhas.push({
        id: this.proximoId++,
        usuario_id,
        title,
        message,
        type,
        link,
        group_key,
        readed: false,
        created_at: this.agora(),
      });
    }
  }

  private porTuplas(parametros: unknown[]): LinhaFake[] {
    const achadas: LinhaFake[] = [];
    for (let i = 0; i < parametros.length; i += 2) {
      const linha = this.achar(
        Number(parametros[i]),
        String(parametros[i + 1]),
      );
      if (linha) achadas.push(linha);
    }
    return achadas;
  }

  query = (sql: string, parametros: unknown[] = []): Promise<unknown> => {
    this.consultas.push(sql);
    const texto = sql.replace(/\s+/g, ' ').trim();
    if (texto.startsWith('SELECT id, usuario_id, group_key, message FROM'))
      return Promise.resolve(this.porTuplas(parametros));
    if (texto.startsWith('SELECT id FROM notification WHERE (usuario_id'))
      return Promise.resolve(this.porTuplas(parametros));
    if (texto.startsWith('SELECT id FROM notification WHERE group_key')) {
      const achadas = this.linhas.filter(
        (linha) => linha.group_key === parametros[0],
      );
      return Promise.resolve(achadas.slice(0, 1));
    }
    if (texto.startsWith('INSERT IGNORE INTO notification')) {
      this.inserir(parametros, 'ignorar');
      return Promise.resolve({});
    }
    if (
      texto.startsWith('INSERT INTO notification') &&
      texto.includes('ON DUPLICATE KEY UPDATE')
    ) {
      this.inserir(parametros, 'atualizar');
      return Promise.resolve({});
    }
    if (
      texto.startsWith(
        'UPDATE notification SET title = ?, message = ?, link = ? WHERE id = ?',
      )
    ) {
      const [title, message, link, id] = parametros as [
        string,
        string,
        string | null,
        number,
      ];
      const linha = this.linhas.find((item) => item.id === id);
      if (linha) Object.assign(linha, { title, message, link });
      return Promise.resolve({});
    }
    if (
      texto.startsWith(
        'UPDATE notification SET readed = 1, message = ? WHERE group_key = ? AND usuario_id IN',
      )
    ) {
      const [message, groupKey, ...usuarios] = parametros as [
        string,
        string,
        ...number[],
      ];
      for (const linha of this.linhas) {
        if (linha.group_key === groupKey && usuarios.includes(linha.usuario_id))
          Object.assign(linha, { readed: true, message });
      }
      return Promise.resolve({});
    }
    throw new Error(`SQL não suportado pelo banco fake: ${texto.slice(0, 80)}`);
  };

  save = (linhas: Array<Partial<LinhaFake>>): Promise<LinhaFake[]> =>
    Promise.resolve(
      linhas.map((linha) => {
        const salva = {
          id: this.proximoId++,
          group_key: null,
          link: null,
          created_at: this.agora(),
          ...linha,
        } as LinhaFake;
        this.linhas.push(salva);
        return salva;
      }),
    );

  find = (opcoes: {
    where: { id: { value: number[] } };
  }): Promise<LinhaFake[]> =>
    Promise.resolve(
      this.linhas.filter((linha) => opcoes.where.id.value.includes(linha.id)),
    );
}
