exigirLogin();

const corpoTabela = document.getElementById("corpo-produtos");
const mensagemLista = document.getElementById("mensagem-lista");
const filtroCategoria = document.getElementById("filtro-categoria");
const filtroBusca = document.getElementById("filtro-busca");

const modalProduto = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalProduto")
);
const modalDelete = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalDelete")
);

const tituloModal = document.getElementById("titulo-modal-produto");
const campoNome = document.getElementById("produto-nome");
const campoCategoria = document.getElementById("produto-categoria");
const campoUnidade = document.getElementById("produto-unidade");
const grupoQuantidade = document.getElementById("grupo-quantidade");
const campoQuantidade = document.getElementById("produto-quantidade");
const campoMinimo = document.getElementById("produto-minimo");
const avisoSaldo = document.getElementById("aviso-saldo");
const erroProduto = document.getElementById("erro-produto");
const botaoSalvar = document.getElementById("botao-salvar-produto");

const nomeExcluir = document.getElementById("nome-produto-excluir");
const erroExclusao = document.getElementById("erro-exclusao");
const botaoExcluir = document.getElementById("botao-confirmar-exclusao");

// Regras de quantidade por unidade de medida.
const CASAS = 3;
const FATOR = 10 ** CASAS;

// Dados da tela, guardados para filtrar sem chamar a API de novo.
let produtos = [];
let categorias = [];

// null = cadastrando; um número = editando aquele produto.
let idEditando = null;
let produtoEditando = null;
let idExcluindo = null;

document.getElementById("botao-sair").addEventListener("click", (event) => {
    event.preventDefault();
    sair();
});

// ---------- Auxiliares ----------

function unidadeInteira(unidade) {
    return unidade === "unidade";
}

// A API pode devolver número ou texto: Number() cobre os dois casos.
function formatar(valor) {
    return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: CASAS });
}

function rotuloUnidade(unidade) {
    return unidadeInteira(unidade) ? "un" : unidade;
}

function nomeDaCategoria(id) {
    const categoria = categorias.find((c) => c.id === id);
    return categoria ? categoria.nome : "—";
}

// Mesma regra do dashboard no back-end.
function situacao(produto) {
    const quantidade = Number(produto.quantidade);
    const minimo = Number(produto.quantidade_minima);

    if (quantidade === 0) {
        return { texto: "Em falta", classe: "badge-soft-danger" };
    }
    if (quantidade <= minimo) {
        return { texto: "Acabando", classe: "badge-soft-warning" };
    }
    return { texto: "Ok", classe: "badge-soft-success" };
}

function celula(texto, classe) {
    const td = document.createElement("td");
    td.textContent = texto;
    if (classe) td.className = classe;
    return td;
}

// Retorna a mensagem de erro, ou null se o valor é válido.
function validarQuantidade(texto, unidade, rotulo) {
    if (texto === "") {
        return `${rotulo} é obrigatório.`;
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero) || numero < 0) {
        return `${rotulo} deve ser um número, 0 ou maior.`;
    }

    if (unidadeInteira(unidade)) {
        if (!Number.isInteger(numero)) {
            return `${rotulo} deve ser inteiro para a unidade "unidade".`;
        }
    } else if (Math.round(numero * FATOR) / FATOR !== numero) {
        return `${rotulo} aceita no máximo ${CASAS} casas decimais.`;
    }

    return null;
}

// Inteiro para "unidade"; qualquer decimal para as demais.
function atualizarPasso() {
    campoMinimo.step = unidadeInteira(campoUnidade.value) ? "1" : "any";
}

campoUnidade.addEventListener("change", atualizarPasso);

// ---------- Carregamento ----------

async function carregarCategorias() {
    const { ok, dados } = await apiFetch("/categorias/listar");
    categorias = ok && Array.isArray(dados) ? dados : [];

    filtroCategoria.replaceChildren(new Option("Todas as categorias", ""));
    campoCategoria.replaceChildren();

    categorias.forEach((categoria) => {
        filtroCategoria.appendChild(new Option(categoria.nome, categoria.id));
        campoCategoria.appendChild(new Option(categoria.nome, categoria.id));
    });
}

