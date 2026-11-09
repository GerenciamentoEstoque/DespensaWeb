const formulario = document.getElementById("form-login");
const mensagemErro = document.getElementById("erro-login");
const botao = document.getElementById("botao-login");

formulario.addEventListener("submit", async (event) => {
    // Impede que o formulário recarregue a página.
    event.preventDefault();

    mensagemErro.textContent = "";
    botao.disabled = true;
    botao.textContent = "Entrando...";

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // Remove uma eventual sessão anterior.
    sessionStorage.removeItem("access_token");

    try {
        const resposta = await fetch(
            "http://127.0.0.1:5000/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemErro.textContent =
                dados.erro || dados.msg || "Não foi possível entrar.";
            return;
        }

        if (typeof dados.access_token !== "string") {
            mensagemErro.textContent = "A API não retornou o token.";
            return;
        }

        sessionStorage.setItem("access_token", dados.access_token);

        window.location.href = "inicio.html";
    } catch (erro) {
        console.error(erro);
        mensagemErro.textContent =
            "Falha ao acessar a API. Confira a conexão e o servidor.";
    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
});