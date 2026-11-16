const formEsqueci = document.getElementById("form-esqueci");
const campoEmail = document.getElementById("email");
const botaoEnviar = document.getElementById("botao-enviar");
const mensagem = document.getElementById("mensagem");

function mostrar(texto, sucesso = false) {
    mensagem.textContent = texto;
    mensagem.className = `small mt-3 ${sucesso ? "text-success" : "text-danger"}`;
}

formEsqueci.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagem.textContent = "";
    botaoEnviar.disabled = true;

    try {
        const { ok, status, dados } = await apiFetch("/auth/esqueci-senha", {
            metodo: "POST",
            tratarSessao: false,
            corpo: { email: campoEmail.value.trim() }
        });

        if (status === 503) {
            mostrar("Não foi possível enviar o e-mail agora. Tente novamente mais tarde.");
            return;
        }
        if (!ok) {
            mostrar(dados.erro || dados.msg || "Não foi possível solicitar a recuperação.");
            return;
        }

        mostrar("Código enviado! Ele vale por 15 minutos. Redirecionando...", true);
        setTimeout(() => { window.location.href = "redefinir-senha.html"; }, 1500);
    } catch (erro) {
        console.error(erro);
        mostrar("Falha ao acessar a API.");
    } finally {
        botaoEnviar.disabled = false;
    }
});