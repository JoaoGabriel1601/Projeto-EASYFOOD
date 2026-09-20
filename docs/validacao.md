# Validação da entrega - 19/09/2026

## Concluído

- Leitura das cinco orientações e implementação da evolução até a Atividade 5.
- Node.js v24.19.0 e npm 11.17.0 disponíveis; serviço postgresql-x64-18 em execução.
- Dependências jsonwebtoken, bcryptjs e dotenv instaladas.
- Cliente Prisma 6.19.3 regenerado para Windows (a base possuía cliente gerado para macOS).
- Schema validado com `prisma validate` e formatado com `prisma format`.
- Sintaxe validada nos 15 arquivos JavaScript da aplicação, seed e testes.
- `npm.cmd run test:unit`: 4 testes aprovados, nenhuma falha. Cobrem tokens válidos, ausentes, expirados, com assinatura/algoritmo incorretos, validações de entrada, JSON inválido e rota desconhecida.
- Chave JWT aleatória criada no .env local, sem exibi-la nos registros.
- Migration de User preparada e migration original de Restaurant preservada.
- Respostas das missões, desenho e ADRs documentados.

## Banco e integração concluídos

Após a atualização da credencial pelo usuário, a conexão com PostgreSQL foi estabelecida. O banco easyfood ainda não existia nesta instalação e foi criado. As duas migrations foram aplicadas com sucesso, criando Restaurant e User. O seed inseriu Pizzaria Napoli, Burger House e Sushi Express.

- `npm.cmd test`: **17 testes aprovados, zero falhas** (13 de integração real e 4 sem banco).
- Cadastro 201; senha armazenada em hash bcrypt e ausente da resposta.
- E-mail duplicado 409; entrada inválida 400; credenciais incorretas 401.
- Login com JWT de um dia; /auth/me disponível somente com token válido.
- GET /restaurants público; POST /restaurants bloqueado sem token e retornando 201 com token válido.
- Tokens expirados, com assinatura incorreta, algoritmo indevido ou formato inválido rejeitados.
- Reinicialização em outro processo preservou restaurante, usuário e validade do token.
- Registros temporários dos testes removidos pela própria suíte, preservando o seed.
- `prisma migrate status`: banco atualizado, duas migrations aplicadas.
- API iniciada em http://localhost:3000; GET /restaurants confirmado com status 200 e os três restaurantes iniciais.
- Prisma Studio iniciado em http://localhost:5555; página HTTP confirmada com status 200. A inspeção manual das tabelas na interface fica disponível ao usuário.

Para iniciar novamente depois de encerrar os processos:

```powershell
npm.cmd start
# Em outro terminal, se desejar consultar o banco visualmente:
npm.cmd run db:studio
```

## Integração da interface HTML

- Material recebido integrado em `public/index.html`, `public/styles.css` e `public/app.js`, servido pelo Express na raiz `/`.
- Preservado o visual móvel; cadastro de restaurantes adaptado ao JWT exigido na Atividade 5.
- `npm.cmd test`: os 17 testes existentes passaram após a integração; JavaScript do frontend validado com `node --check`.
- HTML, CSS e JavaScript retornaram status 200 com tipos de conteúdo apropriados.
- Verificados no navegador: listagem pública, busca por nome, filtro por categoria, ordenação por avaliação, paginação, adicionar/remover favoritos, cadastro de usuário, login, cadastro autenticado de restaurante e saída da conta.
- Confirmada a exibição literal de marcação HTML no nome de um restaurante, sem interpretá-la como elementos da página.
- Conta e restaurante temporários usados na verificação foram removidos ao terminar; os dados iniciais foram preservados.
- Sessão mantida apenas em memória e favoritos locais ao navegador, conforme documentado no README.
- Revisão visual do layout realizada no navegador. Carrinho e valores fictícios de entrega do protótipo foram removidos por não terem correspondência na API.

## Dependências

A atualização compatível de qs foi aplicada com npm audit fix. Permanecem três alertas de gravidade alta na cadeia de ferramentas Prisma -> @prisma/config -> deepmerge-ts (uma vulnerabilidade transitiva, GHSA-ggr8-5vv4-36mx). O npm propõe uma alteração incompatível para prisma 6.12.0; ela não foi aplicada automaticamente. Esse alerta permanece como limitação da versão da base. Não foi declarado que a auditoria está sem vulnerabilidades.
