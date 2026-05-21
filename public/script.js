const API_URL = '/api';

let membrosData = [];
let filtroAtual = { status: 'todos', pastoral: 'todas', periodo: 'todos', search: '' };

// Elementos
const modal = document.getElementById('modalCadastro');
const toast = document.getElementById('toast');

// Função de notificação
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Carregar estatísticas
async function carregarEstatisticas() {
    const response = await fetch(`${API_URL}/estatisticas`);
    const data = await response.json();
    document.getElementById('totalMembros').textContent = data.total || 0;
    document.getElementById('totalAtivos').textContent = data.ativos || 0;
    document.getElementById('totalInativos').textContent = data.inativos || 0;
}

// Carregar gráfico de pastorais
async function carregarGrafico() {
    const response = await fetch(`${API_URL}/membros`);
    const membros = await response.json();
    
    const pastorais = {};
    membros.forEach(m => {
        pastorais[m.pastoral] = (pastorais[m.pastoral] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(pastorais));
    const container = document.getElementById('graficoPastorais');
    container.innerHTML = '';
    
    for (const [nome, count] of Object.entries(pastorais)) {
        const altura = maxCount > 0 ? (count / maxCount) * 80 : 0;
        container.innerHTML += `
            <div class="barra-item">
                <div class="barra" style="height: ${altura}px; background: linear-gradient(180deg, #3b82b6, #1e4a76)"></div>
                <div class="barra-label">${nome.substring(0, 10)}</div>
                <div class="barra-valor">${count}</div>
            </div>
        `;
    }
    
    document.getElementById('totalPastorais').textContent = Object.keys(pastorais).length;
}

// Carregar cards de pastorais
async function carregarCardsPastorais() {
    const response = await fetch(`${API_URL}/membros`);
    const membros = await response.json();
    
    const pastorais = {};
    membros.forEach(m => {
        pastorais[m.pastoral] = (pastorais[m.pastoral] || 0) + 1;
    });
    
    const container = document.getElementById('pastoraisGrid');
    container.innerHTML = '';
    
    for (const [nome, count] of Object.entries(pastorais)) {
        container.innerHTML += `
            <div class="pastoral-card" onclick="filtrarPorPastoral('${nome}')">
                <i class="fas fa-church"></i>
                <div class="pastoral-count">${count}</div>
                <div class="pastoral-nome">${nome}</div>
            </div>
        `;
    }
}

// Filtrar por pastoral (click no card)
window.filtrarPorPastoral = (pastoral) => {
    document.getElementById('filtroPastoral').value = pastoral;
    filtroAtual.pastoral = pastoral;
    carregarMembros();
    showToast(`Filtrando por: ${pastoral}`, 'success');
};

// Carregar membros com filtros
async function carregarMembros() {
    const params = new URLSearchParams(filtroAtual);
    const response = await fetch(`${API_URL}/membros?${params}`);
    let membros = await response.json();
    membrosData = membros;
    
    // Filtro de busca
    if (filtroAtual.search) {
        membros = membros.filter(m => 
            m.nome.toLowerCase().includes(filtroAtual.search.toLowerCase())
        );
    }
    
    // Filtro de período
    if (filtroAtual.periodo !== 'todos') {
        const dias = parseInt(filtroAtual.periodo);
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        membros = membros.filter(m => {
            if (!m.data_cadastro) return true;
            return new Date(m.data_cadastro) >= dataLimite;
        });
    }
    
    const tbody = document.getElementById('listaMembros');
    document.getElementById('totalRegistros').textContent = membros.length;
    
    if (membros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum membro encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = membros.map(m => `
        <tr>
            <td>${m.id}</td>
            <td><strong>${escapeHtml(m.nome)}</strong></td>
            <td>
                ${m.email ? `<i class="fas fa-envelope"></i> ${escapeHtml(m.email)}<br>` : ''}
                ${m.telefone ? `<i class="fas fa-phone"></i> ${escapeHtml(m.telefone)}` : ''}
            </td>
            <td><i class="fas fa-church"></i> ${escapeHtml(m.pastoral)}</td>
            <td><span class="badge-status ${m.status}">${m.status === 'ativo' ? 'ATIVO' : 'INATIVO'}</span></td>
            <td><small>${m.data_cadastro ? new Date(m.data_cadastro).toLocaleDateString() : '-'}</small></td>
            <td class="acoes">
                <button onclick="editarMembro(${m.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="alternarStatus(${m.id})" title="Alternar Status"><i class="fas fa-exchange-alt"></i></button>
                <button onclick="deletarMembro(${m.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    
    carregarEstatisticas();
    carregarGrafico();
    carregarCardsPastorais();
}

// Salvar membro
async function salvarMembroModal() {
    const id = document.getElementById('editandoIdModal').value;
    const dados = {
        nome: document.getElementById('nomeModal').value.trim(),
        email: document.getElementById('emailModal').value.trim(),
        telefone: document.getElementById('telefoneModal').value.trim(),
        pastoral: document.getElementById('pastoralModal').value,
        status: document.getElementById('statusModal').value
    };
    
    if (!dados.nome) {
        showToast('Nome é obrigatório!', 'error');
        return;
    }
    
    let response;
    if (id) {
        response = await fetch(`${API_URL}/membros/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
    } else {
        response = await fetch(`${API_URL}/membros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
    }
    
    if (response.ok) {
        showToast(id ? 'Membro atualizado!' : 'Membro cadastrado!');
        fecharModal();
        carregarMembros();
    } else {
        showToast('Erro ao salvar', 'error');
    }
}

// Editar membro
window.editarMembro = async (id) => {
    const response = await fetch(`${API_URL}/membros/${id}`);
    const m = await response.json();
    
    document.getElementById('modalTitle').textContent = 'Editar Cadastro';
    document.getElementById('editandoIdModal').value = m.id;
    document.getElementById('nomeModal').value = m.nome;
    document.getElementById('emailModal').value = m.email || '';
    document.getElementById('telefoneModal').value = m.telefone || '';
    document.getElementById('pastoralModal').value = m.pastoral;
    document.getElementById('statusModal').value = m.status;
    
    modal.style.display = 'block';
};

// Alternar status
window.alternarStatus = async (id) => {
    const response = await fetch(`${API_URL}/membros/${id}/toggle-status`, { method: 'PATCH' });
    if (response.ok) {
        showToast('Status alterado!');
        carregarMembros();
    }
};

// Deletar membro
window.deletarMembro = async (id) => {
    if (confirm('Tem certeza que deseja remover este frequentador?')) {
        const response = await fetch(`${API_URL}/membros/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Membro removido!');
            carregarMembros();
        }
    }
};

// Exportar CSV
document.getElementById('btnExportarCSV').onclick = () => {
    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Pastoral', 'Status', 'Data Cadastro'];
    const rows = membrosData.map(m => [
        m.id, m.nome, m.email, m.telefone, m.pastoral, m.status, m.data_cadastro
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `controle_pastoral_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Exportado com sucesso!');
};

// Importar CSV
document.getElementById('btnImportarCSV').onclick = () => {
    document.getElementById('importFile').click();
};

document.getElementById('importFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const text = await file.text();
    const rows = text.split('\n').slice(1);
    
    for (const row of rows) {
        const cols = row.split(',');
        if (cols.length >= 5 && cols[1]) {
            await fetch(`${API_URL}/membros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: cols[1],
                    email: cols[2],
                    telefone: cols[3],
                    pastoral: cols[4],
                    status: cols[5] || 'ativo'
                })
            });
        }
    }
    
    showToast('Importação concluída!');
    carregarMembros();
    e.target.value = '';
};

