# ADR-004 - Autenticação local com JWT

- Status: aceita.
- Data: 19/09/2026.
- Responsável: Equipe EasyFood.

## Contexto
A API deve cadastrar e autenticar usuários, identificar o usuário autenticado e proteger a criação de restaurantes, mantendo a consulta pública.

## Pesquisa e alternativas
| Solução | Benefício para EasyFood | Custo ou trade-off |
| --- | --- | --- |
| JWT com usuários locais | Permite estudar todo o fluxo e validar tokens na API | A aplicação mantém senhas, chaves e ciclo de vida dos tokens |
| AWS Cognito | Oferece diretório de usuários e fluxos de autenticação gerenciados | Exige configuração e dependência de um serviço externo |
| Login com Google / OpenID Connect | Permite autenticar usando uma identidade Google | Exige integração, validação de ID tokens e configuração de cliente |
| Sessões no servidor | Permitem revogação centralizada da sessão | Exigem armazenamento e coordenação de sessões |

Fontes primárias consultadas em 19/09/2026:
- [jsonwebtoken: assinatura, expiração e verificação](https://github.com/auth0/node-jsonwebtoken)
- [Autenticação com Amazon Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

## Decisão e justificativa
Usar jsonwebtoken, bcryptjs e dotenv, conforme a Atividade 5. Armazenar apenas hash bcrypt (custo 10), emitir JWT HS256 válido por um dia e exigir Authorization: Bearer nas rotas protegidas. A chave aleatória fica no .env ignorado pelo controle de versão. Esta escolha atende à atividade e mantém a implementação local compreensível.

## Consequências positivas
Módulo de autenticação coeso; senha fora das respostas; middleware reutilizável; integração simples com clientes HTTP.

## Consequências negativas / trade-offs
JWT é assinado, não criptografado: não incluir segredos no payload. Um token emitido permanece válido até expirar, inclusive se o usuário for removido. Não há logout com revogação, refresh token, recuperação de senha, confirmação de e-mail, MFA ou limitação de tentativas nesta atividade. A avaliação de produção exigiria tratar esses pontos e usar HTTPS.

## Critérios de revisão
Reavaliar ao precisar de revogação imediata, permissões por papel, login social, MFA ou gestão de identidade externa. Cognito ou Google podem integrar uma evolução futura, sem serem necessários para a entrega acadêmica atual.
