# Soberan.ia — Auditoria e Adaptação do LibreChat

## 1. Objetivo

Avaliar o LibreChat como base da interface e camada de orquestração de uma plataforma de **Soberan.ia**, priorizando o uso do LibreChat praticamente **vanilla**, evitando um fork pesado e difícil de manter.

O objetivo inicial é construir um MVP em que o usuário tenha uma experiência simples de chat com uma IA própria, sem precisar conhecer ou controlar a infraestrutura de IA existente por trás.

### Princípio central

> O usuário conversa com a IA. A plataforma decide como a IA será executada.

O usuário não deve precisar conhecer:

- qual modelo de linguagem está sendo usado;
- qual provedor fornece o modelo;
- qual endpoint está sendo utilizado;
- quais MCPs existem;
- quais ferramentas internas estão disponíveis;
- qual banco vetorial está sendo utilizado;
- como funciona o RAG;
- quais Agents existem internamente;
- system prompts;
- parâmetros internos do modelo.


### Modelos de IA
Vamos usar apenas o Deepseek-V4 flash e o usuário não pode mudar isso

---

# 2. Escopo do MVP

O MVP deve priorizar **configuração antes de alteração de código**.

A ordem de preferência é:

1. configuração oficial do LibreChat;
2. ACL/RBAC oficial;
3. configuração de Agents/MCP;
4. pequenas alterações visuais, se necessárias;
5. alterações React/frontend somente quando realmente necessárias;
6. alterações backend somente para requisitos de segurança/controle que não possam ser resolvidos de outra forma;
7. evitar alterações no core do LibreChat.

Não é objetivo do MVP criar uma versão totalmente independente do LibreChat.

---

# 3. Arquitetura conceitual

A arquitetura desejada é:

```text
                         USUÁRIO
                            │
                            ▼
                    ┌───────────────┐
                    │   LIBRECHAT  │
                    │               │
                    │ Chat          │
                    │ Agents        │
                    │ MCP           │
                    │ RAG           │
                    └───────┬───────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
              LLM         Agents       MCP
            interno       oficiais    internos
                            │           │
                            │           ├── Sistemas internos
                            │           ├── APIs
                            │           ├── Dados
                            │           └── RAG
                            │
                            ▼
                     PostgreSQL
                      + pgvector
```

## Importante

**Não utilizar Meilisearch.**

A arquitetura de busca/RAG considerada para o projeto utiliza:

- PostgreSQL;
- pgvector;
- armazenamento de documentos;
- MCP para exposição de funcionalidades aos Agents.

O Meilisearch foi explicitamente descartado.

---

# 4. Objetivos de interface

A interface pública deve parecer uma aplicação própria de IA.

Exemplo conceitual:

```text
┌──────────────────────────────────────────────────────┐
│ Soberan.ia                                      👤  │
├──────────────────────────────────────────────────────┤
│                                                      │
│                 Como posso ajudar?                   │
│                                                      │
│                                                      │
│                                                      │
│  📎                                             ➤   │
└──────────────────────────────────────────────────────┘
```

Opcionalmente, podem existir Agents oficiais apresentados como funcionalidades:

```text
[ Assistente ] [ Pesquisa ] [ Documentos ] [ Clipping ]
```

O usuário deve enxergar conceitos de negócio e não conceitos de infraestrutura.

### Evitar expor

- LLM;
- MCP;
- RAG;
- embedding;
- vector store;
- temperature;
- context window;
- system prompt;
- endpoint;
- provider;
- nome técnico do Agent.

---

# 5. Auditoria necessária

A auditoria do LibreChat deve responder objetivamente aos seguintes pontos.

## 5.1 Configuração de modelos

Verificar:

- como os modelos são configurados;
- como endpoints são configurados;
- como impedir a seleção manual do modelo;
- como impedir a seleção de endpoint;
- como esconder parâmetros;
- como esconder presets;
- se o modelo ainda pode ser descoberto pela interface;
- se o modelo aparece em histórico, metadata ou outras áreas visíveis;
- se é possível manter um modelo fixo sem modificar o código.