async function carregarProdutos() {
    const { ok, status, dados } = await apiFetch("/produtos/listar");
    console.log(status, dados);

    if (status === 404) {
        produtos = [];
    } else if (!ok) {
        mensagemLista.textContent =
            dados.erro || dados.msg || "Não foi possível carregar os produtos.";
        return;
    } else {
        produtos = Array.isArray(dados) ? dados : (dados.produtos || []);
    }

    desenharTabela();
}

async function iniciar() {
    try {
        // Categorias primeiro: a tabela precisa delas para mostrar os nomes.
        await carregarCategorias();
        await carregarProdutos();
    } catch (erro) {
        console.error(erro);
        mensagemLista.textContent =
            "Falha ao acessar a API. Confira a conexão e o servidor.";
    }
}

// ---------- Tabela e filtros ----------

function desenharTabela() {
    mensagemLista.textContent = "";
    corpoTabela.replaceChildren();

    const categoriaEscolhida = filtroCategoria.value;
    const busca = filtroBusca.value.trim().toLowerCase();

    const visiveis = produtos.filter((produto) => {
        const categoriaOk =
            categoriaEscolhida === "" ||
            String(produto.categoria_id) === categoriaEscolhida;
        const buscaOk = produto.nome.toLowerCase().includes(busca);
        return categoriaOk && buscaOk;
    });

    if (visiveis.length === 0) {
        mensagemLista.textContent = produtos.length === 0
            ? "Nenhum produto cadastrado."
            : "Nenhum produto encontrado com esses filtros.";
        return;
    }

    visiveis.forEach((produto) => {
        corpoTabela.appendChild(criarLinha(produto));
    });
}

function criarLinha(produto) {
    const linha = document.createElement("tr");
    const unidade = rotuloUnidade(produto.unidade_medida);

    const situ = situacao(produto);
    const tdSituacao = document.createElement("td");
    const selo = document.createElement("span");
    selo.className = `badge ${situ.classe} rounded-pill`;
    selo.textContent = situ.texto;
    tdSituacao.appendChild(selo);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "text-end";

    const editar = document.createElement("button");
    editar.className = "btn btn-sm btn-outline-secondary me-1";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => abrirEdicao(produto));

    const excluir = document.createElement("button");
    excluir.className = "btn btn-sm btn-outline-danger";
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => abrirExclusao(produto));

    tdAcoes.append(editar, excluir);

    linha.append(
        celula(produto.nome, "fw-bold"),
        celula(nomeDaCategoria(produto.categoria_id)),
        celula(`${formatar(produto.quantidade)} ${unidade}`),
        celula(`${formatar(produto.quantidade_minima)} ${unidade}`),
        tdSituacao,
        tdAcoes
    );
    return linha;
}

filtroCategoria.addEventListener("change", desenharTabela);
filtroBusca.addEventListener("input", desenharTabela);

// ---------- Cadastro e edição ----------

function abrirNovo() {
    if (categorias.length === 0) {
        mensagemLista.textContent =
            "Cadastre ao menos uma categoria antes de criar produtos.";
        return;
    }
    idEditando = null;
    produtoEditando = null;
    tituloModal.textContent = "Novo produto";
    campoNome.value = "";
    campoCategoria.selectedIndex = 0;
    campoUnidade.value = "unidade";
    campoMinimo.value = 0;
    atualizarPasso();

    // Cadastro sempre com saldo 0: o campo some e o aviso aparece.
    grupoQuantidade.classList.add("d-none");
    avisoSaldo.classList.remove("d-none");

    erroProduto.textContent = "";
    modalProduto.show();
}

