-- Referências lógicas para capas empacotadas no frontend.
-- Não use caminhos locais como C:\Users\...: eles não existem em produção.
-- Este script é compatível com MySQL/DBeaver e pode ser executado mais de uma vez.

START TRANSACTION;

UPDATE modulo
SET thumbnail = CASE title
  WHEN 'Guardioes das Senhas' THEN 'module-passwords'
  WHEN 'Detetives da Internet' THEN 'module-detectives'
  WHEN 'Herois da Privacidade' THEN 'module-privacy'
  WHEN 'Defensores do Dispositivo' THEN 'module-navigation'
  WHEN 'Fundamentos de Seguranca' THEN 'module-foundations'
  WHEN 'Senhas e Autenticacao' THEN 'module-authentication'
  WHEN 'Phishing e Engenharia Social' THEN 'module-phishing'
  ELSE thumbnail
END
WHERE title IN (
  'Guardioes das Senhas',
  'Detetives da Internet',
  'Herois da Privacidade',
  'Defensores do Dispositivo',
  'Fundamentos de Seguranca',
  'Senhas e Autenticacao',
  'Phishing e Engenharia Social'
);

COMMIT;

SELECT id, title, thumbnail
FROM modulo
WHERE title IN (
  'Guardioes das Senhas',
  'Detetives da Internet',
  'Herois da Privacidade',
  'Defensores do Dispositivo',
  'Fundamentos de Seguranca',
  'Senhas e Autenticacao',
  'Phishing e Engenharia Social'
)
ORDER BY `order`, id;
