CREATE TABLE IF NOT EXISTS achievement (
  id INT NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL,
  category ENUM('sentinel','specialist','investigator','consistency','elite') NOT NULL,
  rarity ENUM('common','uncommon','rare','epic','legendary') NOT NULL,
  requirement_type ENUM('total_xp','level','challenges_completed','lessons_completed','streak','arcade_plays','perfect_arcade_runs') NOT NULL,
  requirement_value INT NOT NULL,
  tier INT NOT NULL DEFAULT 1,
  icon VARCHAR(60) NOT NULL,
  reward_prestige INT NOT NULL DEFAULT 1,
  prerequisite_slug VARCHAR(80) NULL,
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  order_index INT NOT NULL DEFAULT 0,
  secret TINYINT NOT NULL DEFAULT 0,
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_achievement_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_achievement (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  achievement_id INT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  unlocked TINYINT NOT NULL DEFAULT 0,
  unlocked_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_usuario_achievement_usuario_achievement (usuario_id, achievement_id),
  KEY IDX_usuario_achievement_achievement (achievement_id),
  CONSTRAINT FK_usuario_achievement_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  CONSTRAINT FK_usuario_achievement_achievement FOREIGN KEY (achievement_id) REFERENCES achievement(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cosmetic_item (
  id INT NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(400) NOT NULL,
  type ENUM('frame','background','title','badge','effect') NOT NULL,
  rarity ENUM('common','uncommon','rare','epic','legendary') NOT NULL,
  price INT NOT NULL,
  visual_value VARCHAR(160) NOT NULL,
  required_achievement_slug VARCHAR(80) NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_cosmetic_item_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_cosmetic (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  cosmetic_item_id INT NOT NULL,
  equipped TINYINT NOT NULL DEFAULT 0,
  purchased_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_usuario_cosmetic_usuario_item (usuario_id, cosmetic_item_id),
  KEY IDX_usuario_cosmetic_item (cosmetic_item_id),
  CONSTRAINT FK_usuario_cosmetic_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  CONSTRAINT FK_usuario_cosmetic_item FOREIGN KEY (cosmetic_item_id) REFERENCES cosmetic_item(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prestige_wallet (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_prestige_wallet_usuario (usuario_id),
  CONSTRAINT FK_prestige_wallet_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prestige_transaction (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  amount INT NOT NULL,
  type ENUM('level','achievement','purchase','adjustment') NOT NULL,
  source_key VARCHAR(140) NOT NULL,
  description VARCHAR(240) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_prestige_transaction_usuario_source (usuario_id, source_key),
  CONSTRAINT FK_prestige_transaction_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_arcade_stats (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  game_slug VARCHAR(80) NOT NULL,
  total_plays INT NOT NULL DEFAULT 0,
  perfect_runs INT NOT NULL DEFAULT 0,
  best_score INT NOT NULL DEFAULT 0,
  last_played_at DATETIME NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_usuario_arcade_stats_usuario_game (usuario_id, game_slug),
  CONSTRAINT FK_usuario_arcade_stats_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO achievement (slug, name, description, category, rarity, requirement_type, requirement_value, tier, icon, reward_prestige, prerequisite_slug, position_x, position_y, order_index, secret, active) VALUES
('sentinela-primeira-missao', 'Primeira missão', 'Conclua seu primeiro desafio de segurança.', 'sentinel', 'common', 'challenges_completed', 1, 1, 'shield-check', 1, NULL, 0, 0, 10, 0, 1),
('sentinela-em-acao', 'Sentinela em ação', 'Conclua 3 desafios de segurança.', 'sentinel', 'uncommon', 'challenges_completed', 3, 2, 'shield', 2, 'sentinela-primeira-missao', 1, 0, 20, 0, 1),
('sentinela-veterano', 'Sentinela veterano', 'Conclua 10 desafios de segurança.', 'sentinel', 'rare', 'challenges_completed', 10, 3, 'badge-check', 3, 'sentinela-em-acao', 2, 0, 30, 0, 1),
('sentinela-implacavel', 'Sentinela implacável', 'Conclua 25 desafios de segurança.', 'sentinel', 'legendary', 'challenges_completed', 25, 4, 'shield-half', 8, 'sentinela-veterano', 3, 0, 40, 1, 1),
('especialista-primeira-aula', 'Primeiro aprendizado', 'Conclua sua primeira aula.', 'specialist', 'common', 'lessons_completed', 1, 1, 'book-open-check', 1, NULL, 0, 1, 50, 0, 1),
('especialista-dedicado', 'Aprendiz dedicado', 'Conclua 5 aulas.', 'specialist', 'uncommon', 'lessons_completed', 5, 2, 'library', 2, 'especialista-primeira-aula', 1, 1, 60, 0, 1),
('especialista-da-academia', 'Especialista da academia', 'Conclua 15 aulas.', 'specialist', 'rare', 'lessons_completed', 15, 3, 'graduation-cap', 3, 'especialista-dedicado', 2, 1, 70, 0, 1),
('mestre-do-conhecimento', 'Mestre do conhecimento', 'Conclua 30 aulas.', 'specialist', 'legendary', 'lessons_completed', 30, 4, 'brain', 8, 'especialista-da-academia', 3, 1, 80, 1, 1),
('investigador-primeira-partida', 'Primeira investigação', 'Finalize sua primeira partida nos Jogos.', 'investigator', 'common', 'arcade_plays', 1, 1, 'search', 1, NULL, 0, 2, 90, 0, 1),
('investigador-dez-partidas', 'Olhar treinado', 'Finalize 10 partidas nos Jogos.', 'investigator', 'uncommon', 'arcade_plays', 10, 2, 'scan-search', 2, 'investigador-primeira-partida', 1, 2, 100, 0, 1),
('investigador-perfeito', 'Análise perfeita', 'Alcance pontuação perfeita em uma partida.', 'investigator', 'rare', 'perfect_arcade_runs', 1, 3, 'crosshair', 3, 'investigador-dez-partidas', 2, 2, 110, 0, 1),
('investigador-lendario', 'Investigador lendário', 'Alcance 10 partidas perfeitas.', 'investigator', 'legendary', 'perfect_arcade_runs', 10, 4, 'fingerprint', 8, 'investigador-perfeito', 3, 2, 120, 1, 1),
('consistencia-primeiro-dia', 'Primeiro passo', 'Realize seu primeiro check-in.', 'consistency', 'common', 'streak', 1, 1, 'flame', 1, NULL, 0, 3, 130, 0, 1),
('consistencia-tres-dias', 'Ritmo constante', 'Mantenha uma sequência de 3 dias.', 'consistency', 'uncommon', 'streak', 3, 2, 'calendar-check', 2, 'consistencia-primeiro-dia', 1, 3, 140, 0, 1),
('consistencia-sete-dias', 'Semana protegida', 'Mantenha uma sequência de 7 dias.', 'consistency', 'rare', 'streak', 7, 3, 'calendar-days', 3, 'consistencia-tres-dias', 2, 3, 150, 0, 1),
('consistencia-trinta-dias', 'Disciplina inabalável', 'Mantenha uma sequência de 30 dias.', 'consistency', 'legendary', 'streak', 30, 4, 'sparkles', 8, 'consistencia-sete-dias', 3, 3, 160, 1, 1),
('elite-nivel-dois', 'Nova patente', 'Alcance o nível 2.', 'elite', 'common', 'level', 2, 1, 'chevrons-up', 1, NULL, 0, 4, 170, 0, 1),
('elite-nivel-cinco', 'Em ascensão', 'Alcance o nível 5.', 'elite', 'uncommon', 'level', 5, 2, 'trending-up', 2, 'elite-nivel-dois', 1, 4, 180, 0, 1),
('elite-nivel-dez', 'Referência SecurePlay', 'Alcance o nível 10.', 'elite', 'epic', 'level', 10, 3, 'crown', 5, 'elite-nivel-cinco', 2, 4, 190, 0, 1),
('elite-vinte-cinco-mil', 'Lenda da comunidade', 'Acumule 25.000 XP.', 'elite', 'legendary', 'total_xp', 25000, 4, 'trophy', 8, 'elite-nivel-dez', 3, 4, 200, 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), category = VALUES(category), rarity = VALUES(rarity), requirement_type = VALUES(requirement_type), requirement_value = VALUES(requirement_value), tier = VALUES(tier), icon = VALUES(icon), reward_prestige = VALUES(reward_prestige), prerequisite_slug = VALUES(prerequisite_slug), position_x = VALUES(position_x), position_y = VALUES(position_y), order_index = VALUES(order_index), secret = VALUES(secret), active = VALUES(active);

INSERT INTO cosmetic_item (slug, name, description, type, rarity, price, visual_value, required_achievement_slug, active) VALUES
('moldura-violeta', 'Moldura Violeta', 'Uma moldura limpa com a assinatura visual SecurePlay.', 'frame', 'common', 2, 'frame-violet', NULL, 1),
('moldura-sentinela', 'Moldura Sentinela', 'Acabamento inspirado nos protetores da comunidade.', 'frame', 'rare', 5, 'frame-sentinel', 'sentinela-veterano', 1),
('moldura-elite', 'Moldura Elite', 'Moldura dourada reservada para grandes marcos.', 'frame', 'legendary', 12, 'frame-elite', 'elite-nivel-dez', 1),
('fundo-academia', 'Academia Clara', 'Plano de fundo leve inspirado na academia SecurePlay.', 'background', 'common', 3, 'background-academy', NULL, 1),
('fundo-investigador', 'Central de Investigação', 'Uma composição discreta para especialistas em análise.', 'background', 'rare', 7, 'background-investigator', 'investigador-perfeito', 1),
('titulo-aprendiz', 'Aprendiz Dedicado', 'Título exibido junto ao seu perfil.', 'title', 'uncommon', 3, 'Aprendiz Dedicado', 'especialista-dedicado', 1),
('titulo-sentinela', 'Sentinela SecurePlay', 'Título para quem mantém a defesa sempre ativa.', 'title', 'rare', 6, 'Sentinela SecurePlay', 'sentinela-veterano', 1),
('emblema-chama', 'Chama da Consistência', 'Emblema para destacar sua disciplina.', 'badge', 'rare', 5, 'badge-flame', 'consistencia-sete-dias', 1),
('emblema-investigador', 'Olho Investigador', 'Emblema de precisão e análise.', 'badge', 'rare', 5, 'badge-investigator', 'investigador-perfeito', 1),
('efeito-ascensao', 'Ascensão', 'Efeito visual discreto para o avatar do perfil.', 'effect', 'epic', 10, 'effect-ascension', 'elite-nivel-dez', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), type = VALUES(type), rarity = VALUES(rarity), price = VALUES(price), visual_value = VALUES(visual_value), required_achievement_slug = VALUES(required_achievement_slug), active = VALUES(active);

UPDATE usuario_cosmetic owned
INNER JOIN cosmetic_item owned_item ON owned_item.id = owned.cosmetic_item_id
INNER JOIN (
  SELECT user_item.usuario_id, catalog_item.type, MAX(user_item.id) AS latest_id
  FROM usuario_cosmetic user_item
  INNER JOIN cosmetic_item catalog_item ON catalog_item.id = user_item.cosmetic_item_id
  GROUP BY user_item.usuario_id, catalog_item.type
) latest ON latest.latest_id = owned.id
LEFT JOIN (
  SELECT equipped_item.usuario_id, equipped_catalog.type
  FROM usuario_cosmetic equipped_item
  INNER JOIN cosmetic_item equipped_catalog ON equipped_catalog.id = equipped_item.cosmetic_item_id
  WHERE equipped_item.equipped = 1
  GROUP BY equipped_item.usuario_id, equipped_catalog.type
) active_item ON active_item.usuario_id = owned.usuario_id AND active_item.type = owned_item.type
SET owned.equipped = 1
WHERE active_item.usuario_id IS NULL;
