exigirLogin();

const corpoTabela = document.getElementById("corpo-movimentacoes");
const mensagemLista = document.getElementById("mensagem-lista");
const filtroProduto = document.getElementById("filtro-produto");
const filtroInicial = document.getElementById("filtro-data-inicial");
const filtroFinal = document.getElementById("filtro-data-final");

const modalMovimentacao = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalMovimentacao")
);

const campoProduto = document.getElementById("mov-produto");
const radioEntrada = document.getElementById("tipo-entrada");
const radioSaida = document.getElementById("tipo-saida");
const campoQuantidade = document.getElementById("mov-quantidade");
const campoSaldo = document.getElementById("mov-saldo");
const campoObservacao = document.getElementById("mov-observacao");
const erroMov = document.getElementById("erro-movimentacao");
const botaoSalvar = document.getElementById("botao-salvar-movimentacao");

// Regras de quantidade por unidade de medida.
const CASAS = 3;
const FATOR = 10 ** CASAS;

// Dados da tela, guardados para filtrar sem chamar a API de novo.
let categorias = [];
let produtos = [];
let movimentacoes = [];

document.getElementById("botao-sair").addEventListener("click", (event) => {
    event.preventDefault();
    sair();
});

// ---------- Auxiliares ----------

function unidadeInteira(unidade) {
    return unidade === "unidade";
}

function rotuloUnidade(unidade) {
    return unidadeInteira(unidade) ? "un" : unidade;
}

// A API pode devolver número ou texto: Number() cobre os dois casos.
function formatar(valor) {
    return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: CASAS });
}

function produtoPorId(id) {
    return produtos.find((p) => p.id === id);
}

function nomeDaCategoria(id) {
    const categoria = categorias.find((c) => c.id === id);
    return categoria ? categoria.nome : "—";
}

// Descobre qual campo da resposta guarda a data da movimentação.
function dataDaMovimentacao(mov) {
    return mov.data ?? mov.data_movimentacao ?? mov.data_hora ?? mov.criado_em ?? "";
}

// Converte a data da API em "AAAA-MM-DD", o mesmo formato do <input type="date">.
// Para datas ISO, usa o texto direto, assim o fuso horário não muda o dia.
function chaveData(valor) {
    if (!valor) return "";
    const texto = String(valor);

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        return texto.slice(0, 10);
    }

    // Outros formatos, como "Wed, 30 Sep 2026 00:00:00 GMT".
    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return "";

    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(data.getUTCDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarData(valor) {
    const chave = chaveData(valor);
    if (!chave) return "—";
    const [ano, mes, dia] = chave.split("-");
    return `${dia}/${mes}/${ano}`;
}

function celula(texto, classe) {
    const td = document.createElement("td");
    td.textContent = texto;
    if (classe) td.className = classe;
    return td;
}

// Retorna a mensagem de erro, ou null se a quantidade é válida.
function validarQuantidade(texto, unidade) {
    if (texto === "") {
        return "Informe a quantidade.";
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero) || numero <= 0) {
        return "A quantidade deve ser maior que 0.";
    }

    if (unidadeInteira(unidade)) {
        if (!Number.isInteger(numero)) {
            return "A quantidade deve ser inteira para a unidade \"unidade\".";
        }
    } else if (Math.round(numero * FATOR) / FATOR !== numero) {
        return `A quantidade aceita no máximo ${CASAS} casas decimais.`;
    }

    return null;
}

// ---------- Carregamento ----------

async function carregarCategorias() {
    const { ok, dados } = await apiFetch("/categorias/listar");
    categorias = ok && Array.isArray(dados) ? dados : [];
}

function preencherSelects() {
    const filtroAtual = filtroProduto.value;
    const produtoAtual = campoProduto.value;

    filtroProduto.replaceChildren(new Option("Todos os produtos", ""));
    campoProduto.replaceChildren();

    produtos.forEach((produto) => {
        const unidade = rotuloUnidade(produto.unidade_medida);
        filtroProduto.appendChild(new Option(produto.nome, produto.id));
        campoProduto.appendChild(new Option(
            `${produto.nome} (${formatar(produto.quantidade)} ${unidade})`,
            produto.id
        ));
    });

    // Mantém a escolha anterior depois de recarregar a lista.
    if ([...filtroProduto.options].some((o) => o.value === filtroAtual)) {
        filtroProduto.value = filtroAtual;
    }
    if (produtoAtual && [...campoProduto.options].some((o) => o.value === produtoAtual)) {
        campoProduto.value = produtoAtual;
    }
}

async function carregarProdutos() {
    const { ok, status, dados } = await apiFetch("/produtos/listar");

    if (status === 404) {
        produtos = [];
    } else if (!ok) {
        mensagemLista.textContent =
            dados.erro || dados.msg || "Não foi possível carregar os produtos.";
        return;
    } else {
        produtos = Array.isArray(dados) ? dados : (dados.produtos || []);
    }

    preencherSelects();
}

async function carregarMovimentacoes() {
    const { ok, status, dados } = await apiFetch("/movimentacoes/listar");
    console.log(status, dados);

    if (status === 404) {
        movimentacoes = [];
    } else if (!ok) {
        mensagemLista.textContent =
            dados.erro || dados.msg || "Não foi possível carregar o histórico.";
        return;
    } else {
        movimentacoes = Array.isArray(dados) ? dados : (dados.movimentacoes || []);
    }

    desenharTabela();
}

