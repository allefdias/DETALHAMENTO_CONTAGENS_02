// COLE AQUI A SUA URL DO GOOGLE APPS SCRIPT
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzavzMJiuJAgZEoixPnSWQPSz-_XwE2bZgWKznjAt3b0XK9d4uiOE6n6oBhWXw2JFn5hw/exec";
let todosRegistros = [];

// Variáveis para armazenar as instâncias dos gráficos
let chartMensalInstancia = null;
let chartSetorInstancia = null;

/* ---------------- INITIALIZATION ---------------- */
document.addEventListener("DOMContentLoaded", () => {
    verificarTema(); // Carrega a preferência de Modo Escuro salva no navegador
    carregarDados();
});

/* ---------------- MODO ESCURO ---------------- */
function verificarTema() {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btnDarkMode').innerHTML = '☀️ Claro';
        Chart.defaults.color = '#e2e8f0'; 
    } else {
        Chart.defaults.color = '#666'; 
    }
}

function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('btnDarkMode');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('tema', 'dark');
        btn.innerHTML = '☀️ Claro';
        Chart.defaults.color = '#e2e8f0';
    } else {
        localStorage.setItem('tema', 'light');
        btn.innerHTML = '🌙 Escuro';
        Chart.defaults.color = '#666';
    }
    
    // Atualiza as cores dos gráficos instantaneamente
    if (chartMensalInstancia) chartMensalInstancia.update();
    if (chartSetorInstancia) {
        chartSetorInstancia.data.datasets[0].borderColor = body.classList.contains('dark-mode') ? '#2d3748' : '#ffffff';
        chartSetorInstancia.update();
    }
}

/* ---------------- FETCH DATA ---------------- */
async function carregarDados() {
    const loading = document.getElementById("loading");
    const dashboard = document.getElementById("dashboard");

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            todosRegistros = data;
            popularDropdowns(data);
            setAtalhoData("este_mes");
        } else {
            console.error("Resposta recebida do Apps Script:", data);
            if (data && data.message) {
                alert("⚠️ Erro retornado pela planilha: " + data.message);
            } else {
                alert("⚠️ O script não retornou uma lista válida.");
            }
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        alert("❌ Erro de conexão com a URL do Apps Script.");
    } finally {
        loading.style.display = "none";
        dashboard.style.display = "block";
    }
}

/* ---------------- POPULAR DROPDOWNS DE FILTRO ---------------- */
function popularDropdowns(registros) {
    const selectSetor = document.getElementById("filtroSetor");
    const selectFunc = document.getElementById("filtroFuncionario");

    const setores = [...new Set(registros.map(r => r.setor))].sort();
    const funcionarios = [...new Set(registros.map(r => r.funcionario))].filter(Boolean).sort();

    setores.forEach(setor => {
        const opt = document.createElement("option");
        opt.value = setor;
        opt.textContent = setor;
        selectSetor.appendChild(opt);
    });

    funcionarios.forEach(func => {
        const opt = document.createElement("option");
        opt.value = func;
        opt.textContent = func;
        selectFunc.appendChild(opt);
    });
}

/* ---------------- ATALHOS DE DATA ---------------- */
function setAtalhoData(tipo) {
    const hoje = new Date();
    const inputInicio = document.getElementById("dataInicio");
    const inputFim = document.getElementById("dataFim");

    inputFim.value = formatarDataInput(hoje);

    if (tipo === "este_mes") {
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inputInicio.value = formatarDataInput(primeiroDiaMes);
    } else if (tipo === "30_dias") {
        const data30 = new Date();
        data30.setDate(hoje.getDate() - 30);
        inputInicio.value = formatarDataInput(data30);
    } else if (tipo === "60_dias") {
        const data60 = new Date();
        data60.setDate(hoje.getDate() - 60);
        inputInicio.value = formatarDataInput(data60);
    } else if (tipo === "todos") {
        inputInicio.value = "";
        inputFim.value = "";
    }

    aplicarFiltros();
}

