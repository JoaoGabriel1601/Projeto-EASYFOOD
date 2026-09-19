# ADR-001 - Armazenar restaurantes em memória

- Status: substituída pela [ADR-002](ADR-002-persistencia-com-postgresql.md).
- Data da decisão inicial: 20/08/2026. Atualização: 19/09/2026.
- Responsável: Equipe EasyFood.

## Contexto
A primeira versão precisava consultar e cadastrar restaurantes rapidamente para validar o fluxo do produto.

## Alternativas consideradas
Array em memória, PostgreSQL, MongoDB, SQLite, Firebase e arquivo JSON.

## Decisão e justificativa
Usar um array na versão inicial: implementação simples, sem infraestrutura adicional, suficiente para demonstrar GET e POST.

## Consequências positivas
Rapidez para desenvolver e testar; nenhum servidor de banco para configurar.

## Consequências negativas
Os registros novos desaparecem quando o processo termina; instâncias não compartilham dados; consultas, relacionamentos e integridade ficam sob responsabilidade do código.

## Critérios de revisão
Necessidade de persistir entre reinicializações, aumentar o volume, compartilhar dados ou criar relacionamentos.

## Evolução
A necessidade de persistência acionou a revisão. O código atual usa PostgreSQL; este ADR preserva a decisão histórica, sem reintroduzir o array. Os registros originais recebidos com a base permanecem em `adrs/`.
