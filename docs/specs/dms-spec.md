# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, consultem e baixem seus documentos, com arquivos armazenados no filesystem local e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, somente para o usuário proprietário.
- Persistência do conteúdo dos arquivos no filesystem local da aplicação.
- Manutenção dos metadados em memória durante a execução do processo backend.
- Interface web React para envio, listagem e download.
- Configuração operacional por variáveis de ambiente.

### Fora do escopo

- Armazenamento em nuvem, provedores externos ou serviços de upload de terceiros.
- Banco de dados ou persistência durável dos metadados.
- Autenticação, cadastro de contas, permissões avançadas ou gestão de usuários.
- Versionamento, edição, compartilhamento e exclusão de documentos.
- Paginação, busca e filtros avançados.
- Recuperação automática dos metadados depois de reiniciar o backend.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento por vez. | Uma requisição multipart válida produz metadados com identificador único, nome original, tamanho, data de envio e proprietário. |
| RF-02 | O backend grava o conteúdo enviado no armazenamento local. | O arquivo é gravado em `backend/storage` (ou no diretório configurado), usando `multer` com `diskStorage` e nome interno gerado pela aplicação. |
| RF-03 | O usuário pode listar seus documentos. | A resposta contém os metadados dos documentos do usuário da requisição e não expõe caminhos internos do filesystem. |
| RF-04 | O usuário pode baixar um documento pelo identificador. | O backend transmite o conteúdo binário e usa o nome original somente como nome de download; documentos inexistentes ou de outro usuário não são entregues. |
| RF-05 | O usuário da operação é identificado por um contexto de usuário da requisição. | Para esta fase sem autenticação, o backend exige `X-User-Id` e o associa ao campo `owner`; o valor não é aceito como campo livre do formulário. |
| RF-06 | A interface apresenta os fluxos de upload, listagem e download. | A interface informa carregamento e erros de API e atualiza a lista após um envio bem-sucedido. |
| RF-07 | A aplicação mantém o endpoint de saúde existente. | `GET /health` continua respondendo com `{ "status": "ok" }`. |

### Premissa de identidade

`X-User-Id` é um identificador de contexto para o MVP, não uma credencial. Sem autenticação, clientes podem declarar outro identificador; portanto, o isolamento por `owner` organiza os dados, mas não constitui uma fronteira de segurança. A adoção de autenticação exige uma especificação própria.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend é Node.js com Express em CommonJS; o frontend é React com Vite em ESM. |
| RNF-02 | Uploads são gravados exclusivamente no filesystem local via `multer` configurado com `diskStorage`. |
| RNF-03 | Metadados existem somente em memória e são perdidos quando o processo backend reinicia. |
| RNF-04 | O diretório de armazenamento padrão é `backend/storage`, sem dependência de serviços externos. |
| RNF-05 | Configurações de porta, diretório de armazenamento e limite de upload são obtidas por variáveis de ambiente. |
| RNF-06 | O limite padrão de upload é 10 MiB (`10485760` bytes), configurável por `MAX_FILE_SIZE_BYTES`. |
| RNF-07 | O nome físico do arquivo é gerado pela aplicação; o nome original não é usado como caminho no filesystem. |
| RNF-08 | Falhas de validação e de persistência são convertidas em respostas HTTP previsíveis; detalhes internos e caminhos locais não são retornados ao cliente. |
| RNF-09 | O backend segue a separação `routes -> controllers -> services -> repositories`; camadas internas não dependem de Express. |
| RNF-10 | Testes do backend usam o runner nativo `node:test`. |

### Configuração prevista

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de gravação dos arquivos. Relativo ao diretório do backend quando informado como caminho relativo. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo aceito por upload, em bytes. |

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | API | Identificador único e opaco do documento. |
| `originalName` | string | API | Nome original fornecido pelo cliente, preservado como metadado e nome de download. |
| `size` | number | API | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | API | Data e hora de recebimento em ISO 8601 UTC. |
| `owner` | string | API | Identificador vindo de `X-User-Id`. |
| `storageName` | string | Interno | Nome gerado para o arquivo no filesystem; nunca aceito do cliente. |
| `storagePath` | string | Interno | Caminho local usado pelo repositório para leitura e remoção de arquivo parcial. Não é retornado pela API. |

Os registros são mantidos em uma estrutura em memória no repositório. O caminho físico e o nome original são dados distintos; nenhuma operação deve derivar um caminho local diretamente de `originalName` ou de `id` recebido sem validação. Se a gravação ou o registro dos metadados falhar, o arquivo parcial deve ser removido quando possível.

## 6. Contratos de API

As rotas do backend usam os caminhos sem prefixo `/api`. No desenvolvimento, o frontend chama `/api/...` e o proxy do Vite remove `/api` antes de encaminhar a requisição ao backend.

### Convenções

- `Content-Type` das respostas JSON: `application/json; charset=utf-8`.
- `X-User-Id` é obrigatório nas operações de documentos. Deve ser uma string não vazia após remoção de espaços nas extremidades.
- Resposta de erro JSON: `{ "error": { "code": "CODIGO", "message": "Descrição legível." } }`.
- Listagem e download são limitados ao proprietário indicado pela requisição.
- Não são aceitos caminhos de armazenamento ou identificadores definidos pelo cliente durante o upload.

