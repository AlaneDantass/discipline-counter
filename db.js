const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Define o caminho para o arquivo de banco de dados SQLite
const dbPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config'), 'studyos.db');

// Cria o banco de dados e as tabelas
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite em:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Tabela de Disciplinas
    db.run(`
      CREATE TABLE IF NOT EXISTS disciplines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        semester TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        manualDays TEXT DEFAULT '[]'
      )
    `);
  });
}

const DatabaseHelper = {
  // Retorna todas as disciplinas
  getDisciplines() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM disciplines', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Converte manualDays de volta para array
          const formatted = rows.map(row => ({
            ...row,
            manualDays: JSON.parse(row.manualDays || '[]')
          }));
          resolve(formatted);
        }
      });
    });
  },

  // Salva ou atualiza a lista de disciplinas
  async saveDisciplines(disciplines) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Limpa a tabela atual para reinserir a lista atualizada
        db.run('DELETE FROM disciplines', [], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const stmt = db.prepare('INSERT INTO disciplines (id, name, semester, startDate, endDate, manualDays) VALUES (?, ?, ?, ?, ?, ?)');
          
          for (const d of disciplines) {
            stmt.run(d.id, d.name, d.semester, d.startDate, d.endDate, JSON.stringify(d.manualDays || []));
          }

          stmt.finalize((err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run('COMMIT');
              resolve(true);
            }
          });
        });
      });
    });
  }
};

module.exports = DatabaseHelper;
