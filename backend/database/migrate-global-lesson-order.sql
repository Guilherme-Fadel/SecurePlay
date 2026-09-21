-- Normaliza a ordem das aulas para uma sequencia unica dentro de cada modulo.
-- A sequencia final e: todas as aulas do primeiro capitulo, depois todas as
-- aulas do segundo capitulo, e assim por diante.
-- Requer MySQL 8 e pode ser executado mais de uma vez.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS aula_global_sequence;

CREATE TEMPORARY TABLE aula_global_sequence AS
SELECT
  id,
  ROW_NUMBER() OVER (
    PARTITION BY modulo_id
    ORDER BY section_first_id, `order`, id
  ) AS new_order
FROM (
  SELECT
    id,
    modulo_id,
    section_name,
    `order`,
    MIN(id) OVER (
      PARTITION BY modulo_id, COALESCE(NULLIF(TRIM(section_name), ''), '')
    ) AS section_first_id
  FROM aula
) lesson_sections;

-- Libera temporariamente as posicoes atuais para que a migracao tambem possa
-- ser repetida depois que o indice unico ja existir.
UPDATE aula SET `order` = -id;

UPDATE aula AS target
INNER JOIN aula_global_sequence AS sequence ON sequence.id = target.id
SET target.`order` = sequence.new_order;

COMMIT;

SET @lesson_order_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'aula'
    AND index_name = 'uq_aula_modulo_order'
);
SET @lesson_order_index_sql = IF(
  @lesson_order_index_exists = 0,
  'ALTER TABLE aula ADD UNIQUE INDEX uq_aula_modulo_order (modulo_id, `order`)',
  'SELECT 1'
);
PREPARE lesson_order_statement FROM @lesson_order_index_sql;
EXECUTE lesson_order_statement;
DEALLOCATE PREPARE lesson_order_statement;

SELECT id, modulo_id, section_name, title, `order`
FROM aula
ORDER BY modulo_id, `order`, id;
