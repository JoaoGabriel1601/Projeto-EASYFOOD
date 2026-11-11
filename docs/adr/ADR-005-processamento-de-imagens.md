# ADR-005 Processamento de imagens na API

## Contexto

O cardápio precisa exibir imagens de pratos. Receber e servir arquivos originais aumenta o volume transferido, especialmente em conexões móveis.

## Alternativas consideradas

- Processar dentro da API Express.
- Executar o processamento em um serviço independente.
- Usar funções Serverless/FaaS para processar os uploads.

## Decisão

Processar imagens no monólito modular. O Multer recebe o arquivo em memória e o Sharp corrige a orientação, limita a largura a 800 pixels e gera WebP com qualidade 80. O disco local guarda a versão otimizada e o PostgreSQL guarda seu caminho. O upload é uma operação separada do cadastro do prato, o que permite tentar novamente após uma falha.

## Justificativa

O volume inicial e o contexto acadêmico favorecem a implementação com a infraestrutura existente. O serviço compartilhado mantém o processamento isolado do módulo de pratos e reduz a quantidade de componentes a configurar.

## Consequências

A API compartilha CPU e memória com o processamento, o que pode aumentar a latência de outras requisições. Os limites de 5 MB e 25 megapixels restringem cada entrada. O disco local pressupõe uma instância com armazenamento persistente. Se o volume ou o número de instâncias crescer, será preciso reavaliar o armazenamento e a execução em serviço dedicado ou FaaS.