function abrirEdicao(produto) {
    idEditando = produto.id;
    produtoEditando = produto;
    tituloModal.textContent = "Editar produto";
    campoNome.value = produto.nome;
    campoCategoria.value = produto.categoria_id;
    campoUnidade.value = produto.unidade_medida;
    campoMinimo.value = Number(produto.quantidade_minima);
    atualizarPasso();

    // Edição: o saldo aparece só para leitura (muda apenas por movimentação).
    grupoQuantidade.classList.remove("d-none");
    avisoSaldo.classList.add("d-none");
    campoQuantidade.value = Number(produto.quantidade);

    erroProduto.textContent = "";
    modalProduto.show();
}

async function salvar() {
    erroProduto.textContent = "";

    const nome = campoNome.value.trim();
    const categoria_id = Number(campoCategoria.value);
    const unidade_medida = campoUnidade.value;

    if (!nome) {
        erroProduto.textContent = "Informe o nome do produto.";
        return;
    }
    if (!campoCategoria.value) {
        erroProduto.textContent = "Escolha uma categoria.";
        return;
    }

    const erroMinimo = validarQuantidade(
        campoMinimo.value, unidade_medida, "O estoque mínimo"
    );
    if (erroMinimo) {
        erroProduto.textContent = erroMinimo;
        return;
    }

    // Não dá para trocar para "unidade" se o saldo atual tem casas decimais.
    if (
        idEditando !== null &&
        unidadeInteira(unidade_medida) &&
        !Number.isInteger(Number(produtoEditando.quantidade))
    ) {
        erroProduto.textContent =
            "O saldo atual tem casas decimais, então a unidade não pode ser \"unidade\".";
        return;
    }

    const quantidade_minima = Number(campoMinimo.value);
    const estaCriando = idEditando === null;
    botaoSalvar.disabled = true;

    try {
        const resposta = estaCriando
            ? await apiFetch("/produtos/cadastrar", {
                  metodo: "POST",
                  corpo: {
                      nome,
                      quantidade: 0, // origem do estoque = primeira entrada
                      quantidade_minima,
                      unidade_medida,
                      categoria_id
                  }
              })
            : await apiFetch(`/produtos/atualizar/${idEditando}`, {
                  metodo: "PUT",
                  corpo: { nome, quantidade_minima, unidade_medida, categoria_id }
              });

        if (!resposta.ok) {
            erroProduto.textContent =
                resposta.dados.erro || resposta.dados.msg || "Não foi possível salvar.";
            return;
        }

        document.activeElement.blur();
        modalProduto.hide();
        await carregarProdutos();

        if (estaCriando) {
            mensagemLista.textContent =
                "Produto criado com saldo 0. Registre a entrada em Movimentações para informar a origem do estoque.";
        }
    } catch (erro) {
        console.error(erro);
        erroProduto.textContent = "Falha ao acessar a API.";
    } finally {
        botaoSalvar.disabled = false;
    }
}

// ---------- Exclusão ----------

function abrirExclusao(produto) {
    idExcluindo = produto.id;
    nomeExcluir.textContent = produto.nome;
    erroExclusao.textContent = "";
    modalDelete.show();
}

async function excluir() {
    erroExclusao.textContent = "";
    botaoExcluir.disabled = true;

    try {
        const { ok, dados } = await apiFetch(
            `/produtos/excluir/${idExcluindo}`,
            { metodo: "DELETE" }
        );

        if (!ok) {
            // Ex.: produto com movimentações não pode ser excluído.
            erroExclusao.textContent =
                dados.erro || dados.msg || "Não foi possível excluir.";
            return;
        }

        document.activeElement.blur();
        modalDelete.hide();
        await carregarProdutos();
    } catch (erro) {
        console.error(erro);
        erroExclusao.textContent = "Falha ao acessar a API.";
    } finally {
        botaoExcluir.disabled = false;
    }
}

document.getElementById("botao-novo").addEventListener("click", abrirNovo);
botaoSalvar.addEventListener("click", salvar);
botaoExcluir.addEventListener("click", excluir);

iniciar();