### POST /upload

Envia um único documento.

**Cabeçalhos:** `X-User-Id: <identificador>`.

**Entrada:** `multipart/form-data`, com exatamente um campo de arquivo chamado `file`. O limite padrão é 10 MiB. Nesta versão, não há allowlist por extensão ou MIME; o sistema conserva o nome informado, sem confiar nele como caminho local.

**Sucesso — `201 Created`:** objeto de metadados:

```json
{
  "id": "identificador-opaco",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-26T12:00:00.000Z",
  "owner": "usuario-123"
}
```

**Erros:**

| HTTP | Código | Situação |
| --- | --- | --- |
| 400 | `INVALID_USER_CONTEXT` | Cabeçalho `X-User-Id` ausente ou vazio. |
| 400 | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo. |
| 400 | `INVALID_UPLOAD` | Formato multipart inválido ou mais de um arquivo enviado. |
| 413 | `FILE_TOO_LARGE` | Arquivo excede `MAX_FILE_SIZE_BYTES`. |
| 500 | `STORAGE_ERROR` | Falha ao gravar o arquivo ou registrar os metadados. |

### GET /documents

Lista os documentos do usuário informado.

**Cabeçalhos:** `X-User-Id: <identificador>`.

**Sucesso — `200 OK`:** array JSON de metadados; array vazio quando o usuário ainda não possui documentos.

```json
[
  {
    "id": "identificador-opaco",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-26T12:00:00.000Z",
    "owner": "usuario-123"
  }
]
```

**Erros:** `400 INVALID_USER_CONTEXT` se o cabeçalho estiver ausente ou vazio; `500 INTERNAL_ERROR` se não for possível consultar os metadados.

### GET /documents/:id/download

Transmite o conteúdo do documento como binário.

**Cabeçalhos:** `X-User-Id: <identificador>`.

**Sucesso — `200 OK`:** bytes do arquivo, com `Content-Disposition: attachment` e o nome original codificado de forma segura. O tipo de conteúdo pode ser `application/octet-stream` nesta fase.

**Erros:** `400 INVALID_USER_CONTEXT` se o cabeçalho estiver ausente ou vazio; `404 DOCUMENT_NOT_FOUND` se o identificador não existir, não pertencer ao usuário ou o arquivo não estiver disponível; `500 STORAGE_ERROR` para falhas de leitura não classificadas como arquivo indisponível.

### GET /health

**Sucesso — `200 OK`:** `{ "status": "ok" }`.

## 7. Decisões arquiteturais

### Backend

- `routes/`: declara os caminhos HTTP e encaminha a requisição ao controller correspondente.
- `controllers/`: valida dados de transporte, lê cabeçalhos e campos multipart, invoca serviços e monta respostas HTTP.
- `services/`: aplica regras de negócio, como associação ao proprietário e tratamento do fluxo de envio/listagem/download.
- `repositories/`: mantém metadados em memória e coordena a gravação e leitura de arquivos locais.
- `app.js`: compõe o Express e preserva `GET /health`; a inicialização do servidor continua protegida para permitir importar o app em testes.
- `multer`: usa `diskStorage` no diretório local configurado. Nomes físicos são gerados pela aplicação e limites vêm da configuração.

### Frontend

- Componentes funcionais React, organizados em `components/`, `pages/` e `services/` conforme a estrutura existente.
- Comunicação via `fetch` através de `/api`, aproveitando o proxy já configurado no Vite.
- Fluxos previstos: seleção e envio de arquivo, listagem dos metadados e download do arquivo selecionado.

### Persistência e ciclo de vida

Os arquivos permanecem no disco após reinício do processo, mas os metadados em memória não. Assim, após reinício, os arquivos anteriores não podem ser localizados pela API nesta fase. A reconciliação de arquivos ou a persistência durável de metadados exige mudança de escopo.

## 8. Plano de execução

As etapas abaixo orientam uma implementação futura; não fazem parte da criação desta especificação.

1. Definir e validar configuração do backend: `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_BYTES`; garantir que o diretório local exista e seja gravável.
2. Criar repositórios para gravação/leitura de arquivos com `multer`/`diskStorage` e armazenamento em memória dos metadados.
3. Implementar serviços de upload, listagem e download com validação de proprietário, tratamento de erros e remoção de arquivo parcial em falhas.
4. Implementar controllers e routes para os contratos desta especificação, preservando `GET /health`.
5. Adicionar testes `node:test` para contratos HTTP, isolamento por usuário, erros de upload, arquivo ausente e ciclo de vida em memória; usar diretório temporário nos testes de filesystem.
6. Implementar o cliente `fetch` e os componentes React para upload, listagem, estados de carregamento/erro e download.
7. Validar a integração pelo proxy Vite e executar os testes do backend e o build do frontend.

## 9. Critérios de conclusão

- Todos os requisitos funcionais possuem critérios verificáveis.
- Os contratos cobrem formatos de entrada/saída, proprietário, sucesso e erros previstos.
- A arquitetura mantém o fluxo `routes -> controllers -> services -> repositories`.
- Os arquivos são armazenados somente no filesystem local com `multer` e `diskStorage`; metadados permanecem em memória.
- Nenhum arquivo de implementação de backend ou frontend é alterado como parte desta etapa de especificação.