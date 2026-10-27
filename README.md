# DespensaWeb

Projeto de gerenciamento de estoque de uma despensa/restaurante, com API REST em Python e páginas HTML para cadastro, consulta de produtos, categorias e movimentações.

O backend utiliza Flask, SQLAlchemy ORM e SQLite. A autenticação usa JWT, as senhas são armazenadas como hash e a recuperação de senha utiliza um token temporário enviado por e-mail.

## Estado atual

- API com cadastro de usuários, login, alteração de perfil e senha e recuperação de acesso.
- Cadastro, consulta, edição e exclusão de categorias e produtos, com validações.
- Registro de entradas e saídas, com identificação do autor pelo JWT e consulta do histórico por produto ou data.
- Edição de produto preserva o saldo: para alterar estoque de um produto existente, use movimentações.
- Edição e exclusão de movimentações não estão disponíveis. A exclusão de usuários está desativada.
- O frontend é um protótipo HTML/CSS/Bootstrap: os formulários ainda não consomem a API. Navegar para a página inicial não comprova autenticação.

## Tecnologias e dependências

| Componente | Uso |
| --- | --- |
| Python | Backend; ambiente local consultado: Python 3.14.8 |
| Flask | Aplicação e rotas HTTP |
| Flask-SQLAlchemy e SQLAlchemy | Modelos e acesso ao banco por ORM |
| SQLite | Persistência local |
| Flask-JWT-Extended | Emissão e validação dos JWTs |
| Werkzeug | Geração e verificação de hashes de senha |
| itsdangerous | Assinatura e validade do token de recuperação |
| python-dotenv | Leitura do arquivo `.env` |
| HTML, CSS e Bootstrap 5.3.3 | Interface; Bootstrap carregado por CDN |

As versões das dependências diretas estão fixadas em `back-end/requirements.txt`, com base no ambiente local. O arquivo não é um lock completo de dependências transitivas. `smtplib`, `email`, `hashlib`, `hmac` e `sqlite3` fazem parte da biblioteca padrão do Python e não precisam ser instalados com pip.

## Estrutura

```text
DespensaWeb/
├── README.md
├── LICENSE
├── back-end/
│   ├── requirements.txt
│   └── api-flask/
│       ├── .env.example
│       ├── app.py
│       ├── database.py
│       ├── models.py
│       └── routes/
│           ├── auth.py
│           ├── usuarios.py
│           ├── categorias.py
│           ├── produtos.py
│           └── movivmentacoes.py
└── front-end/
    ├── assets/
    │   ├── css/style.css
    │   └── img/fundo.jpg
    └── pages/
        ├── index.html
        ├── cadastro.html
        ├── esqueci-senha.html
        ├── redefinir-senha.html
        ├── inicio.html
        ├── produtos.html
        ├── categorias.html
        ├── movimentacoes.html
        └── configuracoes.html
```

O nome `movivmentacoes.py` corresponde ao arquivo importado atualmente pela aplicação.

## Instalação no Windows (PowerShell)

Execute os comandos a partir da raiz do projeto, com Python instalado e disponível pelo comando `py`:

```powershell
py -m venv venv
.\venv\Scripts\python.exe -m pip install -r .\back-end\requirements.txt
```

Se o ambiente `venv` já existir, use apenas o segundo comando. Esse exemplo usa o executável do ambiente diretamente, dispensando sua ativação no PowerShell. A seção de inicialização abaixo também mostra como ativar o ambiente.

### Configurar o ambiente

Se ainda não existir um `.env`, copie o modelo:

```powershell
Copy-Item .\back-end\api-flask\.env.example .\back-end\api-flask\.env
```

Preserve um `.env` existente. Edite o arquivo copiado e preencha:

| Variável | Finalidade |
| --- | --- |
| `JWT_SECRET_KEY` | Chave secreta para assinar JWTs; necessária para iniciar a API |
| `RESET_TOKEN_SECRET` | Chave independente para tokens de recuperação |
| `SMTP_HOST` | Endereço do servidor SMTP |
| `SMTP_PORT` | Porta do servidor com SSL implícito; padrão do código: `465` |
| `SMTP_EMAIL` | Conta de autenticação SMTP e remetente |
| `SMTP_PASSWORD` | Credencial SMTP ou senha de aplicativo fornecida pelo provedor |

