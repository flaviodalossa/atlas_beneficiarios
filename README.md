# Atlas dos beneficiários — bases do relatório atualizadas em 13/10/2026

49.950.971 vínculos médico-hospitalares de origens.parquet. Mensalidades atualizadas RPC/ANS: 30.914.721; sem mensalidade: 19.036.250. Unidade: vínculo, não pessoa única. Referência de mensalidade e SIB: maio/2026. Cadastro, destinos, comercialização e cobertura: conjunto nacional de 09/10/2026. Os quantis relativos por idade foram recalculados com todos os vínculos precificados, incluindo notas históricas e casos com histórico parcial.

Fontes: dados/publicacao/2026-10-09/bases/{origens,destinos_precos,comercializacao,cobertura}.parquet. Os 180 intervalos vigentes foram conferidos com bases_originais/faixas_preco_vigentes.xlsx. Os limites superiores são inclusivos.

As faixas do painel classificam a mensalidade na idade e contratação da origem. A compatibilidade do relatório usa a maior categoria entre essa mensalidade e a NTRP de 44–48 anos do produto de origem, somente quando a coluna de situação indica Ativo e há nota válida. As opções são destinos ofertados no município em categorias iguais ou inferiores ao teto, segundo art. 3º §§1º, 2º e 3º da IN nº 56. A oferta municipal do catálogo apresentada no quadro 06 não é a contagem de opções compatíveis por vínculo.

Publicação somente de agregados municipais e metadados; não contém identificadores de vínculos. Os oito quadros e o mapa foram preservados. A consulta odontológica da versão antiga foi retirada porque os arquivos atuais do relatório abrangem somente vínculos médico-hospitalares.

Reprodução no projeto: executar mapa_beneficiarios/scripts/atualizar_bases_relatorio.py, atualizar_interface_relatorio.py, validar_bases_relatorio.py e validar_painel_atualizado.cjs. Auditorias em mapa_beneficiarios/atualizacao_20261013.
