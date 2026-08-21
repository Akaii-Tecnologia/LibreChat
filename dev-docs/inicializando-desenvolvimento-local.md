# LibreChat — Desenvolvimento Local

## Terminais

Mantenha **dois processos rodando simultaneamente**.

### Terminal 1 — Backend

```bash
npm run backend:dev
```

Responsável pela API e pelo servidor do LibreChat.

### Terminal 2 — Frontend

```bash
npm run frontend:dev
```

Responsável pelo React/Vite e pelo hot reload.

## Build inicial

O `frontend:dev` não necessariamente cria fisicamente:

```text
client/dist/index.html
```

Como o backend pode procurar esse arquivo ao iniciar, execute **uma vez**, na raiz do projeto:

```bash
npm run frontend
```

Depois confirme:

```bash
ls -lh client/dist/index.html
```

Se o arquivo existir, mantenha normalmente:

```text
Terminal 1 → npm run backend:dev
Terminal 2 → npm run frontend:dev
```

## Resumo

```text
Primeira vez:
npm run frontend

Depois:
Terminal 1 → npm run backend:dev
Terminal 2 → npm run frontend:dev
```

Não é necessário manter `npm run frontend` rodando continuamente; ele serve para gerar o `dist` necessário pelo backend.
