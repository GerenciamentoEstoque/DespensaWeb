
const listaProdutosBaixos = document.getElementById(
    "lista-produtos-baixos"
);

// Formata os números para o padrão brasileiro
function formatarQuantidade(valor) {

    const quantidade = Number(valor);

    if (!Number.isFinite(quantidade)) {
        return valor ?? "0";
    }

    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 3
    }).format(quantidade);
}


// Cria o elemento HTML de cada produto
function criarItemProdutoBaixo(produto) {

    const item = document.createElement("div");

    item.className =
        "bg-light rounded p-3 mb-2 d-flex justify-content-between align-items-center gap-2";

    const informacoes = document.createElement("div");

    // Nome do produto
    const nome = document.createElement("div");

    nome.className = "fw-semibold small";
    nome.textContent = produto.nome;

    // Quantidade atual e quantidade mínima
    const quantidade = document.createElement("div");

    quantidade.className = "text-muted";
    quantidade.style.fontSize = "0.8rem";

    quantidade.textContent =
        `${formatarQuantidade(produto.quantidade)} ${produto.unidade_medida} · mín. ` +
        `${formatarQuantidade(produto.quantidade_minima)} ${produto.unidade_medida}`;

    informacoes.append(nome, quantidade);

    // Status do produto
    const status = document.createElement("span");

    status.className = produto.status === "em_falta"
        ? "badge badge-soft-danger rounded-pill px-2"
        : "badge badge-soft-warning rounded-pill px-2";

    status.textContent = produto.status === "em_falta"
        ? "Em falta"
        : "Acabando";

    item.append(informacoes, status);

    return item;
}


// Consulta a API e carrega os produtos
async function carregarProdutosBaixos() {

    if (!listaProdutosBaixos) return;

    listaProdutosBaixos.replaceChildren();

    const carregando = document.createElement("p");
    carregando.className = "text-muted small mb-0";
    carregando.textContent = "Carregando produtos...";

    listaProdutosBaixos.appendChild(carregando);

    try {

        // Consulta o dashboard
        const resposta = await apiFetch("/dashboard");

        if (!resposta.ok) {
            throw new Error(
                resposta.dados.erro ||
                resposta.dados.msg ||
                "Falha ao consultar produtos."
            );
        }

        // Recupera a lista de produtos
        const produtos = resposta.dados.produtos_baixos;

        if (!Array.isArray(produtos)) {
            throw new Error(
                "A API não retornou a lista de produtos com estoque baixo."
            );
        }

        listaProdutosBaixos.replaceChildren();

        // Verifica se existem produtos para exibir
        if (produtos.length === 0) {

            const vazio = document.createElement("p");

            vazio.className = "text-muted small mb-0";
            vazio.textContent =
                "Nenhum produto precisa de reposição.";

            listaProdutosBaixos.appendChild(vazio);
            return;
        }

        // Cria um elemento para cada produto
        produtos.forEach((produto) => {

            listaProdutosBaixos.appendChild(
                criarItemProdutoBaixo(produto)
            );

        });

    } catch (erro) {

        console.error(
            "Não foi possível carregar os produtos com estoque baixo:",
            erro
        );

        listaProdutosBaixos.replaceChildren();

        const mensagem = document.createElement("p");

        mensagem.className = "text-danger small mb-0";
        mensagem.textContent =
            "Não foi possível carregar os produtos. Atualize a página.";

        listaProdutosBaixos.appendChild(mensagem);
    }
}


// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", carregarProdutosBaixos);
