# Documentos-fonte de treinamento

Os arquivos desta pasta são transcrições textuais, sem alteração de conteúdo programático, dos PDFs históricos disponíveis em `pesquisas/`:

- `treino-homem.md` ← `Programa anual de recomposição corporal e hipertrofia baseado em evidências.pdf` (28 páginas)
- `treino-mulher.md` ← `Programa anual de hipertrofia feminina com prioridade em glúteos e membros inferiores.pdf` (29 páginas)

`FEMALE_PROGRAM_V2.md` é uma especificação nova e rastreável da versão feminina `2026.2`. Ela combina a pesquisa histórica, os exercícios familiares do treino antigo e a nova prioridade em glúteo médio; não substitui nem altera a transcrição do PDF.

As fichas atualmente ativas vêm dos PDFs em `new_correct_train/`:

- `Programa de Treino Glúteo Médio.pdf` → Female V3 (`2026.3`);
- `Programa Anual de Hipertrofia e Recomposição.pdf` → Male V2 (`2026.2`).

O mapeamento, inclusive as divergências internas resolvidas sem inventar prescrições, está em `docs/RESEARCH_MAPPING.md`. `FEMALE_PROGRAM_V2.md` e `FEMALE_V1_V2_MIGRATION.md` permanecem como documentação histórica da transição anterior.

## Proveniência

O pedido original apontava diretamente para estes dois caminhos Markdown, mas o repositório inicialmente continha apenas os PDFs. Os Markdown foram produzidos por extração mecânica com `pdftotext -layout`; os PDFs permanecem a fonte histórica imutável e não foram modificados.

Quebras de linha, paginação e tabelas refletem a extração do layout do PDF. Qualquer correção editorial futura deve manter rastreabilidade até a página do PDF original e jamais alterar prescrições silenciosamente.
