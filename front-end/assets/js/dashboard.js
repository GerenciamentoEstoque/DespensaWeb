const seletorUnidade = document.getElementById("unidade-grafico");
const mensagem = document.getElementById("mensagem-grafico");
const container = document.getElementById("container-grafico");
const resumoGrafico = document.getElementById("resumo-grafico");
const botaoAtualizar = document.getElementById("atualizar-grafico");
const formatoNumero = new Intl.NumberFormat("pt-BR");

let produtosGrafico = [];
let grafico = null;
let carregando = false;

const estilosStatus = {
    ok: { cor: "#36755b", hover: "#24533f", nome: "Estoque normal" },
    acabando: { cor: "#dfa43d", hover: "#bd8424", nome: "Acabando" },
    em_falta: { cor: "#cb6a60", hover: "#ad4e45", nome: "Em falta" }
};

// Os valores ficam visíveis mesmo sem passar o mouse nas barras.
const valoresNasBarras = {
    id: "valoresNasBarras",
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = "600 12px 'Public Sans', sans-serif";
        ctx.textBaseline = "middle";
        chart.getDatasetMeta(0).data.forEach((barra, indice) => {
            const valor = chart.data.datasets[0].data[indice];
            ctx.fillStyle = valor === 0 ? estilosStatus.em_falta.cor : "#294b3d";
            ctx.fillText(formatoNumero.format(valor), barra.x + 9, barra.y);
        });
        ctx.restore();
    }
};

function desenharGrafico() {
    const unidade = seletorUnidade.value;
    const produtos = produtosGrafico.filter(
        (produto) => produto.unidade_medida === unidade
    );

    if (grafico) grafico.destroy();
    resumoGrafico.textContent = `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`;
    container.hidden = false;
    container.style.height = `${Math.max(240, produtos.length * 64 + 44)}px`;
    const fonte = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-body").trim() || "sans-serif";

    grafico = new Chart(document.getElementById("grafico-estoque"), {
        type: "bar",
        plugins: [valoresNasBarras],
        data: {
            labels: produtos.map((produto) => produto.nome),
            datasets: [
                {
                    label: "Estoque atual",
                    data: produtos.map((produto) => produto.quantidade),
                    backgroundColor: produtos.map((produto) => estilosStatus[produto.status]?.cor || estilosStatus.ok.cor),
                    hoverBackgroundColor: produtos.map((produto) => estilosStatus[produto.status]?.hover || estilosStatus.ok.hover),
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 15
                },
                {
                    label: "Mínimo ideal",
                    data: produtos.map((produto) => produto.quantidade_minima),
                    backgroundColor: "#d9e2dc",
                    hoverBackgroundColor: "#b6c9bc",
                    borderRadius: 4,
                    borderSkipped: false,
                    barThickness: 6
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 },
            layout: { padding: { top: 8, right: 48, bottom: 4 } },
            interaction: { mode: "index", intersect: false },
            scales: {
                x: {
                    beginAtZero: true,
                    grace: "20%",
                    border: { display: false },
                    grid: { color: "#edf1ec", drawTicks: false },
                    ticks: {
                        color: "#89958c", padding: 12,
                        maxTicksLimit: 5, precision: 0,
                        font: { family: fonte, size: 11 }
                    }
                },
                y: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        color: "#42564a", padding: 12, autoSkip: false,
                        font: { family: fonte, size: 12, weight: "600" },
                        callback(valor) {
                            const nome = this.getLabelForValue(valor);
                            const limite = this.chart.width < 480 ? 14 : 24;
                            return nome.length > limite ? nome.slice(0, limite - 1) + "…" : nome;
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#203e30", titleColor: "#ffffff",
                    bodyColor: "#e4f0e9", footerColor: "#c4d8ca",
                    padding: 14, cornerRadius: 10, boxPadding: 5,
                    usePointStyle: true,
                    titleFont: { family: fonte, size: 13, weight: "600" },
                    bodyFont: { family: fonte, size: 12 },
                    callbacks: {
                        label(contexto) {
                            return ` ${contexto.dataset.label}: ${formatoNumero.format(contexto.raw)} ${unidade}`;
                        },
                        footer(itens) {
                            return estilosStatus[produtos[itens[0].dataIndex].status]?.nome || "";
                        }
                    }
                }
            }
        }
    });

    // Alternativa textual para leitores de tela, incluindo produtos sem saldo.
    document.getElementById("grafico-estoque").textContent = produtos.map(
        (produto) => `${produto.nome}: ${produto.quantidade} ${unidade}; mínimo ${produto.quantidade_minima} ${unidade}.`
    ).join(" ");
}

async function carregarGrafico() {
    if (carregando) return;
    carregando = true;
    seletorUnidade.disabled = true;
    botaoAtualizar.disabled = true;
    container.setAttribute("aria-busy", "true");
    container.hidden = true;
    mensagem.hidden = false;
    mensagem.textContent = "Carregando seu estoque…";
    resumoGrafico.textContent = "Aguardando dados";
    const token = sessionStorage.getItem("access_token");

    try {
        if (!token) {
            mensagem.textContent = "Entre na sua conta para visualizar o estoque.";
            return;
        }
        const resposta = await fetch("http://127.0.0.1:5000/dashboard", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (resposta.status === 401 || resposta.status === 422) {
            sessionStorage.removeItem("access_token");
            mensagem.textContent = "Sua sessão expirou. Entre novamente para continuar.";
            return;
        }
        const dados = await resposta.json();
        if (!resposta.ok) {
            mensagem.textContent = dados.erro || dados.msg || "Não foi possível carregar o estoque.";
            return;
        }
        if (!Array.isArray(dados.grafico)) {
            mensagem.textContent = "Não foi possível exibir os dados recebidos.";
            return;
        }
        produtosGrafico = dados.grafico;
        if (!produtosGrafico.length) {
            resumoGrafico.textContent = "0 produtos";
            mensagem.textContent = "Seu gráfico começa com o primeiro produto cadastrado.";
            return;
        }
        if (typeof Chart === "undefined") {
            mensagem.textContent = "O gráfico não carregou. Confira sua conexão e atualize a página.";
            return;
        }
        const unidadeAnterior = seletorUnidade.value;
        const unidades = [...new Set(produtosGrafico.map((produto) => produto.unidade_medida))];
        seletorUnidade.replaceChildren();
        for (const unidade of unidades) {
            const opcao = document.createElement("option");
            opcao.value = unidade;
            opcao.textContent = unidade === "unidade" ? "Unidades" : unidade;
            seletorUnidade.appendChild(opcao);
        }
        if (unidades.includes(unidadeAnterior)) seletorUnidade.value = unidadeAnterior;
        desenharGrafico();
        mensagem.hidden = true;
        seletorUnidade.disabled = false;
    } catch (erro) {
        console.error(erro);
        container.hidden = true;
        mensagem.hidden = false;
        mensagem.textContent = "Não foi possível carregar o estoque. Tente atualizar novamente.";
    } finally {
        carregando = false;
        botaoAtualizar.disabled = false;
        container.setAttribute("aria-busy", "false");
    }
}

seletorUnidade.addEventListener("change", desenharGrafico);
botaoAtualizar.addEventListener("click", carregarGrafico);
carregarGrafico();