Configurações que devem ser investigadas:

```yaml
interface:
  endpointsMenu: false
  modelSelect: false
  parameters: false
  presets: false
```

Essas opções devem ser validadas na versão efetivamente utilizada.

### ✅ Resultado 5.1 (validado na versão 1.3.13 / aplicado em `librechat.yaml` + `.env`)

| Pergunta | Status | Como |
|---|---|---|
| Como os modelos são configurados | ✅ CONFIG | Endpoint custom `endpoints.custom` (só DeepSeek), `fetch: false`, lista fixa de 1 modelo |
| Como endpoints são configurados | ✅ CONFIG | `endpoints.custom`; outros endpoints desativados no `.env` (`ANTHROPIC_API_KEY`/`GOOGLE_KEY` vazios) |
| Impedir seleção manual do modelo | ✅ CONFIG | `interface.modelSelect: false` |
| Impedir seleção de endpoint | ✅ CONFIG | `interface.modelSelect: false` (o menu de endpoints é aberto pelo seletor) |
| Esconder parâmetros | ✅ CONFIG | `interface.parameters: false` |
| Esconder presets | ✅ CONFIG | `interface.presets: false` |
| Modelo ainda é descoberto pela interface? | ⚠️ PARCIAL | Oculto na UI, mas o nome técnico persiste em **metadata das mensagens** e nas **respostas da API** (não é segurança) |
| Modelo aparece em histórico/metadata? | ⚠️ PARCIAL | Histórico não exibe nome; metadata/API sim. Aceito para o MVP (seção 11) |
| Modelo fixo sem modificar código? | ✅ CONFIG | Existe só 1 modelo (`fetch: false`) + seletor oculto |

> ⚠️ **`endpointsMenu: false` NÃO existe nesta versão.** O schema remove esse campo
> silenciosamente (`interfaceSchema` em `packages/data-provider`). O ocultamento do
> menu de endpoints é feito por `modelSelect: false`.

---

# 6. MCP

## Objetivo

MCP deve ser uma capacidade **da plataforma**, não do usuário.

A plataforma poderá possuir MCPs internos, por exemplo:

```text
MCP Clipping
MCP Documentos
MCP Dados
MCP Sistemas
MCP Relatórios
```

O usuário não deve poder criar ou configurar MCPs próprios.

## Investigar

- configuração dos MCP Servers;
- permissões de uso;
- permissões de criação;
- permissões de compartilhamento;
- exposição dos MCPs no menu;
- possibilidade de esconder MCPs do chat normal;
- possibilidade de deixar MCPs disponíveis somente para Agents;
- possibilidade de bloquear criação de MCP por usuário;
- possibilidade de bloquear compartilhamento.

Investigar especialmente:

```yaml
mcpServers:
```

e configurações de interface/ACL relacionadas a MCP.

Também avaliar o uso de:

```yaml
chatMenu: false
```

para MCPs que devem ser utilizados somente por Agents.

### ✅ Resultado 6 (aplicado em `librechat.yaml`)

| Pergunta | Status | Como |
|---|---|---|
| Configuração dos MCP Servers (operador) | ✅ CONFIG | Chave de topo `mcpServers:` (servidores internos da plataforma) |
| Permissão de uso pelo usuário | ✅ ACL | `interface.mcpServers.use: false` → revoga `MCP_SERVERS.USE` do papel USER |
| Permissão de criação | ✅ ACL | `interface.mcpServers.create: false` → revoga `MCP_SERVERS.CREATE` |
| Permissão de compartilhamento | ✅ ACL | `interface.mcpServers.share: false` / `public: false` |
| Exposição no menu | ✅ CONFIG | Com `use: false` e `create: false`, o item de menu MCP some (`useSideNavLinks`) |
| Esconder MCP do chat normal | ✅ CONFIG | `use: false` remove o dropdown de MCP do prompt bar |
| **MCP disponível somente para Agents** | ❌ BACKEND | **NÃO é possível só com config nesta versão**: a permissão `MCP_SERVERS.USE` é a MESMA que autoriza Agents a executarem MCP (check `userCanUseMCPServers` no runtime de Agents). Com `use: false`, Agents também perdem MCP. Requer mudança de backend (permissão separada) |
| Bloquear criação de MCP por usuário | ✅ ACL | `interface.mcpServers.create: false` |
| Bloquear compartilhamento | ✅ ACL | `share: false` / `public: false` |
| `chatMenu: false` | ❌ N/A | Não existe; substituído por `interface.mcpServers.use: false` |

