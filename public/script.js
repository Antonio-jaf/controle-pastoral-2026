const API_URL = '/api';

let filtroAtual = { status: 'todos', pastoral: 'todas' };

async function carregarEstatisticas() {
    const response = await fetch(`${API_URL}/estatisticas`);
    const data = await response.json();
    document.getElementById('totalMembros').textContent = data.total || 0;
    document.getElementById('totalAtivos').textContent = data.ativos || 0;
    document.getElementById('totalInativos').textContent = data.inativos || 0;
}

async function carregarMembros() {
    const params = new URLSearchParams(filtroAtual);
    const response = await fetch(`${API_URL}/membros?${params}`);
    const membros = await response.json();
    
    const tbody = document.getElementById('listaMembros');
    if (membros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum membro encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = membros.map(m => `
        <tr>
            <td>${m.id}</td>
            <td><strong>${escapeHtml(m.nome)}</strong></td>
            <td>${escapeHtml(m.email || '-')}<br><small>${escapeHtml(m.telefone || '')}</small></td>
            <td>${escapeHtml(m.pastoral)}</td>
            <td><span class="badge-status ${m.status}">${m.status === 'ativo' ? 'ATIVO' : 'INATIVO'}</span></td>
            <td class="acoes">
                <button onclick="editarMembro(${m.id})">✏️ Editar</button>
                <button onclick="alternarStatus(${m.id})">🔄 Alternar</button>
                <button onclick="deletarMembro(${m.id})">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
    
    carregarEstatisticas();
}

async function salvarMembro() {
    const id = document.getElementById('editandoId').value;
    const dados = {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        pastoral: document.getElementById('pastoral').value,
        status: document.getElementById('status').value
    };
    
    if (!dados.nome) {
        alert('Nome é obrigatório!');
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
        alert(id ? 'Membro atualizado!' : 'Membro cadastrado!');
        limparFormulario();
        carregarMembros();
    } else {
        alert('Erro ao salvar');
    }
}

async function editarMembro(id) {
    const response = await fetch(`${API_URL}/membros/${id}`);
    const m = await response.json();
    
    document.getElementById('editandoId').value = m.id;
    document.getElementById('nome').value = m.nome;
    document.getElementById('email').value = m.email || '';
    document.getElementById('telefone').value = m.telefone || '';
    document.getElementById('pastoral').value = m.pastoral;
    document.getElementById('status').value = m.status;
    document.getElementById('btnCancelar').style.display = 'block';
    document.getElementById('btnSalvar').textContent = '✏️ Atualizar';
}

async function alternarStatus(id) {
    const response = await fetch(`${API_URL}/membros/${id}/toggle-status`, { method: 'PATCH' });
    if (response.ok) {
        carregarMembros();
    }
}

async function deletarMembro(id) {
    if (confirm('Tem certeza?')) {
        const response = await fetch(`${API_URL}/membros/${id}`, { method: 'DELETE' });
        if (response.ok) {
            carregarMembros();
            if (document.getElementById('editandoId').value == id) limparFormulario();
        }
    }
}

function limparFormulario() {
    document.getElementById('editandoId').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefone').value = '';
    document.getElementById('pastoral').value = 'Liturgia';
    document.getElementById('status').value = 'ativo';
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('btnSalvar').textContent = '➕ Salvar Cadastro';
}

function aplicarFiltros() {
    filtroAtual.status = document.getElementById('filtroStatus').value;
    filtroAtual.pastoral = document.getElementById('filtroPastoral').value;
    carregarMembros();
}

function limparFiltros() {
    document.getElementById('filtroStatus').value = 'todos';
    document.getElementById('filtroPastoral').value = 'todas';
    filtroAtual = { status: 'todos', pastoral: 'todas' };
    carregarMembros();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Eventos e exposição global
document.getElementById('btnSalvar').addEventListener('click', salvarMembro);
document.getElementById('btnCancelar').addEventListener('click', limparFormulario);
document.getElementById('btnFiltrar').addEventListener('click', aplicarFiltros);
document.getElementById('btnLimparFiltros').addEventListener('click', limparFiltros);

window.editarMembro = editarMembro;
window.alternarStatus = alternarStatus;
window.deletarMembro = deletarMembro;

// Inicializar
carregarMembros();