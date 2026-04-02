# SecurePlay

SecurePlay é uma aplicação web focada em **segurança da informação
gamificada**, desenvolvida com **React + TailwindCSS** no frontend e
**NestJS** no backend.

O projeto foi construído utilizando **TypeScript** em toda a stack e
utiliza **MySQL** como banco de dados.

Atualmente o banco **não está hospedado em nuvem**, portanto o ambiente
precisa ser executado **localmente** para testes.

------------------------------------------------------------------------

# Tecnologias

## Frontend

-   React
-   TypeScript
-   Vite
-   TailwindCSS
-   Radix UI
-   Framer Motion
-   React Router
-   Axios

## Backend

-   NestJS
-   TypeORM
-   MySQL
-   JWT Authentication
-   Fastify / Express support
-   Class Validator

## Ambiente

-   Node.js **\>= 20**

------------------------------------------------------------------------

# Instalação

Clone o repositório:

``` bash
git clone https://github.com/Guilherme-Fadel/SecurePlay.git
cd SecurePlay
```

Instale as dependências:

``` bash
cd frontend
npm install

cd backend
npm install

```

------------------------------------------------------------------------

# Executando o Projeto

## Frontend

Para iniciar o frontend em modo desenvolvimento:

``` bash
npm run dev
```

------------------------------------------------------------------------

## Backend

Para iniciar o backend:

``` bash
npm start
```

Modo desenvolvimento (com watch):

``` bash
npm run start:dev
```

------------------------------------------------------------------------

# Banco de Dados

O projeto utiliza **MySQL**.

Atualmente:

-   O banco **não está disponível em nuvem**
-   É necessário **configurar um banco local** para testes
-   As credenciais devem ser ajustadas no backend conforme o ambiente
    local

------------------------------------------------------------------------



# Scripts Disponíveis

  ``` bash
## Frontend

  Script          Descrição
  --------------- ----------------------------
  npm run dev     Inicia o frontend com Vite
  npm run build   Gera build de produção
```

  ``` bash
## Backend

  Script                Descrição
  --------------------- ------------------------------------------
  npm start             Inicia o servidor NestJS
  npm run start:dev     Inicia em modo desenvolvimento com watch
  npm run start:debug   Inicia em modo debug
  npm run start:prod    Executa build de produção
  npm run build         Compila o projeto
  npm run lint          Executa o ESLint
  npm run format        Formata o código com Prettier
```

------------------------------------------------------------------------

# Requisitos

Antes de rodar o projeto, verifique se você possui instalado:

-   **Node.js \>= 20**
-   **MySQL**
-   **npm**

------------------------------------------------------------------------
