const formulario = document.getElementById("form-cadastro");
const mensagemErro = document.getElementById("erro-cadastro");
const botao = document.getElementById("botao-cadastro");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    mensagemErro.textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmacao = document.getElementById("confirmacao").value;

    if (!nome || !email || !senha || !confirmacao) {
        mensagemErro.textContent = "Preencha todos os campos.";
        return;
    }

    if (senha.length < 8 || senha.length > 128) {
        mensagemErro.textContent = "A senha deve ter de 8 a 128 caracteres.";
        return;
    }

    if (senha !== confirmacao) {
        mensagemErro.textContent = "As senhas não conferem.";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Criando...";

    try {
        const resposta = await fetch(
            "http://127.0.0.1:5000/usuarios/cadastrar",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, email, senha })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemErro.textContent =
                dados.erro || dados.msg || "Não foi possível cadastrar.";
            return;
        }

        // Cadastro feito: o usuário entra pela tela de login.
        window.location.href = "index.html";
    } catch (erro) {
        console.error(erro);
        mensagemErro.textContent =
            "Falha ao acessar a API. Confira a conexão e o servidor.";
    } finally {
        botao.disabled = false;
        botao.textContent = "Criar conta";
    }
});