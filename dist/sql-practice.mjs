import { DatabaseSync, constants } from 'node:sqlite';

// Напиши свой SELECT здесь. Таблицы создаются заново при каждом запуске.
const query = "SELECT id, title FROM requests WHERE status = 'open' ORDER BY id";

const db = new DatabaseSync(':memory:');
try {
  db.exec(`
    CREATE TABLE services (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE requests (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      service_id INTEGER REFERENCES services(id)
    );
    INSERT INTO services VALUES (1, 'Ремонт'), (2, 'Уборка'), (3, 'Доставка');
    INSERT INTO requests VALUES (101, 'Замена крана', 'open', 1),
      (102, 'Уборка квартиры', 'closed', 2), (103, 'Настройка роутера', 'open', 1),
      (104, 'Уборка кухни', 'closed', 2);
  `);
  const tables = new Set(['requests', 'services']);
  const functions = new Set(['count', 'sum', 'avg', 'min', 'max', 'coalesce', 'lower', 'upper', 'trim', 'length', 'round']);
  db.setAuthorizer((action, arg1, arg2) => {
    if (action === constants.SQLITE_SELECT) return constants.SQLITE_OK;
    if (action === constants.SQLITE_READ && tables.has(arg1)) return constants.SQLITE_OK;
    if (action === constants.SQLITE_FUNCTION && functions.has(arg2)) return constants.SQLITE_OK;
    return constants.SQLITE_DENY;
  });
  const rows = [];
  for (const row of db.prepare(query).iterate()) {
    rows.push(row);
    if (rows.length >= 100) break;
  }
  console.table(rows);
} finally {
  db.close();
}