/* ---------------- APLICAR FILTROS ---------------- */
function aplicarFiltros() {
    const dataInicioStr = document.getElementById("dataInicio").value;
    const dataFimStr = document.getElementById("dataFim").value;
    const setorSel = document.getElementById("filtroSetor").value;
    const funcSel = document.getElementById("filtroFuncionario").value;
    const entradaSel = document.getElementById("filtroEntrada") ? document.getElementById("filtroEntrada").value.trim().toLowerCase() : "";
    const saidaSel = document.getElementById("filtroSaida") ? document.getElementById("filtroSaida").value.trim().toLowerCase() : "";

    const dtInicio = dataInicioStr ? new Date(dataInicioStr + "T00:00:00") : null;
    const dtFim = dataFimStr ? new Date(dataFimStr + "T23:59:59") : null;

    const filtrados = todosRegistros.filter(reg => {
        const regDate = parseDataBR(reg.data);

        if (dtInicio && regDate < dtInicio) return false;
        if (dtFim && regDate > dtFim) return false;
        if (setorSel && reg.setor !== setorSel) return false;
        if (funcSel && reg.funcionario !== funcSel) return false;

        if (entradaSel) {
            const hEntrada = String(reg.entrada || reg.horario || "").toLowerCase();
            if (!hEntrada.includes(entradaSel)) return false;
        }

        if (saidaSel) {
            const hSaida = String(reg.saida || "").toLowerCase();
            if (!hSaida.includes(saidaSel)) return false;
        }

        return true;
    });

    atualizarDashboard(filtrados);
}

function limparFiltros() {
    document.getElementById("filtroSetor").value = "";
    document.getElementById("filtroFuncionario").value = "";
    if (document.getElementById("filtroEntrada")) document.getElementById("filtroEntrada").value = "";
    if (document.getElementById("filtroSaida")) document.getElementById("filtroSaida").value = "";
    setAtalhoData("todos");
}

/* ---------------- ATUALIZAR INTERFACE ---------------- */
function atualizarDashboard(dados) {
    const totalExames = dados.reduce((acc, r) => acc + (r.qtdExames || 0), 0);
    const funcionariosUnicos = [...new Set(dados.map(r => r.funcionario))].filter(Boolean);
    const setoresUnicos = [...new Set(dados.map(r => r.setor))].filter(Boolean);
    const media = funcionariosUnicos.length > 0 ? (totalExames / funcionariosUnicos.length).toFixed(1) : 0;

    document.getElementById("kpiTotalExames").innerText = totalExames.toLocaleString("pt-BR");
    document.getElementById("kpiMediaProfissional").innerText = media;
    document.getElementById("kpiTotalSetores").innerText = setoresUnicos.length;
    document.getElementById("kpiTotalFuncionarios").innerText = funcionariosUnicos.length;

    renderizarResumoMensal(dados);
    renderizarResumoSetor(dados);
    renderizarTabelaDetalhada(dados);
}

/* ---------------- LÓGICA DOS GRÁFICOS E TABELAS ---------------- */
function alternarVisualizacao(tipo, btn) {
    const tableDiv = document.getElementById(`view${tipo}Table`);
    const chartDiv = document.getElementById(`view${tipo}Chart`);

    if (tableDiv.style.display !== "none") {
        tableDiv.style.display = "none";
        chartDiv.style.display = "block";
        btn.innerHTML = "🔢 Ver Tabela";
    } else {
        tableDiv.style.display = "block";
        chartDiv.style.display = "none";
        btn.innerHTML = "📊 Ver Gráfico";
    }
}