> ⚠️ **`chatMenu: false` não existe** nesta versão. O caminho correto é
> `interface.mcpServers.use: false`.

## Modelo desejado

```text
Usuário
   │
   ▼
Agent oficial
   │
   ▼
MCP interno
   │
   ├── PostgreSQL
   ├── pgvector
   ├── APIs
   └── sistemas internos
```

O usuário não precisa saber que MCP está sendo utilizado.

---

# 7. Agents

Agents são desejáveis no projeto.

Entretanto, os usuários não devem poder criar ou modificar Agents arbitrariamente.

## Modelo desejado

```text
USUÁRIO

Pode:
  ✓ usar Agents oficiais

Não pode:
  ✗ criar Agent
  ✗ editar Agent
  ✗ alterar prompt interno
  ✗ adicionar ferramentas
  ✗ configurar MCP
  ✗ compartilhar Agent
```

## Agents oficiais possíveis

Exemplos:

```text
Assistente Geral
Pesquisa Documental
Clipping
Análise
Dados
Relatórios
```

Esses nomes são apenas exemplos. A definição final deverá ser feita posteriormente.

## Investigar

- ACL de Agents;
- permissões USE;
- permissões CREATE;
- permissões SHARE;
- permissões SHARE_PUBLIC;
- Agent Builder;
- possibilidade de desabilitar o Builder;
- possibilidade de disponibilizar Agents somente para determinados usuários/grupos.

Investigar especialmente:

```yaml
endpoints:
  agents:
    disableBuilder: true
```

e validar o comportamento real na versão utilizada.

### ✅ Resultado 7 (aplicado em `librechat.yaml`)

| Pergunta | Status | Como |
|---|---|---|
| ACL de Agents | ✅ ACL | `interface.agents` → permissões `AGENTS` do papel USER |
| Permissão USE | ✅ ACL | `interface.agents.use: true` (usuário usa Agents oficiais) |
| Permissão CREATE | ✅ ACL | `interface.agents.create: false` |
| Permissão SHARE | ✅ ACL | `interface.agents.share: false` |
| Permissão SHARE_PUBLIC | ✅ ACL | `interface.agents.public: false` |
| Agent Builder visível? | ✅ CONFIG | `endpoints.agents.disableBuilder: true` esconde o item de menu do Builder |
| Desabilitar o Builder | ✅ CONFIG | `endpoints.agents.disableBuilder: true` |
| Agents somente para grupos/usuários | ✅ ACL | Permissões por papel/usuário via admin panel (os padrões vêm do yaml) |

---

# 8. RBAC / permissões

Mapear o sistema de controle de acesso do LibreChat.

Precisamos identificar:

- usuários;
- grupos;
- roles;
- ACL;
- permissões de Agents;
- permissões de MCP;
- permissões de prompts;
- permissões de compartilhamento;
- permissões administrativas.

Criar uma matriz semelhante a:

| Recurso | Usuário | Administrador | Administrador técnico |
|---|---:|---:|---:|
| Conversar | ✓ | ✓ | ✓ |
| Usar Agent oficial | ✓ | ✓ | ✓ |
| Criar Agent | ✗ | conforme política | ✓ |
| Editar Agent | ✗ | conforme política | ✓ |
| Criar MCP | ✗ | ✗/conforme política | ✓ |
| Usar MCP interno | indireto | conforme política | ✓ |
| Alterar modelo | ✗ | conforme política | ✓ |
| Ver configuração interna | ✗ | limitado | ✓ |

