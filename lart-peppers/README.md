# 🌶️ L'Art Peppers — Loja Online

Loja completa de molhos artesanais extremos de Carolina Reaper.
**Zero dependências externas obrigatórias** — roda com Node.js puro.

---

## 🚀 Como rodar no VS Code

### Pré-requisitos
- **Node.js >= 22** ([nodejs.org](https://nodejs.org))
- VS Code com extensão **REST Client** (opcional, para testar a API)

### 1. Abrir o projeto
```
Arquivo → Abrir Pasta → selecione a pasta lart-peppers-store
```

### 2. Criar o banco de dados
Abra o terminal integrado do VS Code (`Ctrl + \``) e execute:
```bash
node database/setup.js
```
Saída esperada:
```
💾  SQLite nativo (Node.js built-in)
✅  Produtos inseridos.
✅  Admin criado — usuário: admin | senha: admin123
✅  Banco pronto: database/store.db
```

### 3. Iniciar o servidor
```bash
node server.js
```
Ou para modo desenvolvimento com auto-reload:
```bash
node --watch server.js
```

### 4. Acessar no navegador
| Página       | URL                              |
|-------------|----------------------------------|
| Loja         | http://localhost:3000            |
| Checkout     | http://localhost:3000/checkout   |
| Admin        | http://localhost:3000/admin      |
| API Health   | http://localhost:3000/api/health |

---

## 🛡️ Painel Administrativo

**URL:** http://localhost:3000/admin  
**Usuário:** `admin`  
**Senha:** `admin123`

Funcionalidades:
- 📊 Dashboard com estatísticas em tempo real
- 📦 Gestão de pedidos com atualização de status
- 👥 Lista de clientes com total gasto
- 🌶️ Edição de preço e estoque dos produtos

---

## 📁 Estrutura do Projeto

```
lart-peppers-store/
├── server.js              # Servidor HTTP principal
├── package.json
├── .env.example           # Variáveis de ambiente (copie para .env)
├── .gitignore
│
├── lib/
│   ├── micro.js           # Mini framework HTTP (Node puro)
│   ├── sqlite.js          # Wrapper SQLite unificado
│   └── auth.js            # Hash de senhas (crypto nativo)
│
├── database/
│   ├── setup.js           # Cria schema e dados iniciais
│   ├── db.js              # Conexão compartilhada (legado)
│   └── store.db           # Banco SQLite (criado no setup)
│
├── routes/
│   ├── products.js        # GET /api/products
│   ├── orders.js          # POST /api/orders, GET /api/orders/:number
│   └── admin.js           # /api/admin/* (protegido)
│
└── public/
    ├── index.html         # Loja — vitrine de produtos
    ├── checkout.html      # Checkout 3 etapas
    ├── confirmacao.html   # Página de confirmação
    ├── admin.html         # Painel administrativo
    ├── css/
    │   ├── style.css
    │   ├── checkout.css
    │   └── admin.css
    └── js/
        ├── cart.js        # Carrinho (localStorage)
        ├── store.js       # Lógica da vitrine
        ├── checkout.js    # Formulários + submissão
        └── admin.js       # Painel admin
```

---

## 🔌 API Endpoints

### Produtos
| Método | Rota                    | Descrição                  |
|--------|-------------------------|---------------------------|
| GET    | /api/products           | Lista produtos ativos      |
| GET    | /api/products/:slug     | Produto individual         |

### Pedidos
| Método | Rota                    | Descrição                  |
|--------|-------------------------|---------------------------|
| POST   | /api/orders             | Criar novo pedido          |
| GET    | /api/orders/:number     | Consultar pedido           |

### Admin (requer login)
| Método | Rota                          | Descrição                  |
|--------|-------------------------------|---------------------------|
| POST   | /api/admin/login              | Login admin                |
| POST   | /api/admin/logout             | Logout                     |
| GET    | /api/admin/dashboard          | Estatísticas               |
| GET    | /api/admin/orders             | Todos os pedidos           |
| PATCH  | /api/admin/orders/:id/status  | Atualizar status           |
| GET    | /api/admin/customers          | Lista clientes             |
| GET    | /api/admin/products           | Lista produtos             |
| PATCH  | /api/admin/products/:id       | Editar preço/estoque       |

---

## 💳 Formas de Pagamento

O sistema atual simula pagamentos localmente (sem gateway).  
Para produção, integre um dos seguintes gateways:

- **[Mercado Pago](https://www.mercadopago.com.br/developers)** — mais usado no Brasil, tem PIX nativo
- **[Pagar.me](https://pagar.me)** — robusto, suporta todos os métodos
- **[Stripe](https://stripe.com/br)** — internacional, excelente SDK

---

## 🗄️ Banco de Dados

SQLite com 6 tabelas:

| Tabela        | Descrição                        |
|--------------|----------------------------------|
| products     | Catálogo de produtos             |
| customers    | Dados dos clientes               |
| addresses    | Endereços de entrega             |
| orders       | Pedidos realizados               |
| order_items  | Itens de cada pedido             |
| payments     | Registros de pagamento           |
| admins       | Usuários administrativos         |

---

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

| Variável       | Padrão         | Descrição               |
|---------------|----------------|------------------------|
| PORT           | 3000           | Porta do servidor       |
| SESSION_SECRET | (string fixa)  | Segredo das sessões     |
| DB_PATH        | ./database/store.db | Caminho do banco   |

---

## 📦 Para produção

1. Troque `SESSION_SECRET` por uma string aleatória longa
2. Integre um gateway de pagamento real (Mercado Pago recomendado)
3. Configure HTTPS (Nginx como proxy reverso)
4. Use PM2 para manter o processo rodando:
   ```bash
   npm install -g pm2
   pm2 start server.js --name lart-peppers
   pm2 save && pm2 startup
   ```

---

*Feito com ❤️ e 🌶️ em Viçosa, MG*