Gere duas chaves diferentes, executando este comando uma vez para cada chave:

```powershell
.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

O envio usa `smtplib.SMTP_SSL`. Um serviço que exija STARTTLS precisa de adaptação no código; mudar somente a porta para `587` não implementa esse protocolo. As configurações SMTP são necessárias para enviar recuperações, mas não para cadastrar usuários ou fazer login.

O arquivo `.env` já é ignorado pelo Git. O `.env.example` contém somente exemplos. A URI do banco, a duração do JWT e o prazo do reset são definidos no código: adicionar variáveis com esses nomes ao `.env` não muda a configuração atual.

### Iniciar a API

Escolha uma das duas opções abaixo. Execute os comandos no PowerShell, na raiz do projeto, depois de instalar as dependências e configurar o `.env`.

#### Opção 1: usar o Python do ambiente sem ativá-lo

```powershell
.\venv\Scripts\python.exe .\back-end\api-flask\app.py
```

O comando tem duas partes:

- `.\venv\Scripts\python.exe` é o interpretador Python do ambiente virtual, onde foram instaladas as dependências do projeto. O prefixo `.\` indica um caminho a partir da pasta atual.
- `.\back-end\api-flask\app.py` é o arquivo Python executado para iniciar a API.

Usar o caminho completo do interpretador permite executar a aplicação com as dependências do `venv` sem precisar ativá-lo.

#### Opção 2: ativar o ambiente virtual primeiro

```powershell
.\venv\Scripts\Activate.ps1
python -m pip install -r .\back-end\requirements.txt
python .\back-end\api-flask\app.py
```

A instalação só precisa ser repetida quando as dependências ainda não estiverem instaladas ou quando o `requirements.txt` mudar.

A ativação ajusta o `PATH` deste terminal para que o comando `python` use o interpretador do `venv`. Normalmente aparece `(venv)` no início do prompt. Para conferir o interpretador selecionado, antes de iniciar a API, execute:

```powershell
python -c "import sys; print(sys.executable)"
```

O caminho deve terminar em `venv\Scripts\python.exe`. Se a política do PowerShell bloquear o `Activate.ps1`, use a opção 1, que dispensa ativação.

As duas opções iniciam a mesma API em `http://127.0.0.1:5000`. Mantenha esse terminal aberto enquanto utilizar a aplicação. Para encerrar o servidor, pressione `Ctrl+C`. Se ativou o ambiente, depois de encerrar o servidor você pode sair dele com:

```powershell
deactivate
```

A ativação vale somente para o terminal atual. Em um novo terminal, ative o ambiente novamente ou use o caminho completo de `python.exe`.

#### Verificar se a API está funcionando

Com o servidor em execução, abra **outro terminal PowerShell** e execute:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/
```

`Invoke-RestMethod` é um comando do PowerShell para fazer requisições HTTP. Neste exemplo, envia uma requisição `GET` para a rota `/` e apresenta a resposta no terminal. Ele serve apenas para verificar o servidor; não inicia a API nem exige ativar o ambiente virtual.

A API retorna este JSON, que o PowerShell converte em um objeto para exibição:

```json
{"mensagem": "API funcionando!"}
```

Você também pode acessar `http://127.0.0.1:5000/` pelo navegador ou fazer a requisição pelo Postman. O endereço `127.0.0.1` se refere ao próprio computador, e `5000` é a porta em que a API está atendendo. Essa URL mostra a resposta da API; as páginas da interface são abertas conforme a seção de frontend abaixo.

O `app.py` inicia com `debug=True`, adequado somente ao desenvolvimento local.

### Banco de dados

As tabelas são criadas automaticamente com `db.create_all()` ao carregar a aplicação. Com a configuração atual, o banco fica em `back-end/api-flask/instance/despensaWeb.db`.

As entidades são `Usuario`, `Categoria`, `Produto` e `Movimentacao`. Cada produto pertence a uma categoria, e cada movimentação referencia um produto e um usuário.

`db.create_all()` cria tabelas ausentes, mas não migra tabelas existentes. Alterações futuras no esquema precisam de migrações. Faça backup do banco antes de modificá-lo.

### Visualizar o frontend

