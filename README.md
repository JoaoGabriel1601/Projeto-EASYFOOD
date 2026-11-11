# EasyFood

**Aluno:** João Gabriel Felix Fernandes  
**RA:** 95536

Projeto das Missões 1 a 4 e das Atividades 5 a 7, em Node.js/Express, PostgreSQL, Prisma e JWT, com interface web integrada a partir do HTML recebido. A API também pode ser usada pelo Postman, pelos exemplos abaixo ou pela suíte de testes.

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
| GET | /restaurants/:restaurantId/dishes | Pública | 200, cardápio do restaurante |
| POST | /restaurants/:restaurantId/dishes | Bearer JWT | 201, prato criado |
| POST | /dishes/:dishId/image | Bearer JWT | 200, prato com a imagem atualizada |
| GET | /uploads/dishes/:filename | Pública | 200, imagem otimizada |

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

## Atividade 6 · E-mail após cadastro

No [MailerSend](https://www.mailersend.com/help/how-to-start-sending-emails), verifique um remetente ou domínio e gere uma chave com permissão de envio. Preencha `EMAIL_API_KEY`, `EMAIL_FROM` e `EMAIL_TEST_TO` no `.env` local. `EMAIL_FROM_NAME` é opcional. Use em `EMAIL_TEST_TO` uma caixa autorizada a receber as duas mensagens de teste.

Reinicie o servidor e cadastre um restaurante com o JWT. Depois do cadastro no PostgreSQL, o serviço compartilhado envia as mensagens de boas-vindas e de aviso comercial ao destinatário configurado. O terminal registra a aceitação ou falha de cada envio. Confira a caixa de entrada para confirmar a entrega. Deixe `EMAIL_TEST_TO` vazio para desativar os envios, por exemplo, durante testes locais.

## Atividade 7 · Cardápio e imagem

Após instalar as dependências, rode `npm.cmd run db:generate` e `npm.cmd run db:migrate` com o servidor parado. A migração adiciona a tabela `Dish` e sua relação com `Restaurant`. Use o JWT do exemplo anterior e um identificador de restaurante que exista no banco.

```powershell
$restaurantId = 1
$menu = "$base/restaurants/$restaurantId/dishes"
$body = @{ name = 'Pizza Margherita'; description = 'Tomate, queijo e manjericão'; price = '49.90' } | ConvertTo-Json
$dish = Invoke-RestMethod -Method Post -Uri $menu -Headers $headers -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri $menu
curl.exe -H "Authorization: Bearer $($login.token)" -F "image=@foto.png" "$base/dishes/$($dish.id)/image"
```

Troque `foto.png` pelo caminho da imagem. Abra `imageUrl` no navegador usando o mesmo host. O upload aceita JPEG, PNG ou WebP de até 5 MB. A API retorna 400 para arquivo ausente ou inválido e 413 acima do limite. O prato continua no banco e aceita nova tentativa. O Sharp gera WebP com até 800 px de largura e o Express serve a versão otimizada. As rotas do cardápio seguem o escopo da atividade e podem ser usadas diretamente pelo Postman ou PowerShell.

A decisão de processar imagens no servidor está no [ADR-005](docs/adr/ADR-005-processamento-de-imagens.md).

## Verificação

```powershell
npm.cmd run test:unit
npm.cmd run test:integration
# Ou todas as verificações:
npm.cmd test
npm.cmd run db:studio
```

Testes unitários de HTTP/middleware e e-mail simulado não precisam de banco. Os testes de integração exigem as migrations aplicadas e usam PostgreSQL real. Criam registros com identificadores exclusivos e removem seus registros e arquivos ao terminar. A suíte inicia a API em portas livres e verifica persistência após reinicialização. Para executar com segurança sem chamar o provedor real, deixe `EMAIL_TEST_TO` vazio. Prisma Studio fica em http://localhost:5555 e permite consultar Restaurant, User e Dish.

## Organização e entregas

```text
server.js                         Inicialização e encerramento
src/app.js                        Composição da aplicação
src/config/auth.js                Configuração JWT
src/database/prisma.js            Conexão única com Prisma
src/modules/restaurants/          Routes, controller e service
src/modules/auth/                 Routes, controller, service e middleware
src/modules/dishes/               Cardápio e upload de fotos
src/modules/shared/               E-mail, processamento e middleware de upload
public/                           Interface HTML, CSS e JavaScript
prisma/schema.prisma              Restaurant, User e Dish
prisma/migrations/                Histórico incremental do banco
prisma/seed.js                    Restaurantes iniciais sem duplicar em reexecução sequencial
tests/                            Testes sem banco e integração real
docs/adr/                         Decisões arquiteturais consolidadas
docs/respostas-missoes.md          Respostas dos exercícios e desenho arquitetural
```

Os ADRs recebidos em `adrs/` foram preservados como material original; a documentação atual está em `docs/adr/`. O arquivo `teste.js` da base era uma segunda implementação sem autenticação: agora apenas inicia o mesmo servidor, para não manter um caminho que ignore a Atividade 5.

A refatoração mantém um monólito modular. As limitações e alternativas de autenticação estão no [ADR-004](docs/adr/ADR-004-autenticacao-jwt.md). As respostas de todas as missões estão em [respostas-missoes.md](docs/respostas-missoes.md).

O resultado real dos testes e as pendências do ambiente estão em [docs/validacao.md](docs/validacao.md).
