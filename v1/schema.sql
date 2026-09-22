-- SET NAMES evita mojibake nos acentos: sem isso o cliente mysql usado pelo
-- docker-entrypoint-initdb.d grava "ê" como dois caracteres latin1 errados.
SET NAMES utf8mb4;

-- Schema: controle de acesso multi-cliente + projetos / lancamentos / importacoes
-- Cada cliente (usuário) pode ter vários projetos; cada projeto publica no
-- endereço /apps/<slug>/ (o "slug" é o nome do projeto, é isso que o HTML
-- chama de "o html vai ser o nome do projeto").

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,     -- nunca texto puro; gerado com bcrypt/argon2 no n8n/backend
  papel ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projetos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,             -- dono do projeto (FK usuarios) — isola os dados por cliente
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,   -- gerado a partir do nome; define o endereço publicado /apps/<slug>/
  tipo VARCHAR(60) NOT NULL,           -- texto livre, digitado pelo usuário (ex: 'Aluguel', 'Loja')
  descricao TEXT,                       -- texto livre, inclui o "o que quer que o sistema faça"
  cor VARCHAR(9) DEFAULT '#2B59C3',
  texto_boas_vindas VARCHAR(200),
  versao INT NOT NULL DEFAULT 1,
  publicado TINYINT(1) NOT NULL DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS importacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  arquivo_original VARCHAR(255),
  importado_por VARCHAR(120),
  importado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) DEFAULT 'ok',      -- ok | erro_parcial | erro
  FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

CREATE TABLE IF NOT EXISTS historico_versoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  versao INT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  snapshot_json JSON NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_historico_projeto_versao (projeto_id, versao),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regras_alerta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  coluna VARCHAR(120) NOT NULL,
  operador ENUM('maior','menor','igual') NOT NULL,
  valor VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  regra_id INT NULL,
  tipo ENUM('qualidade','regra') NOT NULL,
  severidade ENUM('info','aviso','erro') NOT NULL DEFAULT 'aviso',
  titulo VARCHAR(160) NOT NULL,
  descricao TEXT NOT NULL,
  status ENUM('novo','resolvido') NOT NULL DEFAULT 'novo',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvido_em DATETIME NULL,
  INDEX idx_alertas_projeto_status (projeto_id, status, criado_em),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (regra_id) REFERENCES regras_alerta(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resumos_semanais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  semana DATE NOT NULL,
  enviado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resumo_projeto_semana (projeto_id, semana),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  data DATE NOT NULL,
  descricao VARCHAR(255) NOT NULL,      -- texto livre
  categoria VARCHAR(120) NOT NULL,      -- texto livre (autocomplete no front, não enum no banco)
  tipo ENUM('entrada','saida') NOT NULL, -- este sim é fixo, pra somar certo
  valor DECIMAL(12,2) NOT NULL,
  status ENUM('pendente','pago') NOT NULL DEFAULT 'pago', -- usado pelo painel (aba Relatórios)
  importacao_id INT NULL,               -- NULL quando foi lançado manual, preenchido quando veio de import
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (importacao_id) REFERENCES importacoes(id)
);

-- view pronta pra relatório (soma por projeto)
CREATE OR REPLACE VIEW saldo_projetos AS
SELECT
  projeto_id,
  SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
  SUM(CASE WHEN tipo = 'saida'   THEN valor ELSE 0 END) AS saidas,
  SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) AS saldo
FROM lancamentos
GROUP BY projeto_id;

-- ---------------------------------------------------------------------------
-- Suporte a QUALQUER planilha (não só financeira): guarda a estrutura
-- detectada e os dados brutos de forma genérica (JSON por linha).
-- Usado no fluxo: importar -> detectar colunas -> confirmar com o usuário ->
-- prompt -> gerar relatório adaptado (protótipo desse passo já está em
-- aluguel-apto-v1.html, tela Importar Excel, ainda só client-side).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS colunas_detectadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  importacao_id INT NULL,
  nome_coluna VARCHAR(120) NOT NULL,
  tipo_inferido VARCHAR(20) NOT NULL,   -- 'texto' | 'número' | 'data'
  ordem INT DEFAULT 0,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (importacao_id) REFERENCES importacoes(id)
);