A matriz final deverá refletir as capacidades reais da versão instalada.

### ✅ Resultado 8

- O `librechat.yaml` (bloco `interface`) **define as permissões padrão do papel USER**
  (mapeamento em `packages/api/src/app/permissions.ts` → `PermissionTypes`:
  `AGENTS`, `MCP_SERVERS`, `PROMPTS`, `MULTI_CONVO`, `WEB_SEARCH`, etc.).
- O papel **ADMIN** mantém acesso amplo (gerencia por padrão).
- Perfis extras (ex.: "Administrador técnico") são criados/ajustados no **Admin
  Panel** (roles por usuário/grupo) — dados, não código.
- O MVP restringe o papel USER via config; os papéis administrativos são
  definidos na operação (admin panel), não no yaml.

> ✅ **Concluído via config/ACL** para o papel USER. Papéis avançados dependem do
> admin panel (não é alteração de código).

---

# 9. O que aparece para o usuário

Fazer uma inspeção visual completa da interface.

Catalogar:

### Deve desaparecer ou ser ocultado

- menu de modelos;
- menu de endpoints;
- parâmetros;
- presets;
- Agent Builder;
- criação de Agents;
- criação de MCP;
- compartilhamento de MCP;
- configurações técnicas;
- informações do provider;
- informações do modelo;
- ferramentas internas, quando não fizer sentido expô-las.

### Deve permanecer

- novo chat;
- histórico;
- envio de mensagens;
- anexos, se desejado;
- Agents oficiais, se desejado;
- recursos de negócio definidos para o MVP.

### ✅ Resultado 9

| Item | Status | Mecanismo |
|---|---|---|
| Menu de modelos | ✅ oculto | `interface.modelSelect: false` |
| Menu de endpoints | ✅ oculto | `modelSelect: false` (não existe `endpointsMenu`) |
| Parâmetros | ✅ oculto | `interface.parameters: false` |
| Presets | ✅ oculto | `interface.presets: false` |
| Agent Builder | ✅ oculto | `endpoints.agents.disableBuilder: true` |
| Criação de Agents | ✅ bloqueada | `interface.agents.create: false` |
| Criação de MCP | ✅ bloqueada | `interface.mcpServers.create: false` |
| Compartilhamento de MCP | ✅ bloqueado | `interface.mcpServers.share/public: false` |
| Configurações técnicas | ✅ ocultas | `contextUsage: false`, `multiConvo: false`, `memories: false`, etc. |
| Informações do provider/modelo | ✅ ocultas na UI | seletor oculto; ainda em metadata/API (ver seção 11) |
| Ferramentas internas | ✅ ocultas | `runCode: false`, `webSearch: false`, `fileSearch: false` |
| Novo chat / histórico / envio / anexos | ✅ permanecem | padrão, sem alteração |
| Agents oficiais | ✅ permanecem | `interface.agents.use: true` |

> ✅ **Concluído via config**, exceto o que depende do item de backend de MCP
> (seção 6) e da política de descoberta do modelo (seção 11).

---

# 10. Configuração x frontend x backend x fork

Para cada requisito, classificar a solução em uma destas categorias:

| Categoria | Significado |
|---|---|
| VANILLA | Funciona sem alteração |
| CONFIG | Resolve via configuração oficial |
| ACL | Resolve via RBAC/ACL |
| CSS | Apenas ocultação visual |
| FRONTEND | Requer alteração React |
| BACKEND | Requer bloqueio/validação no backend |
| FORK | Alteração estrutural do core |

## Tabela de auditoria

Preencher durante a investigação:

