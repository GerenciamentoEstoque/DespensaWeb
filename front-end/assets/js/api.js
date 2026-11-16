const API_URL = "http://127.0.0.1:5000";
const CHAVE_TOKEN = "access_token";

function obterToken() {
    return sessionStorage.getItem(CHAVE_TOKEN);
}

function sair() {
    sessionStorage.removeItem(CHAVE_TOKEN);
    window.location.href = "index.html";
}

// Chame no topo de toda página interna.
function exigirLogin() {
    if (!obterToken()) {
        window.location.href = "index.html";
    }
}

// Faz a requisição já com o token.
// Retorna { ok, status, dados }.
async function apiFetch(caminho, { metodo = "GET", corpo, tratarSessao = true } = {}) {
    const cabecalhos = {};

    if (corpo !== undefined) {
        cabecalhos["Content-Type"] = "application/json";
    }

    const token = obterToken();
    if (token) {
        cabecalhos["Authorization"] = `Bearer ${token}`;
    }

    const resposta = await fetch(`${API_URL}${caminho}`, {
        method: metodo,
        headers: cabecalhos,
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined
    });

    // Se o corpo não for JSON, devolve objeto vazio em vez de quebrar.
    const dados = await resposta.json().catch(() => ({}));

    // Sessão expirada ou token inválido: volta ao login.
    if (tratarSessao && (resposta.status === 401 || resposta.status === 422)) {
        sair();
    }

    return { ok: resposta.ok, status: resposta.status, dados };
}

// Lê o id do usuário dentro do JWT (o conteúdo do token é codificado, não secreto).
function obterIdDoToken() {
    const token = obterToken();
    if (!token) return null;

    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(payload)).sub;
    } catch {
        return null;
    }
}

// Liga o botão Sair e preenche o menu lateral com o usuário logado.
// Devolve os dados do usuário (ou null se não conseguir carregar).
async function carregarUsuarioMenu() {
    const botaoSair = document.getElementById("botao-sair");
    if (botaoSair && !botaoSair.dataset.ligado) {
        botaoSair.dataset.ligado = "true";
        botaoSair.addEventListener("click", (event) => {
            event.preventDefault();
            sair();
        });
    }

    const id = obterIdDoToken();
    if (!id) return null;

    try {
        const { ok, dados } = await apiFetch(`/usuarios/buscar/${id}`);
        if (!ok) return null;

        const usuario = dados.usuario || dados;
        const nome = document.querySelector(".user-info strong");
        const email = document.querySelector(".user-info .small");
        if (nome) nome.textContent = usuario.nome;
        if (email) email.textContent = usuario.email;
        return usuario;
    } catch (erro) {
        console.error(erro);
        return null;
    }
}