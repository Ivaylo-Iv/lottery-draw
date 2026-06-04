const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const {
  dataDir,
  dbFile,
  bootstrapAdminUsername,
  bootstrapAdminPassword,
} = require("./config");

fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbFile);

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });

const getRow = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });

const getAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows || []);
    });
  });

const columnExists = async (tableName, columnName) => {
  const columns = await getAll(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
};

async function initializeDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS number_constraints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      max_number INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS lottery_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      drawn INTEGER NOT NULL DEFAULT 0 CHECK (drawn IN (0, 1)),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)), 
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await columnExists("lottery_numbers", "active"))) {
    await runQuery(
      "ALTER TABLE lottery_numbers ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
    );
  }

  const existingAdmin = await getRow("SELECT id FROM users LIMIT 1");

  if (!existingAdmin && bootstrapAdminUsername && bootstrapAdminPassword) {
    const passwordHash = await bcrypt.hash(bootstrapAdminPassword, 12);

    await runQuery(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [bootstrapAdminUsername, passwordHash],
    );
  }
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAll,
  columnExists,
  initializeDatabase,
};
