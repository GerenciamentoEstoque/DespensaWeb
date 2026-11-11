exigirLogin();

const listaCategorias = document.getElementById("lista-categorias");
const mensagemLista = document.getElementById("mensagem-lista");

const modalCategoria = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalCategoria")
);
const modalDelete = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDelete")
);

const tituloModal = document.getElementById("titulo-modal-categoria");
const campoNome = document.getElementById("categoria-nome");
const erroCategoria = document.getElementById("erro-categoria");
const botaoSalvar = document.getElementById("botao-salvar-categoria");

const nomeExcluir = document.getElementById("nome-categoria-excluir");
const erroExclusao = document.getElementById("erro-exclusao");
const botaoExcluir = document.getElementById("botao-confirmar-exclusao");

// null = cadastrando; um número = editando aquela categoria.
let idEditando = null;
let idExcluindo = null;

document.getElementById("botao-sair").addEventListener("click", (event) => {
    event.preventDefault();
    sair();
});

// ---------- Listagem ----------

async function carregar() {
    mensagemLista.textContent = "";

    try {
        const { ok, status, dados } = await apiFetch("/categorias/listar");
        console.log(status, dados);

        listaCategorias.replaceChildren();

        if (status === 404) {
            mensagemLista.textContent = "Nenhuma categoria cadastrada.";
            return;
        }

        if (!ok) {
            mensagemLista.textContent =
                dados.erro || dados.msg || "Não foi possível carregar as categorias.";
            return;
        }

        const categorias = Array.isArray(dados) ? dados : (dados.categorias || []);

        if (categorias.length === 0) {
            mensagemLista.textContent = "Nenhuma categoria cadastrada.";
            return;
        }

        categorias.forEach((categoria) => {
            listaCategorias.appendChild(criarCartao(categoria));
        });
    } catch (erro) {
        console.error(erro);
        mensagemLista.textContent =
            "Falha ao acessar a API. Confira a conexão e o servidor.";
    }
}

function criarCartao(categoria) {
    const coluna = document.createElement("div");
    coluna.className = "col-xl-3 col-lg-4 col-md-6";

    const cartao = document.createElement("div");
    cartao.className = "card p-4 h-100 d-flex flex-column";

    const titulo = document.createElement("h4");
    titulo.className = "mb-3";
    titulo.textContent = categoria.nome;

    const acoes = document.createElement("div");
    acoes.className = "mt-auto d-flex gap-2";

    const editar = document.createElement("button");
    editar.className = "btn btn-sm btn-outline-secondary";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => abrirEdicao(categoria));

    const excluir = document.createElement("button");
    excluir.className = "btn btn-sm btn-outline-danger";
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => abrirExclusao(categoria));

    acoes.append(editar, excluir);
    cartao.append(titulo, acoes);
    coluna.appendChild(cartao);
    return coluna;
}

// ---------- Cadastro e edição ----------

function abrirNova() {
    idEditando = null;
    tituloModal.textContent = "Nova categoria";
    campoNome.value = "";
    erroCategoria.textContent = "";
    modalCategoria.show();
}

function abrirEdicao(categoria) {
    idEditando = categoria.id;
    tituloModal.textContent = "Editar categoria";
    campoNome.value = categoria.nome;
    erroCategoria.textContent = "";
    modalCategoria.show();
}

async function salvar() {
    erroCategoria.textContent = "";

    const nome = campoNome.value.trim();
    if (!nome) {
        erroCategoria.textContent = "Informe o nome da categoria.";
        return;
    }

    botaoSalvar.disabled = true;

    try {
        const resposta = idEditando === null
            ? await apiFetch("/categorias/cadastrar", {
                  metodo: "POST",
                  corpo: { nome }
              })
            : await apiFetch(`/categorias/atualizar/${idEditando}`, {
                  metodo: "PUT",
                  corpo: { nome }
              });

        if (!resposta.ok) {
            erroCategoria.textContent =
                resposta.dados.erro || resposta.dados.msg || "Não foi possível salvar.";
            return;
        }

        modalCategoria.hide();
        await carregar();
    } catch (erro) {
        console.error(erro);
        erroCategoria.textContent = "Falha ao acessar a API.";
    } finally {
        botaoSalvar.disabled = false;
    }
}

// ---------- Exclusão ----------

function abrirExclusao(categoria) {
    idExcluindo = categoria.id;
    nomeExcluir.textContent = categoria.nome;
    erroExclusao.textContent = "";
    modalDelete.show();
}

async function excluir() {
    erroExclusao.textContent = "";
    botaoExcluir.disabled = true;

    try {
        const { ok, dados } = await apiFetch(
            `/categorias/excluir/${idExcluindo}`,
            { metodo: "DELETE" }
        );

        if (!ok) {
            // Ex.: categoria que ainda tem produtos não pode ser excluída.
            erroExclusao.textContent =
                dados.erro || dados.msg || "Não foi possível excluir.";
            return;
        }

        modalDelete.hide();
        await carregar();
    } catch (erro) {
        console.error(erro);
        erroExclusao.textContent = "Falha ao acessar a API.";
    } finally {
        botaoExcluir.disabled = false;
    }
}

document.getElementById("botao-nova").addEventListener("click", abrirNova);
botaoSalvar.addEventListener("click", salvar);
botaoExcluir.addEventListener("click", excluir);

carregar();