| Requisito | Vanilla | Config | ACL | CSS | Frontend | Backend | Fork | Observações |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Esconder modelo | | ✅ | | | | | | `modelSelect: false`. Nome ainda em metadata/API (não é segurança) |
| Impedir troca de modelo | | ✅ | | | | | | `modelSelect: false` + só 1 modelo (`fetch: false`) |
| Esconder endpoint | | ✅ | | | | | | `modelSelect: false` (não existe `endpointsMenu`) |
| Esconder parâmetros | | ✅ | | | | | | `parameters: false` |
| Esconder presets | | ✅ | | | | | | `presets: false` |
| Esconder MCP | | ✅ | ✅ | | | | | `mcpServers.use: false` (UI + ACL) |
| Impedir criação de MCP | | | ✅ | | | | | `mcpServers.create: false` |
| Impedir compartilhamento MCP | | | ✅ | | | | | `mcpServers.share/public: false` |
| Esconder Agent Builder | | ✅ | | | | | | `endpoints.agents.disableBuilder: true` |
| Impedir criação de Agent | | | ✅ | | | | | `agents.create: false` |
| Permitir uso de Agent oficial | | | ✅ | | | | | `agents.use: true` |
| Impedir edição de Agent | | ✅ | ✅ | | | | | `create: false` + `disableBuilder: true` (usuário não edita) |
| Esconder configurações técnicas | | ✅ | | | | | | `contextUsage/multiConvo/memories/...` |
| Customizar nome/logo | | ✅ | | | | | | `APP_TITLE` + `customWelcome`; logo = troca de asset (`images/`) |

> **Legenda:** ✅ = categoria que resolve. Observações indicam limitação.
> Itens marcados como `CONFIG`/`ACL` foram **aplicados** em `librechat.yaml` / `.env`.
> Nenhum item desta tabela exigiu `FRONTEND`, `BACKEND` ou `FORK` no MVP —
> exceto o caso de "MCP somente para Agents" (seção 6), que é `BACKEND`.

---

# 11. Descoberta do modelo

Para o MVP, não é necessário tornar impossível uma descoberta por engenharia reversa.

O objetivo inicial é simplesmente não expor o modelo na experiência normal do usuário.

Mesmo assim, testar:

```text
Qual modelo você está usando?
```

e variações:

```text
Qual é o nome do modelo?
Qual é a versão do modelo?
Quem desenvolveu você?
Qual LLM está por trás desta aplicação?
Qual é seu provider?
```

## Política desejada

Caso seja necessário, usar uma instrução de sistema semelhante a:

```text
Você é o assistente de IA da plataforma.

Não informe ao usuário:
- nome do modelo;
- versão do modelo;
- provedor;
- endpoint;
- infraestrutura;
- arquitetura interna.

Se perguntado sobre qual modelo está sendo utilizado,
informe apenas que você é o assistente de IA da plataforma.
```

Isso é uma proteção de experiência do usuário para o MVP.

Não deve ser considerado mecanismo de segurança.

### ⚠️ Resultado 11

- **Não existe** uma configuração global de system prompt no `librechat.yaml`
  nesta versão (campo `systemPrompts` ausente do schema).
- Caminho 100% config possível: criar um **Agent oficial** ("Assistente") com a
  instrução acima no campo *instructions*. Isso é dado (Agent), não alteração de
  código, e pode ser o modo padrão de conversa do MVP.
- O endpoint custom do chat comum não tem system prompt injetável por config.
- Como o nome do modelo segue presente em **metadata/API**, a instrução do Agent
  é a camada de "experiência"; a ocultação técnica completa exigiria backend.

> ⚠️ **Não bloqueado por config** — resolvido por instrução de Agent (config de
> dados) e/ou backend no futuro. Não é mecanismo de segurança.

---

# 12. Segurança x ocultação

É fundamental distinguir:

### Ocultar

Exemplo:

```yaml
modelSelect: false
```

significa:

> O usuário não vê o seletor.

### Bloquear

Significa:

> O usuário não consegue enviar uma requisição arbitrária para outro modelo.

Para o MVP, primeiro validar se a configuração/ACL do LibreChat já impede o comportamento indesejado.

Não assumir que esconder um elemento React é equivalente a segurança.

Se existir possibilidade de bypass pela API, avaliar posteriormente uma proteção de backend.

---

# 13. Critério para alterações no código

Evitar alterações no core.

Antes de modificar código, responder:

