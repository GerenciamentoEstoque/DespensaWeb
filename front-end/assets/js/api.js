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