Abra `front-end/pages/index.html` no navegador ou use um servidor estático. Por exemplo, em outro terminal, na raiz:

```powershell
.\venv\Scripts\python.exe -m http.server 5500 --bind 127.0.0.1 --directory .\front-end
```

Acesse `http://127.0.0.1:5500/pages/index.html`. O servidor apenas exibe as telas; ainda é necessário integrar os formulários aos endpoints. O Bootstrap via CDN requer acesso à internet.

## Uso da API

Envie corpos JSON com `Content-Type: application/json`. Nas rotas protegidas, informe:

```http
Authorization: Bearer SEU_ACCESS_TOKEN
```

O JWT expira após 1.200 minutos (20 horas), conforme `JWT_ACCESS_TOKEN_EXPIRES` em `back-end/api-flask/app.py`. O token de recuperação é outro tipo de token e não substitui o JWT no cabeçalho.

### Exemplo completo no PowerShell

Com a API em execução, use dados de teste e um e-mail ainda não cadastrado:

```powershell
$baseUrl = "http://127.0.0.1:5000"

$cadastro = @{
    nome = "Usuario de teste"
    email = "teste@example.com"
    senha = "SenhaDeTeste123!"
} | ConvertTo-Json

Invoke-RestMethod "$baseUrl/usuarios/cadastrar" -Method Post `
    -ContentType "application/json" -Body $cadastro

$credenciais = @{
    email = "teste@example.com"
    senha = "SenhaDeTeste123!"
} | ConvertTo-Json

$login = Invoke-RestMethod "$baseUrl/auth/login" -Method Post `
    -ContentType "application/json" -Body $credenciais

$cabecalhos = @{ Authorization = "Bearer $($login.access_token)" }

$categoria = Invoke-RestMethod "$baseUrl/categorias/cadastrar" `
    -Method Post -Headers $cabecalhos -ContentType "application/json" `
    -Body (@{ nome = "Alimentos" } | ConvertTo-Json)

$produtoDados = @{
    nome = "Arroz"
    quantidade = 0
    quantidade_minima = 2
    unidade_medida = "kg"
    categoria_id = $categoria.id
} | ConvertTo-Json

$produto = Invoke-RestMethod "$baseUrl/produtos/cadastrar" `
    -Method Post -Headers $cabecalhos -ContentType "application/json" `
    -Body $produtoDados

$entrada = @{
    tipo = "entrada"
    quantidade = 10
    produto_id = $produto.id
    observacao = "Compra inicial"
} | ConvertTo-Json

Invoke-RestMethod "$baseUrl/movimentacoes/cadastrar" `
    -Method Post -Headers $cabecalhos -ContentType "application/json" `
    -Body $entrada

Invoke-RestMethod "$baseUrl/produtos/buscar/$($produto.id)" `
    -Headers $cabecalhos
