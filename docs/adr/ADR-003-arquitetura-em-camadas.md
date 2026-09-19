# ADR-003 - Monólito modular em camadas

- Status: aceita.
- Data: 19/09/2026.
- Responsável: Equipe EasyFood.

## Contexto
O server.js inicial misturava inicialização, HTTP, validações e acesso ao banco. A autenticação adiciona um novo domínio.

## Alternativas
Manter arquivo único, organizar por camadas globais ou separar módulos por domínio dentro do mesmo processo; microsserviços adicionariam operação desnecessária neste estágio.

## Decisão e justificativa
Manter um monólito com módulos restaurants e auth. Routes escolhem o controller; controllers tratam HTTP e validam entrada; services executam operações sem req/res; database disponibiliza Prisma. app.js compõe middlewares e rotas; server.js inicia o processo e gerencia seu encerramento.

## Consequências
Responsabilidades localizadas e evolução independente dos módulos; mais arquivos e navegação. A refatoração da Missão 4 preserva as rotas. A proteção do POST é uma mudança funcional posterior exigida pela Atividade 5.

## Critérios de revisão
Reavaliar se surgirem regras complexas, necessidade de repositórios, testes isolados ou requisitos reais de implantação independente.
