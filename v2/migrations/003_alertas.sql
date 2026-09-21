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