CREATE TABLE IF NOT EXISTS dados_importados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  importacao_id INT NOT NULL,
  linha_json JSON NOT NULL,             -- a linha inteira da planilha, qualquer estrutura
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (importacao_id) REFERENCES importacoes(id)
);

-- dados de exemplo — os mesmos do protótipo HTML (aluguel-apto-v1.html), pra bater um com o outro
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES
  ('Marcus', 'marcus@lowcodeduo.com', '5e8021b960f93f8d2c99beb732617f5e:0c5afafdb3f8177fd1e0dead75581a25fd875ed8c6674374d21c3cc2f8d8391d', 'admin'),
  ('Cliente Aluguel Apê Rua X', 'cliente1@exemplo.com', 'b6c6c6eb1c3ea39bbec7a5d5296b8586:8d1a88a01dc953716f40b8971c328ce42ac8178a27ac7c2d06e55e5339fc06e0', 'cliente'),
  ('Cliente Loja Centro Comercial', 'cliente2@exemplo.com', '48ea725a32d5425648970199978ae7ba:96e03568996d5708a42fab51d7273486c921bbbbd9da83973a134e290d2141c7', 'cliente'),
  ('Cliente Clínica Aurora', 'clinica@exemplo.com', '4fe0731c6a14228775a80749ea7b9d58:ffcb4e36b40893f8b7e96272a2ecdc1416696879c5043a3c437b0493cc9f13d6', 'cliente'),
  ('Cliente Oficina Norte', 'oficina@exemplo.com', '0d05a0196e42c021de777db304ee7c72:35ff6a7c24facb3cfa88dc4564c885118bbe73ebb99047ce82de5d233c0e7416', 'cliente');

INSERT INTO projetos (usuario_id, nome, slug, tipo, descricao, cor, texto_boas_vindas) VALUES
  (2, 'Aluguel Apê Rua X', 'aluguel-ape-rua-x', 'Aluguel', 'Controle de entrada e saída do aluguel do apartamento', '#2B59C3', 'Bem-vindo ao controle do Apê Rua X'),
  (3, 'Loja Centro Comercial', 'loja-centro-comercial', 'Loja', 'Controle de vendas e estoque da loja', '#187A4C', 'Bem-vindo ao painel da loja'),
  (4, 'Clínica Aurora', 'clinica-aurora', 'Clínica', 'Agenda e financeiro básico da clínica', '#7C3AED', 'Bem-vindo ao painel da Clínica Aurora'),
  (5, 'Oficina Norte', 'oficina-norte', 'Oficina', 'Controle de serviços, peças e recebimentos', '#D97706', 'Bem-vindo ao painel da Oficina Norte');

INSERT INTO lancamentos (projeto_id, data, descricao, categoria, tipo, valor) VALUES
  (1, '2026-09-05', 'Aluguel recebido', 'Aluguel', 'entrada', 1800.00),
  (1, '2026-09-10', 'Condomínio', 'Condomínio', 'saida', 450.00),
  (1, '2026-09-15', 'IPTU', 'Impostos', 'saida', 230.00),
  (1, '2026-09-20', 'Aluguel recebido (adiantamento)', 'Aluguel', 'entrada', 1400.00),
  (1, '2026-09-28', 'Manutenção elétrica', 'Manutenção', 'saida', 300.00),
  (2, '2026-09-16', 'Venda balcão', 'Vendas', 'entrada', 850.00),
  (3, '2026-09-16', 'Consulta particular', 'Atendimento', 'entrada', 420.00),
  (4, '2026-09-16', 'Troca de óleo', 'Serviços', 'entrada', 180.00);