function renderizarResumoMensal(dados) {
    const container = document.getElementById("viewMensalTable");
    const agrupado = {};

    dados.forEach(r => {
        const dateObj = parseDataBR(r.data);
        if (dateObj) {
            const mesAno = dateObj.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
            const mesAnoFormatted = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
            agrupado[mesAnoFormatted] = (agrupado[mesAnoFormatted] || 0) + r.qtdExames;
        }
    });

    const chaves = Object.keys(agrupado);
    if (chaves.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro encontrado.</p>`;
        atualizarGrafico('chartMensal', [], [], 'bar', 'Exames por Mês');
        return;
    }

    let html = `<table><thead><tr><th>Mês / Ano</th><th class="text-right">Qtd Exames</th></tr></thead><tbody>`;
    chaves.forEach(m => {
        html += `<tr><td>${m}</td><td class="text-right"><strong>${agrupado[m].toLocaleString("pt-BR")}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    atualizarGrafico('chartMensal', chaves, Object.values(agrupado), 'bar', 'Total de Exames');
}

function renderizarResumoSetor(dados) {
    const container = document.getElementById("viewSetorTable");
    const agrupado = {};

    dados.forEach(r => {
        agrupado[r.setor] = (agrupado[r.setor] || 0) + r.qtdExames;
    });

    const chavesOrdenadas = Object.keys(agrupado).sort((a, b) => agrupado[b] - agrupado[a]);

    if (chavesOrdenadas.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro encontrado.</p>`;
        atualizarGrafico('chartSetor', [], [], 'doughnut', 'Exames por Setor');
        return;
    }

    let html = `<table><thead><tr><th>Setor</th><th class="text-right">Qtd Exames</th></tr></thead><tbody>`;
    chavesOrdenadas.forEach(s => {
        html += `<tr><td>${s}</td><td class="text-right"><strong>${agrupado[s].toLocaleString("pt-BR")}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    const valores = chavesOrdenadas.map(k => agrupado[k]);
    atualizarGrafico('chartSetor', chavesOrdenadas, valores, 'doughnut', 'Exames por Setor');
}

function atualizarGrafico(canvasId, labels, data, tipoGrafico, labelName) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (canvasId === 'chartMensal' && chartMensalInstancia) {
        chartMensalInstancia.destroy();
    }
    if (canvasId === 'chartSetor' && chartSetorInstancia) {
        chartSetorInstancia.destroy();
    }

    const paletaCores = [
        '#3182ce', '#38a169', '#805ad5', '#dd6b20', 
        '#e53e3e', '#d69e2e', '#319795', '#cbd5e0'
    ];
    
    const bgColor = tipoGrafico === 'bar' ? '#3182ce' : paletaCores;
    
    // Cor da borda dinâmica baseado no tema atual
    const isDarkMode = document.body.classList.contains('dark-mode');
    const borderDynamicColor = isDarkMode ? '#2d3748' : '#ffffff';

    const config = {
        type: tipoGrafico,
        data: {
            labels: labels,
            datasets: [{
                label: labelName,
                data: data,
                backgroundColor: bgColor,
                borderWidth: 1,
                borderColor: borderDynamicColor,
                borderRadius: tipoGrafico === 'bar' ? 4 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: tipoGrafico !== 'bar', 
                    position: 'right'
                }
            }
        }
    };

    const novoGrafico = new Chart(ctx, config);
    if (canvasId === 'chartMensal') {
        chartMensalInstancia = novoGrafico;
    } else {
        chartSetorInstancia = novoGrafico;
    }
}

/* ---------------- TABELA DETALHADA ---------------- */
function renderizarTabelaDetalhada(dados) {
    const container = document.getElementById("tabelaDetalhadaContainer");

    if (dados.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro para exibir.</p>`;
        return;
    }

    let html = `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Setor</th>
          <th>Funcionário / Profissional</th>
          <th>Horário (Entrada / Saída)</th>
          <th class="text-right">Qtd Exames</th>
        </tr>
      </thead>
      <tbody>
  `;

    const ordenados = [...dados].sort((a, b) => parseDataBR(b.data) - parseDataBR(a.data));

    ordenados.forEach((r, idx) => {
        const obsTexto = r.observacao || r.observacoes || "";
        const temObs = obsTexto.trim().length > 0;

        const btnObsHtml = temObs 
            ? `<button class="btn-obs" title="Ver Observação" onclick="abrirModalObs(${idx})">💬 Obs</button>` 
            : "";

        const horaEntrada = r.entrada || r.horario || "-";
        const horaSaida = r.saida || "-";

        html += `
      <tr>
        <td>${r.data}</td>
        <td>${r.setor}</td>
        <td>${r.funcionario} ${btnObsHtml}</td>
        <td>
          <div><strong>Entrada:</strong> ${horaEntrada}</div>
          <div><strong>Saída:</strong> ${horaSaida}</div>
        </td>
        <td class="text-right"><strong>${r.qtdExames}</strong></td>
      </tr>
    `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    window.dadosAtuaisOrdenados = ordenados;
}

/* ---------------- FUNÇÕES DO MODAL DE OBSERVAÇÕES ---------------- */
function abrirModalObs(index) {
    const registro = window.dadosAtuaisOrdenados[index];
    if (!registro) return;

    const textoObs = registro.observacao || registro.observacoes || "Sem observações cadastradas.";
    document.getElementById("modalObsTexto").innerText = textoObs;
    document.getElementById("modalObs").style.display = "flex";
}

function fecharModalObsDirect() {
    document.getElementById("modalObs").style.display = "none";
}

function fecharModalObs(event) {
    if (event.target.id === "modalObs") {
        fecharModalObsDirect();
    }
}

/* ---------------- HELPERS DE DATA ---------------- */
function parseDataBR(dataStr) {
    if (!dataStr) return null;
    const partes = dataStr.split("/");
    if (partes.length === 3) {
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return null;
}

function formatarDataInput(dateObj) {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dia = String(dateObj.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}
