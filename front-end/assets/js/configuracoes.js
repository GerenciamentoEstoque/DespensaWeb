exigirLogin();

const formPerfil = document.getElementById("form-perfil");
const campoNome = document.getElementById("perfil-nome");
const campoEmail = document.getElementById("perfil-email");
const botaoPerfil = document.getElementById("botao-perfil");
const mensagemPerfil = document.getElementById("mensagem-perfil");

const formSenha = document.getElementById("form-senha");
const campoSenhaAtual = document.getElementById("senha-atual");
const campoNovaSenha = document.getElementById("nova-senha");
const campoConfirmacao = document.getElementById("confirmacao-senha");
const botaoSenha = document.getElementById("botao-senha");
const mensagemSenha = document.getElementById("mensagem-senha");

function mostrar(elemento, texto, sucesso = false) {
    elemento.textContent = texto;
    elemento.className = `small mt-3 ${sucesso ? "text-success" : "text-danger"}`;
}

// Menu lateral + campos do formulário com os dados reais.
async function iniciar() {
    const usuario = await carregarUsuarioMenu();
    if (usuario) {
        campoNome.value = usuario.nome;
        campoEmail.value = usuario.email;
    } else {
        mostrar(mensagemPerfil, "Não foi possível carregar seus dados.");
    }
}

// ---------- Dados pessoais ----------

formPerfil.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagemPerfil.textContent = "";

    const nome = campoNome.value.trim();
    const email = campoEmail.value.trim();

    if (!nome || !email) {
        mostrar(mensagemPerfil, "Informe nome e e-mail.");
        return;
    }

    botaoPerfil.disabled = true;
    try {
        const { ok, dados } = await apiFetch("/usuarios/atualizar", {
            metodo: "PUT",
            corpo: { nome, email }
        });

        if (!ok) {
            mostrar(mensagemPerfil, dados.erro || dados.msg || "Não foi possível salvar.");
            return;
        }

        mostrar(mensagemPerfil, "Dados atualizados.", true);
        carregarUsuarioMenu(); // atualiza o nome e o e-mail no menu
    } catch (erro) {
        console.error(erro);
        mostrar(mensagemPerfil, "Falha ao acessar a API.");
    } finally {
        botaoPerfil.disabled = false;
    }
});

// ---------- Alterar senha ----------

formSenha.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensagemSenha.textContent = "";

    const senha_atual = campoSenhaAtual.value;
    const nova_senha = campoNovaSenha.value;
    const confirmacao_senha = campoConfirmacao.value;

    if (nova_senha.length < 8 || nova_senha.length > 128) {
        mostrar(mensagemSenha, "A nova senha deve ter de 8 a 128 caracteres.");
        return;
    }
    if (nova_senha === senha_atual) {
        mostrar(mensagemSenha, "A nova senha deve ser diferente da atual.");
        return;
    }
    if (nova_senha !== confirmacao_senha) {
        mostrar(mensagemSenha, "A confirmação não confere com a nova senha.");
        return;
    }

    botaoSenha.disabled = true;
    try {
        // tratarSessao: false, pois senha atual errada devolve 401
        // e não pode deslogar a pessoa.
        const { ok, status, dados } = await apiFetch("/auth/alterar-senha", {
            metodo: "PUT",
            tratarSessao: false,
            corpo: { senha_atual, nova_senha, confirmacao_senha }
        });

        // Token realmente expirado: a extensão JWT responde com "msg".
        if (status === 422 || (status === 401 && dados.msg)) {
            sair();
            return;
        }

        if (!ok) {
            mostrar(mensagemSenha, dados.erro || "Não foi possível alterar a senha.");
            return;
        }

        formSenha.reset();
        mostrar(mensagemSenha, "Senha alterada com sucesso.", true);
    } catch (erro) {
        console.error(erro);
        mostrar(mensagemSenha, "Falha ao acessar a API.");
    } finally {
        botaoSenha.disabled = false;
    }
});

iniciar();