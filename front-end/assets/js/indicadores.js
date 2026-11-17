
async function carregarIndicadores() {

    // 1. Localiza os elementos HTML
    const elementos = {
        total: document.getElementById("total-produtos"),
        ok: document.getElementById("estoque-ok"),
        acabando: document.getElementById("produtos-acabando"),
        falta: document.getElementById("produtos-em-falta")
    };

    // 2. Mostra um valor inicial enquanto carrega
    Object.values(elementos).forEach((elemento) => {
        if (elemento) elemento.textContent = "—";
    });

    try {
        // 3. Consulta a API
        const resposta = await apiFetch("/dashboard");

        // 4. Verifica se a requisição funcionou
        if (!resposta.ok) {
            Object.values(elementos).forEach((elemento) => {
                if (elemento) elemento.textContent = "!";
            });

            console.error("Erro ao carregar indicadores:", resposta.dados);
            return;
        }

        // 5. Recupera os indicadores do JSON
        const indicadores = resposta.dados.indicadores;

        if (!indicadores) {
            throw new Error("A API não retornou os indicadores.");
        }

        // 6. Atualiza os elementos HTML
        elementos.total.textContent =
            indicadores.total_produtos ?? 0;

        elementos.ok.textContent =
            indicadores.estoque_ok ?? 0;

        elementos.acabando.textContent =
            indicadores.acabando ?? 0;

        elementos.falta.textContent =
            indicadores.em_falta ?? 0;

    } catch (erro) {

        console.error("Não foi possível carregar os indicadores:", erro);

        Object.values(elementos).forEach((elemento) => {
            if (elemento) elemento.textContent = "!";
        });
    }
}

// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", carregarIndicadores);
