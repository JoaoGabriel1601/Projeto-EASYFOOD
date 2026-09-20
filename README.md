# EasyFood

**Aluno:** João Gabriel Felix Fernandes  
**RA:** 95536

Projeto das Missões 1 a 4 e da Atividade 5, em Node.js/Express, PostgreSQL, Prisma e JWT, com interface web integrada a partir do HTML recebido. A API também pode ser usada pelo Postman, pelos exemplos abaixo ou pela suíte de testes.

## Executar no Windows

Abra o terminal na raiz do repositório (a pasta que contém `package.json`). Pré-requisitos: Node.js 22 ou superior e PostgreSQL em execução.

```powershell
npm.cmd install
# Somente em uma instalação nova, sem .env:
Copy-Item .env.example .env
```

Edite `.env`: configure `DATABASE_URL` com a senha real do PostgreSQL e o banco `easyfood`. A chave `JWT_SECRET` precisa ter pelo menos 32 bytes aleatórios. Em uma instalação nova, gere uma com `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` e copie o resultado para `.env`. Se já possui um `.env` configurado, preserve-o. Nunca publique esse arquivo.

Se o banco ainda não existir, crie-o pelo SQL Shell/pgAdmin com `CREATE DATABASE easyfood;`. Em seguida:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd start
```

O servidor usa a porta 3000, configurável por `PORT`. Abra http://localhost:3000 para usar a interface ou http://localhost:3000/restaurants para consultar o JSON. Encerre com Ctrl+C. `npm.cmd run dev` reinicia a aplicação quando o código muda.

## Interface web

O HTML recebido foi integrado em `public/index.html`, com estilos em `public/styles.css` e comportamento em `public/app.js`. O Express entrega a interface e a API na mesma origem; não é necessário outro servidor nem abrir o HTML diretamente pelo sistema de arquivos.

- Consulte os restaurantes sem login, busque por nome/categoria, filtre por categorias existentes e ordene por nome, avaliação ou cadastro mais recente.
- A lista mostra três resultados por vez; use **Carregar mais** para ver os seguintes.
- Marque o coração para salvar favoritos neste navegador. Favoritos são locais e não ficam vinculados a uma conta.
- Em **Perfil**, use **Criar uma conta** e depois **Entrar**. Em **Cadastrar**, envie o restaurante com a sessão autenticada; o frontend inclui o JWT exigido pela API.
- Use **Sair da conta** para descartar a sessão local. O token é mantido apenas em memória: recarregar a página exige novo login. O backend mantém a política de expiração descrita no ADR-004.

O layout móvel do material original foi preservado e adaptado a telas menores. Preços/prazos de entrega fictícios e o contador de carrinho foram removidos, pois não existem esses dados ou funcionalidades na API. Nomes e categorias são renderizados como texto para evitar executar HTML enviado por usuários. Mensagens de erro da API aparecem nos formulários.

Os scripts Prisma chamam o CLI diretamente pelo Node para funcionar no caminho local, que contém espaços e `&`. A base recebida tinha um cliente Prisma para macOS; `db:generate` gera os binários da máquina atual. Migrations são incrementais; não é necessário executar reset nem apagar tabelas.

## Rotas

| Método | Rota | Autenticação | Resultado |
| --- | --- | --- | --- |
| GET | /restaurants | Pública | 200, lista de restaurantes |
| POST | /auth/register | Pública | 201, usuário sem senha |
| POST | /auth/login | Pública | 200, token e usuário sem senha |
| GET | /auth/me | Bearer JWT | 200, identidade do token |
| POST | /restaurants | Bearer JWT | 201, restaurante criado |

Erros: 400 para entrada inválida, 401 para credenciais/token inválidos, 409 para e-mail já cadastrado, 500 para falha interna. A avaliação é um número entre 0 e 5; omitida ou nula assume zero. O Prisma serializa o Decimal do banco como string JSON. E-mails são normalizados para minúsculas. Senhas não são truncadas: entradas acima de 72 bytes são rejeitadas.

## Exemplo completo no PowerShell

Com o servidor aberto em outro terminal:

```powershell
$base = 'http://localhost:3000'
$cadastro = @{ name = 'Aluno'; email = 'aluno@easyfood.com'; password = '123456' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' -Body $cadastro

$credenciais = @{ email = 'aluno@easyfood.com'; password = '123456' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $credenciais
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri "$base/auth/me" -Headers $headers

$restaurante = @{ name = 'Taco Loco'; category = 'Mexicana'; rating = 4.3 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/restaurants" -ContentType 'application/json' -Headers $headers -Body $restaurante
Invoke-RestMethod -Uri "$base/restaurants"
```

O cadastro do mesmo e-mail uma segunda vez retorna 409; nesse caso, siga para o login. O token vale por um dia. O exemplo de senha segue o enunciado acadêmico.

## Verificação

```powershell
npm.cmd run test:unit
npm.cmd run test:integration
# Ou todas as verificações:
npm.cmd test
npm.cmd run db:studio
```

Testes unitários de HTTP/middleware não precisam de banco. Os testes de integração exigem as migrations aplicadas e usam PostgreSQL real: criam registros com identificadores exclusivos e removem somente seus próprios registros no encerramento. Eles iniciam a API em uma porta livre, encerram o processo e iniciam outro para verificar persistência. Não precisam que `npm start` esteja em execução. Prisma Studio fica em http://localhost:5555; abra Restaurant e User para consultar os registros.

## Organização e entregas

```text
server.js                         Inicialização e encerramento
src/app.js                        Composição da aplicação
src/config/auth.js                Configuração JWT
src/database/prisma.js            Conexão única com Prisma
src/modules/restaurants/          Routes, controller e service
src/modules/auth/                 Routes, controller, service e middleware
public/                           Interface HTML, CSS e JavaScript
prisma/schema.prisma              Restaurant e User
prisma/migrations/                Histórico incremental do banco
prisma/seed.js                    Restaurantes iniciais sem duplicar em reexecução sequencial
tests/                            Testes sem banco e integração real
docs/adr/                         Decisões arquiteturais consolidadas
docs/respostas-missoes.md          Respostas dos exercícios e desenho arquitetural
```

Os ADRs recebidos em `adrs/` foram preservados como material original; a documentação atual está em `docs/adr/`. O arquivo `teste.js` da base era uma segunda implementação sem autenticação: agora apenas inicia o mesmo servidor, para não manter um caminho que ignore a Atividade 5.

A refatoração mantém um monólito modular. As limitações e alternativas de autenticação estão no [ADR-004](docs/adr/ADR-004-autenticacao-jwt.md). As respostas de todas as missões estão em [respostas-missoes.md](docs/respostas-missoes.md).

O resultado real dos testes e as pendências do ambiente estão em [docs/validacao.md](docs/validacao.md).