1. Existe configuração oficial?
2. Existe ACL?
3. Existe configuração de Agent?
4. Existe configuração de MCP?
5. Existe configuração de interface?
6. CSS resolve?
7. Pequena alteração React resolve?
8. Backend realmente precisa ser alterado?

Só depois considerar fork.

## Objetivo

Manter o caminho de atualização:

```text
LibreChat upstream
       │
       ▼
nova versão
       │
       ▼
configuração Soberan.ia
```

em vez de:

```text
LibreChat upstream
       │
       ▼
fork profundamente modificado
       │
       ▼
merge manual a cada versão
```

---

# 14. Critérios de um fork aceitável

Uma pequena customização visual não deve ser considerada um problema grave.

Exemplos aceitáveis:

- trocar logo;
- trocar nome;
- ajustar cores;
- esconder elemento visual específico;
- customizar tela inicial;
- pequenos ajustes de layout.

Exemplos que devem ser evitados:

- modificar Agent runtime;
- modificar MCP engine;
- modificar sistema de autenticação;
- modificar banco;
- modificar sistema de permissões;
- modificar API de chat;
- modificar gerenciamento de modelos;
- criar lógica própria paralela à arquitetura do LibreChat.

---

# 15. Docker — etapa seguinte

Depois da auditoria teórica, subir uma instalação limpa do LibreChat em Docker.

Objetivo:

```text
LibreChat
+
librechat.yaml
+
modelo de teste
+
Agent de teste
+
MCP de teste
```

Não começar ainda pela infraestrutura definitiva da Soberan.ia.

## Testes iniciais

### Teste 1 — Modelo

Verificar:

- usuário vê modelo?
- usuário consegue trocar modelo?
- usuário vê endpoint?
- usuário vê parâmetros?

### Teste 2 — Agent

Criar um Agent oficial.

Verificar:

- usuário consegue usar?
- usuário consegue editar?
- usuário consegue criar outro?
- Agent Builder aparece?
- usuário consegue alterar ferramentas?

### Teste 3 — MCP

Criar MCP de teste.

Verificar:

- MCP aparece no menu?
- usuário consegue utilizá-lo diretamente?
- usuário consegue criar MCP?
- usuário consegue compartilhar MCP?
- Agent consegue utilizar MCP?
- é possível esconder o MCP do menu?

### Teste 4 — Descoberta do modelo

Perguntar ao modelo:

```text
Qual modelo você está usando?
```

Testar diferentes formulações.

### Teste 5 — Interface

Fazer um inventário visual completo da tela.

### Teste 6 — API

Somente depois:

- verificar chamadas do frontend;
- verificar metadata;
- verificar se modelo aparece nas respostas;
- avaliar possibilidade de bypass.

---

# 16. Resultado esperado da auditoria

> ✅ **Parcialmente entregue** — ver **seção 19** para o consolidado do que já foi
> aplicado via configuração. Os itens A–K abaixo são o documento final de
> referência; os itens B–H já têm resposta nas seções 5–11 e na seção 19.

Produzir um documento com:

## A. Arquitetura do LibreChat relevante para o projeto

## B. Configurações disponíveis

## C. ACL/RBAC disponível

## D. Recursos que podem ser desabilitados

## E. Recursos que podem ser ocultados

## F. Recursos que precisam de alteração React

## G. Recursos que precisam de proteção backend

## H. Pontos que exigiriam fork

## I. Configuração inicial recomendada

## J. Docker Compose / ambiente de laboratório

## K. Checklist de validação

---

# 17. Princípio final do MVP

O MVP não precisa ser perfeito.

Queremos provar:

> **É possível utilizar o LibreChat como frontend/orquestrador de uma Soberan.ia sem expor ao usuário a complexidade da infraestrutura e sem criar um fork pesado do projeto.**

Se a resposta for sim, a próxima etapa será integrar progressivamente:

```text
                    Soberan.ia
                         │
                    LibreChat
                         │
             ┌───────────┼───────────┐
             │           │           │
            LLM         Agents      MCP
             │                       │
             │                       ├── Sistemas
             │                       ├── APIs
             │                       └── Dados
             │
             └──────────────┐
                            ▼
                     PostgreSQL
                       + pgvector
```