// Imprimir
document.getElementById('btnImprimir').onclick = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Relatório - Controle Pastoral</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            h1 { color: #1e4a76; }
        </style>
        </head>
        <body>
        <h1>Controle Pastoral - Relatório</h1>
        <p>Data: ${new Date().toLocaleString()}</p>
        <table>
            <tr><th>ID</th><th>Nome</th><th>Email</th><th>Telefone</th><th>Pastoral</th><th>Status</th></tr>
            ${membrosData.map(m => `
                <tr>
                    <td>${m.id}</td>
                    <td>${m.nome}</td>
                    <td>${m.email || '-'}</td>
                    <td>${m.telefone || '-'}</td>
                    <td>${m.pastoral}</td>
                    <td>${m.status}</td>
                </tr>
            `).join('')}
        </table>
        </body>
        </html>
    `);
    printWindow.print();
};

// Tema escuro
document.getElementById('btnTema').onclick = () => {
    document.body.classList.toggle('dark');
    const icon = document.querySelector('#btnTema i');
    if (document.body.classList.contains('dark')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
};

// Modal functions
function abrirModal() {
    document.getElementById('modalTitle').textContent = 'Novo Cadastro';
    document.getElementById('editandoIdModal').value = '';
    document.getElementById('nomeModal').value = '';
    document.getElementById('emailModal').value = '';
    document.getElementById('telefoneModal').value = '';
    document.getElementById('pastoralModal').value = 'Liturgia';
    document.getElementById('statusModal').value = 'ativo';
    modal.style.display = 'block';
}

function fecharModal() {
    modal.style.display = 'none';
}

// Aplicar filtros
function aplicarFiltros() {
    filtroAtual.status = document.getElementById('filtroStatus').value;
    filtroAtual.pastoral = document.getElementById('filtroPastoral').value;
    filtroAtual.periodo = document.getElementById('filtroPeriodo').value;
    carregarMembros();
    showToast('Filtros aplicados!');
}

function limparFiltros() {
    document.getElementById('filtroStatus').value = 'todos';
    document.getElementById('filtroPastoral').value = 'todas';
    document.getElementById('filtroPeriodo').value = 'todos';
    document.getElementById('searchInput').value = '';
    filtroAtual = { status: 'todos', pastoral: 'todas', periodo: 'todos', search: '' };
    carregarMembros();
    showToast('Filtros limpos!');
}

// Busca ao vivo
document.getElementById('searchInput').oninput = (e) => {
    filtroAtual.search = e.target.value;
    carregarMembros();
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Eventos
document.getElementById('btnAbrirModal').onclick = abrirModal;
document.querySelector('.modal-fechar').onclick = fecharModal;
document.getElementById('btnCancelarModal').onclick = fecharModal;
document.getElementById('btnSalvarModal').onclick = salvarMembroModal;
document.getElementById('btnAplicarFiltros').onclick = aplicarFiltros;
document.getElementById('btnLimparFiltros').onclick = limparFiltros;

window.onclick = (event) => {
    if (event.target == modal) fecharModal();
};

// Inicializar
carregarMembros();