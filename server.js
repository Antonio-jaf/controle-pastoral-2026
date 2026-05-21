const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conectar ao banco SQLite
const db = new sqlite3.Database('./database/pastoral.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite');
        
        // Criar tabela se não existir
        db.run(`
            CREATE TABLE IF NOT EXISTS membros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT,
                telefone TEXT,
                pastoral TEXT NOT NULL,
                status TEXT DEFAULT 'ativo',
                data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err);
            } else {
                console.log('✅ Tabela "membros" verificada/criada');
                // Inserir dados de exemplo se a tabela estiver vazia
                inserirExemploInicial();
            }
        });
    }
});

// Inserir dados de exemplo
function inserirExemploInicial() {
    db.get('SELECT COUNT(*) as total FROM membros', (err, row) => {
        if (err) return;
        if (row.total === 0) {
            const exemplos = [
                ['Antonio Carlos de Oliveira', 'antonio@igreja.com', '(11) 98822-3344', 'Liturgia', 'ativo'],
                ['Lucia Helena Mendes', 'lucia@paroquia.org', '(11) 97755-1122', 'Catequese', 'ativo'],
                ['Roberto da Silva', 'roberto.s@email.com', '(11) 99999-1234', 'Música', 'inativo'],
                ['Mariana Souza', 'mariana@familia.com', '(11) 91234-4321', 'Pastoral Familiar', 'ativo']
            ];
            
            exemplos.forEach(ex => {
                db.run('INSERT INTO membros (nome, email, telefone, pastoral, status) VALUES (?, ?, ?, ?, ?)', ex);
            });
            console.log('✅ Dados de exemplo inseridos');
        }
    });
}

// ============ ROTAS DA API ============

// Listar todos os membros
app.get('/api/membros', (req, res) => {
    const { status, pastoral } = req.query;
    let sql = 'SELECT * FROM membros WHERE 1=1';
    let params = [];
    
    if (status && status !== 'todos') {
        sql += ' AND status = ?';
        params.push(status);
    }
    
    if (pastoral && pastoral !== 'todas') {
        sql += ' AND pastoral = ?';
        params.push(pastoral);
    }
    
    sql += ' ORDER BY id DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Obter um membro específico
app.get('/api/membros/:id', (req, res) => {
    db.get('SELECT * FROM membros WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Criar novo membro
app.post('/api/membros', (req, res) => {
    const { nome, email, telefone, pastoral, status } = req.body;
    
    if (!nome) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
    }
    
    db.run(
        'INSERT INTO membros (nome, email, telefone, pastoral, status) VALUES (?, ?, ?, ?, ?)',
        [nome, email, telefone, pastoral, status || 'ativo'],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                id: this.lastID,
                message: 'Membro cadastrado com sucesso!'
            });
        }
    );
});

// Atualizar membro
app.put('/api/membros/:id', (req, res) => {
    const { nome, email, telefone, pastoral, status } = req.body;
    
    db.run(
        'UPDATE membros SET nome = ?, email = ?, telefone = ?, pastoral = ?, status = ? WHERE id = ?',
        [nome, email, telefone, pastoral, status, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Membro não encontrado' });
                return;
            }
            res.json({ message: 'Membro atualizado com sucesso!' });
        }
    );
});

// Alternar status (ativo/inativo)
app.patch('/api/membros/:id/toggle-status', (req, res) => {
    db.run(
        'UPDATE membros SET status = CASE WHEN status = "ativo" THEN "inativo" ELSE "ativo" END WHERE id = ?',
        [req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Status alterado com sucesso!' });
        }
    );
});

// Deletar membro
app.delete('/api/membros/:id', (req, res) => {
    db.run('DELETE FROM membros WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Membro não encontrado' });
            return;
        }
        res.json({ message: 'Membro removido com sucesso!' });
    });
});

// Estatísticas
app.get('/api/estatisticas', (req, res) => {
    db.get(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
            SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inativos
         FROM membros`,
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        }
    );
});

// Servir o front-end
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});