O foco inicial deve ser **validar a plataforma**, não construir toda a infraestrutura definitiva.

---

# 18. Regra de trabalho

Durante a implementação, sempre preferir:

**configuração > ACL > pequena customização frontend > backend > fork**

E documentar cada alteração necessária, para que futuramente seja possível atualizar o LibreChat upstream com o mínimo de esforço.

---

# 19. ✅ Estado da auditoria — configuração aplicada

> **Resumo do que foi concluído até aqui, somente via configuração (sem alterar código).**

## 19.1 Arquivos alterados

| Arquivo | Ação | Observações |
|---|---|---|
| `librechat.yaml` | **criado** | Configuração oficial validada com `configSchema` (`CONFIG VALID ✓`) |
| `.env` | **ajustado** | Branding + lockdown de endpoints/registro (abaixo) |

## 19.2 O que foi concluído via `librechat.yaml`

- ✅ **Modelo fixo e oculto** — `interface.modelSelect: false` + endpoint custom
  único `endpoints.custom` (DeepSeek), `fetch: false` (só 1 modelo).
- ✅ **Parâmetros e presets ocultos** — `interface.parameters: false`, `presets: false`.
- ✅ **MCP fora do alcance do usuário** — `interface.mcpServers.{use,create,share,public}: false`.
- ✅ **Agents oficiais utilizáveis, sem criação/edição/compartilhamento** —
  `interface.agents.{use:true, create:false, share:false, public:false}` +
  `endpoints.agents.disableBuilder: true`.
- ✅ **Ferramentas técnicas fora do chat** — `runCode/webSearch/fileSearch: false`,
  `contextUsage: false`, `multiConvo: false`, `bookmarks: false`, `memories: false`.
- ✅ **Sem compartilhamento/links** — `interface.sharedLinks` tudo `false`;
  `peoplePicker` tudo `false`.
- ✅ **Boas-vindas customizada** — `interface.customWelcome: 'Como posso ajudar?'`.

## 19.3 O que foi concluído via `.env`

- ✅ `APP_TITLE=Soberan.ia` (título exibido na UI/aba).
- ✅ Endpoints desativados para restar **apenas DeepSeek**:
  `ANTHROPIC_API_KEY`/`GOOGLE_KEY` comentados; `DEEPSEEK_API_KEY=` aguardando chave.
- ✅ `ALLOW_REGISTRATION=false` (usuários criados pelo admin — `config/create-user.js`).
- ✅ `ALLOW_ACCOUNT_DELETION=false`, `ALLOW_SHARED_LINKS=false`.
- ✅ `HELP_AND_FAQ_URL` comentado (não expor link para o LibreChat).

## 19.4 O que NÃO é possível só com configuração nesta versão

| Item | Categoria | Motivo |
|---|---|---|
| MCP disponível **somente para Agents** | ❌ BACKEND | `MCP_SERVERS.USE` é a mesma permissão para chat e Agents (`userCanUseMCPServers`) |
| `endpointsMenu: false` | ❌ N/A | Campo removido pelo schema; usar `modelSelect: false` |
| `chatMenu: false` | ❌ N/A | Não existe; usar `interface.mcpServers.use: false` |
| System prompt global anti-revelação | ⚠️ DADOS/AGENT | Sem `systemPrompts` no schema; usar instruções de um Agent oficial |
| Ocultação do modelo em metadata/API | ⚠️ BACKEND | Nome do modelo persiste em metadata/respostas (fora do escopo da UI) |

## 19.5 Próximos passos

1. Preencher `DEEPSEEK_API_KEY` no `.env` e **reiniciar** o backend para carregar o `librechat.yaml`.
2. Criar o(s) **Agent(s) oficial(is)** (via admin) com instruções de não revelar o modelo (seção 11).
3. Rodar os **Testes 1–6** da seção 15 e marcar aqui o resultado visual.
4. Avaliar a mudança de backend para "MCP somente para Agents" (seção 6), se necessária.
