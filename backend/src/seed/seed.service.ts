import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { Role } from '../auth/roles.enum';
import { calcLevel } from '../common/utils/xp.utils';

interface SeedUser {
  name: string;
  email: string;
  points: number;
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarioRepository: Repository<Usuario>,

    @Inject('USUARIO_STATS_REPOSITORY')
    private readonly statsRepository: Repository<UsuarioStats>,
  ) {}

  async onModuleInit() {
    await this.seedRankingUsers();
  }

  private async seedRankingUsers() {
    const seedUsers: SeedUser[] = [
      { name: 'Carlos Silva', email: 'seed-1@secureplay.dev', points: 500 },
      {
        name: 'Fernanda Oliveira',
        email: 'seed-2@secureplay.dev',
        points: 1200,
      },
      { name: 'Rafael Santos', email: 'seed-3@secureplay.dev', points: 3500 },
      { name: 'Juliana Costa', email: 'seed-4@secureplay.dev', points: 7800 },
      { name: 'Bruno Almeida', email: 'seed-5@secureplay.dev', points: 150 },
      { name: 'Mariana Souza', email: 'seed-6@secureplay.dev', points: 4200 },
      { name: 'Lucas Pereira', email: 'seed-7@secureplay.dev', points: 900 },
      { name: 'Amanda Ferreira', email: 'seed-8@secureplay.dev', points: 2100 },
      { name: 'Thiago Ribeiro', email: 'seed-9@secureplay.dev', points: 6000 },
      { name: 'Camila Rocha', email: 'seed-10@secureplay.dev', points: 300 },
    ];

    const existing = await this.usuarioRepository.findOne({
      where: { email: 'seed-1@secureplay.dev' },
    });

    if (existing) {
      return;
    }

    this.logger.log('Inserindo usuarios de seed para ranking...');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const passwordHash = bcrypt.hashSync('seed123', 10) as string;

    for (const seed of seedUsers) {
      const usuario = this.usuarioRepository.create({
        name: seed.name,
        email: seed.email,
        password: passwordHash,
        role: Role.USER,
        level: calcLevel(seed.points),
      } as Partial<Usuario>);

      const saved = await this.usuarioRepository.save(usuario);

      const stats = this.statsRepository.create({
        usuario_id: saved.id,
        total_points: seed.points,
      });

      await this.statsRepository.save(stats);
    }

    this.logger.log('Seed de ranking concluido (10 usuarios criados).');
  }
}
