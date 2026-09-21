CREATE TABLE IF NOT EXISTS historico_versoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  versao INT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_historico_projeto_versao (projeto_id, versao),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);
