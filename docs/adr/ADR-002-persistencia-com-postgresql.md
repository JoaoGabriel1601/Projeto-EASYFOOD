# ADR-002 - Persistência com PostgreSQL e Prisma

- Status: aceita; substitui ADR-001.
- Data: 19/09/2026 (consolidação dos registros recebidos).
- Responsável: Equipe EasyFood.

## Contexto
Restaurantes precisam continuar disponíveis após reiniciar a API. Usuários precisam de e-mail único e armazenamento persistente das credenciais protegidas.

## Alternativas consideradas
PostgreSQL, MySQL, SQLite, MongoDB, Firebase e arquivo JSON. SQLite simplifica a infraestrutura; arquivos exigem controle manual de concorrência; documentos são flexíveis, mas o domínio tem estrutura relacional.

## Decisão
Usar PostgreSQL com Prisma Client para consultas e Prisma Migrate para versionar o esquema. Manter Restaurant e adicionar User. A instalação local existente do PostgreSQL atende ao exercício.

## Justificativa
Transações, restrições e relacionamentos atendem ao crescimento esperado para pedidos e avaliações. Prisma permite declarar o modelo, gerar um cliente e registrar a evolução do banco. A decisão também segue a tecnologia definida na Missão 3.

## Consequências positivas
Persistência entre reinicializações, acesso compartilhado entre processos, integridade pelo banco e histórico de migrations.

## Consequências negativas / trade-offs
Dependência de um serviço de banco; configuração de credenciais; necessidade de backups, migrations e monitoramento. Uma indisponibilidade do banco impede consultas e gravações. O ORM também precisa de atualizações e geração compatível com o sistema operacional.

## Critérios de revisão
Reavaliar diante de gargalos medidos, mudança importante no modelo, exigência de operação offline ou requisitos que o banco atual não atenda. Não trocar tecnologia apenas por crescimento hipotético.