```

O produto deve terminar com saldo `10`. Para registrar uma saída, envie outro corpo com `tipo: "saida"`. O servidor obtém o autor do JWT; não é necessário enviar `usuario_id`.

### Rotas disponíveis

Todas as rotas abaixo exigem JWT, exceto as marcadas como públicas.

| Método | Rota | Finalidade | Acesso |
| --- | --- | --- | --- |
| GET | `/` | Verificar funcionamento | Público |
| POST | `/usuarios/cadastrar` | Criar usuário | Público |
| POST | `/auth/login` | Obter JWT | Público |
| POST | `/auth/esqueci-senha` | Solicitar recuperação | Público |
| POST | `/auth/redefinir-senha` | Redefinir senha com token | Público |
| PUT | `/auth/alterar-senha` | Alterar a própria senha | JWT |
| GET | `/usuarios/listar` | Listar usuários | JWT |
| GET | `/usuarios/buscar/<id>` | Consultar usuário por ID | JWT |
| PUT | `/usuarios/atualizar` | Alterar nome e e-mail do usuário autenticado | JWT |
| GET | `/categorias/listar` | Listar categorias | JWT |
| GET | `/categorias/buscar/<id>` | Consultar categoria | JWT |
| POST | `/categorias/cadastrar` | Criar categoria | JWT |
| PUT | `/categorias/atualizar/<id>` | Editar categoria | JWT |
| DELETE | `/categorias/excluir/<id>` | Excluir categoria sem produtos | JWT |
| GET | `/produtos/listar` | Listar produtos | JWT |
| GET | `/produtos/buscar/<id>` | Consultar produto | JWT |
| GET | `/produtos/buscar/categoria/<categoria_id>` | Filtrar por categoria | JWT |
| GET | `/produtos/buscar/nome/<nome>` | Filtrar por parte do nome | JWT |
| POST | `/produtos/cadastrar` | Criar produto | JWT |
| PUT | `/produtos/atualizar/<id>` | Editar dados do produto, preservando saldo | JWT |
| DELETE | `/produtos/excluir/<id>` | Excluir produto sem movimentações | JWT |
| GET | `/movimentacoes/listar` | Listar histórico | JWT |
| GET | `/movimentacoes/buscar/<id>` | Consultar movimentação | JWT |
| GET | `/movimentacoes/buscar/produto/<produto_id>` | Filtrar por produto | JWT |
| GET | `/movimentacoes/buscar/data-inicial/<data_inicial>` | Filtrar a partir da data, inclusive | JWT |
| GET | `/movimentacoes/buscar/data-final/<data_final>` | Filtrar até a data, inclusive | JWT |
| POST | `/movimentacoes/cadastrar` | Registrar entrada ou saída | JWT |

Use datas no formato `AAAA-MM-DD`. As buscas de histórico por data inicial e final são endpoints separados.

### Corpos das operações principais

| Operação | Campos JSON |
| --- | --- |
| Cadastro de usuário | `nome`, `email`, `senha` (8 a 128 caracteres) |
| Login | `email`, `senha` |
| Atualização do perfil | `nome`, `email` |
| Alteração de senha | `senha_atual`, `nova_senha`, `confirmacao_senha` |
| Solicitação de recuperação | `email` |
| Redefinição de senha | `token`, `nova_senha` |
| Cadastro/edição de categoria | `nome` |
| Cadastro de produto | `nome`, `quantidade`, `quantidade_minima`, `unidade_medida`, `categoria_id` |
| Edição de produto | `nome`, `quantidade_minima`, `unidade_medida`, `categoria_id` |
| Movimentação | `tipo`, `quantidade`, `produto_id`; `observacao` opcional |

As rotas PUT de perfil, produto e categoria exigem todos os campos listados para a operação. A edição de produto ignora um eventual campo `quantidade` enviado no JSON.

### Recuperação de senha

1. Envie `POST /auth/esqueci-senha` com o e-mail cadastrado.
2. Copie o token recebido no corpo do e-mail. A implementação envia um código/token, não um link de redefinição.
3. Envie `POST /auth/redefinir-senha` com `token` e `nova_senha`.
4. Faça login com a nova senha para obter um JWT.

O token de recuperação expira em 15 minutos e fica inválido após uma alteração bem-sucedida da senha. A nova senha deve ter pelo menos 8 caracteres e ser diferente da atual. A alteração autenticada também exige a senha atual e a confirmação da nova senha.

Respostas comuns: `200` para sucesso, `201` para criação, `400` para dados inválidos ou estoque insuficiente, `401` para credenciais inválidas/JWT ausente ou expirado, `404` para recurso ou resultado de busca ausente, `409` para conflitos e `503` para falha no envio de e-mail. Alguns erros de JWT são retornados como `422` pela extensão.

## Regras de estoque implementadas

- Tipos aceitos: `entrada` e `saida`.
- Quantidade de movimentação: inteiro maior que zero.
- A data da movimentação é preenchida automaticamente com a data local do servidor no momento da criação.
- Saldo inicial e quantidade mínima do produto: inteiros maiores ou iguais a zero.
- Unidades aceitas: `unidade`, `kg`, `g`, `l`, `ml`. Mesmo para peso e volume, os campos atuais aceitam somente inteiros.
- Produto e categoria devem existir nas operações que os referenciam.
- Uma saída individual é rejeitada quando excede o saldo consultado.
- O ajuste do saldo e a inclusão da movimentação são confirmados pelo mesmo `commit`.
- Categorias com produtos e produtos com movimentações não podem ser excluídos.
- O saldo inicial informado no cadastro de produto não gera automaticamente uma movimentação. Para registrar a origem do estoque, cadastre com zero e faça uma entrada.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
