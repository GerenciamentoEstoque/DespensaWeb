const formRedefinir = document.getElementById("form-redefinir");
const campoCodigo = document.getElementById("codigo");
const campoNovaSenha = document.getElementById("nova-senha");
const campoConfirmacao = document.getElementById("confirmacao");
const botaoRedefinir = document.getElementById("botao-redefinir");
const mensagem = document.getElementById("mensagem");

function mostrar(texto, sucesso = false) {
    mensagem.textContent = texto;
    mensagem.className = `small mt-3 ${sucesso ? "text-success" : "text-danger"}`;
}

formRedefinir.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagem.textContent = "";

    const token = campoCodigo.value.trim(); // colar do e-mail costuma trazer espaços
    const nova_senha = campoNovaSenha.value;

    if (nova_senha.length < 8 || nova_senha.length > 128) {
        mostrar("A nova senha deve ter de 8 a 128 caracteres.");
        return;
    }
    if (nova_senha !== campoConfirmacao.value) {
        mostrar("A confirmação não confere com a nova senha.");
        return;
    }

    botaoRedefinir.disabled = true;
    try {
        const { ok, dados } = await apiFetch("/auth/redefinir-senha", {
            metodo: "POST",
            tratarSessao: false,
            corpo: { token, nova_senha }
        });

        if (!ok) {
            mostrar(dados.erro || dados.msg || "Código inválido ou expirado.");
            return;
        }

        mostrar("Senha redefinida! Redirecionando para o login...", true);
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
    } catch (erro) {
        console.error(erro);
        mostrar("Falha ao acessar a API.");
    } finally {
        botaoRedefinir.disabled = false;
    }
});