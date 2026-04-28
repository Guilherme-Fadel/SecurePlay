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
# GIT PASSO A PASSO

## Primeira Instalação

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

## Boas Práticas

Sempre que for visualizar ou iniciar uma nova feature realizar:

Exemplo: Branch Main

``` bash
# Verificar se está na branch correta
git status

# Atualizar o repositório
git fetch 

# Atualizar repositório local mais atual
git pull origin main 

# Verificar se teve autualização do packagejson, caso não tiver, desconsiderar codigos abaixo

# Atualizar dependencias front
cd frontend
npm install

# Atualizar dependencias back
cd backend
npm install
```

Fluxo de Feature

``` bash
# Acessar diretório raiz
cd diretorio_raiz

# Adicionar as alterações
git add .

# Commitar as alterações
git commit -m "O que foi realizado"

# Atualizar repositório remoto com as alterações
git push origin developer

# Mudar de branch
git checkout main

# Verificar se está na branch correta
git status

# Juntar novas alterações com o código atual / Se tiver conflito, não FORCE
git merge origin developer

# Subir alterações na branch main
git push origin main

# Verificar se não ficou nada para trás
git status

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