async function iniciar() {
    try {
        // Categorias e produtos primeiro: o histórico precisa deles para mostrar nomes.
        await carregarCategorias();
        await carregarProdutos();
        await carregarMovimentacoes();
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

    const produtoEscolhido = filtroProduto.value;
    const inicial = filtroInicial.value;
    const final = filtroFinal.value;

    if (inicial && final && inicial > final) {
        mensagemLista.textContent = "A data inicial não pode ser depois da data final.";
        return;
    }

    const visiveis = movimentacoes
        .filter((mov) => {
            const chave = chaveData(dataDaMovimentacao(mov));
            const produtoOk =
                produtoEscolhido === "" ||
                String(mov.produto_id) === produtoEscolhido;
            const inicialOk = !inicial || (chave !== "" && chave >= inicial);
            const finalOk = !final || (chave !== "" && chave <= final);
            return produtoOk && inicialOk && finalOk;
        })
        // Mais recentes primeiro.
        .sort((a, b) => {
            const chaveA = chaveData(dataDaMovimentacao(a));
            const chaveB = chaveData(dataDaMovimentacao(b));
            if (chaveA !== chaveB) return chaveA < chaveB ? 1 : -1;
            return b.id - a.id;
        });

    if (visiveis.length === 0) {
        mensagemLista.textContent = movimentacoes.length === 0
            ? "Nenhuma movimentação registrada."
            : "Nenhuma movimentação encontrada com esses filtros.";
        return;
    }

    visiveis.forEach((mov) => {
        corpoTabela.appendChild(criarLinha(mov));
    });
}

function criarLinha(mov) {
    const linha = document.createElement("tr");

    const produto = produtoPorId(mov.produto_id);
    const unidade = produto ? rotuloUnidade(produto.unidade_medida) : "";
    const entrada = String(mov.tipo).toLowerCase() === "entrada";

    const tdTipo = document.createElement("td");
    const selo = document.createElement("span");
    selo.className = `badge ${entrada ? "badge-soft-success" : "badge-soft-danger"} rounded-pill px-2`;
    selo.textContent = entrada ? "Entrada" : "Saída";
    tdTipo.appendChild(selo);

    const sinal = entrada ? "+" : "−";
    const textoQuantidade = `${sinal}${formatar(mov.quantidade)} ${unidade}`.trim();

    linha.append(
        celula(formatarData(dataDaMovimentacao(mov))),
        celula(produto ? produto.nome : "—", "fw-bold"),
        celula(produto ? nomeDaCategoria(produto.categoria_id) : "—"),
        tdTipo,
        celula(textoQuantidade, entrada ? "text-success" : "text-danger"),
        celula(mov.observacao || "—")
    );
    return linha;
}

filtroProduto.addEventListener("change", desenharTabela);
filtroInicial.addEventListener("change", desenharTabela);
filtroFinal.addEventListener("change", desenharTabela);

// ---------- Registro ----------

// Ajusta o campo de quantidade e o saldo conforme o produto escolhido.
function atualizarProdutoEscolhido() {
    const produto = produtoPorId(Number(campoProduto.value));

    if (!produto) {
        campoSaldo.value = "";
        return;
    }

    campoSaldo.value =
        `${formatar(produto.quantidade)} ${rotuloUnidade(produto.unidade_medida)}`;
    campoQuantidade.step = unidadeInteira(produto.unidade_medida) ? "1" : "any";
}

campoProduto.addEventListener("change", atualizarProdutoEscolhido);

function abrirNova() {
    if (produtos.length === 0) {
        mensagemLista.textContent =
            "Cadastre ao menos um produto antes de registrar movimentações.";
        return;
    }

    campoProduto.selectedIndex = 0;
    radioEntrada.checked = true;
    campoQuantidade.value = "";
    campoObservacao.value = "";
    erroMov.textContent = "";
    atualizarProdutoEscolhido();
    modalMovimentacao.show();
}

async function salvar() {
    erroMov.textContent = "";

    const produto = produtoPorId(Number(campoProduto.value));
    if (!produto) {
        erroMov.textContent = "Escolha um produto.";
        return;
    }

    const tipo = radioSaida.checked ? "saida" : "entrada";

    const erroQuantidade = validarQuantidade(
        campoQuantidade.value, produto.unidade_medida
    );
    if (erroQuantidade) {
        erroMov.textContent = erroQuantidade;
        return;
    }

    const quantidade = Number(campoQuantidade.value);

    // Aviso rápido. Quem decide de verdade é a API, que confere o saldo no servidor.
    if (tipo === "saida" && quantidade > Number(produto.quantidade)) {
        erroMov.textContent =
            `Saída maior que o saldo atual (${formatar(produto.quantidade)} ${rotuloUnidade(produto.unidade_medida)}).`;
        return;
    }

    const corpo = { tipo, quantidade, produto_id: produto.id };
    const observacao = campoObservacao.value.trim();
    if (observacao) {
        corpo.observacao = observacao;
    }

    botaoSalvar.disabled = true;

    try {
        const { ok, dados } = await apiFetch("/movimentacoes/cadastrar", {
            metodo: "POST",
            corpo
        });

        if (!ok) {
            erroMov.textContent =
                dados.erro || dados.msg || "Não foi possível registrar.";
            return;
        }

        document.activeElement.blur();
        modalMovimentacao.hide();

        // O saldo do produto mudou: recarrega os dois.
        await carregarProdutos();
        await carregarMovimentacoes();
    } catch (erro) {
        console.error(erro);
        erroMov.textContent = "Falha ao acessar a API.";
    } finally {
        botaoSalvar.disabled = false;
    }
}

document.getElementById("botao-nova").addEventListener("click", abrirNova);
botaoSalvar.addEventListener("click", salvar);

iniciar();