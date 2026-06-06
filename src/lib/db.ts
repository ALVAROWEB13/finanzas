import { Pool } from "pg";
import fs from "fs";
import path from "path";

const dbJsonPath = path.join(process.cwd(), "src", "data", "db.json");

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string; // 'Ingreso' | 'Gasto Extra' | 'Movimiento a Reserva'
  paymentMethod: string; // 'Débito' | 'TC' | 'Efectivo'
  category: string;
  amount: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  item: string;
  assigned: number;
  paid: number;
}

// Initial seed data exactly matching the user's uploaded spreadsheet!
const initialBudgetItems: BudgetItem[] = [
  { id: "b1", category: "Vivienda", item: "Vivienda", assigned: 800000, paid: 550000 },
  { id: "b2", category: "Claro hogar", item: "Claro hogar", assigned: 0, paid: 87865 },
  { id: "b3", category: "Datos movistar", item: "Datos movistar", assigned: 55000, paid: 0 },
  { id: "b4", category: "Gym", item: "Gym", assigned: 79900, paid: 54900 },
  { id: "b5", category: "Transporte", item: "Transporte", assigned: 0, paid: 270625 },
  { id: "b6", category: "Aseo personal", item: "Aseo personal", assigned: 200000, paid: 374100 },
  { id: "b7", category: "Netflix", item: "Netflix", assigned: 26000, paid: 38900 },
  { id: "b8", category: "Google", item: "Google", assigned: 11000, paid: 39900 },
  { id: "b9", category: "Seguro de vida", item: "Seguro de vida", assigned: 0, paid: 19500 },
  { id: "b10", category: "Salidas", item: "Salidas", assigned: 500000, paid: 419249 },
  { id: "b11", category: "Ahorro", item: "Ahorro", assigned: 500000, paid: 0 },
  { id: "b12", category: "Ahorro 1", item: "Ahorro 1", assigned: 200000, paid: 120000 },
  { id: "b13", category: "CREDITO", item: "CREDITO", assigned: 250000, paid: 163842 }
];

const initialTransactions: Transaction[] = [
  { id: "t1", date: "2026-06-01", description: "Ingreso Nómina Base", type: "Ingreso", paymentMethod: "Débito", category: "Ingresos", amount: 5976687 },
  { id: "t2", date: "2026-06-02", description: "Abono Vivienda", type: "Gasto Extra", paymentMethod: "Débito", category: "Vivienda", amount: 550000 },
  { id: "t3", date: "2026-06-02", description: "Pago Claro hogar", type: "Gasto Extra", paymentMethod: "Débito", category: "Claro hogar", amount: 87865 },
  { id: "t4", date: "2026-06-03", description: "Mensualidad Gym", type: "Gasto Extra", paymentMethod: "Débito", category: "Gym", amount: 54900 },
  { id: "t5", date: "2026-06-03", description: "Transportes varios", type: "Gasto Extra", paymentMethod: "Efectivo", category: "Transporte", amount: 270625 },
  { id: "t6", date: "2026-06-04", description: "Mercado y Aseo personal", type: "Gasto Extra", paymentMethod: "Débito", category: "Aseo personal", amount: 374100 },
  { id: "t7", date: "2026-06-04", description: "Suscripción Netflix", type: "Gasto Extra", paymentMethod: "TC", category: "Netflix", amount: 38900 },
  { id: "t8", date: "2026-06-05", description: "Servicios en la nube Google", type: "Gasto Extra", paymentMethod: "TC", category: "Google", amount: 39900 },
  { id: "t9", date: "2026-06-05", description: "Seguro de vida mensual", type: "Gasto Extra", paymentMethod: "Débito", category: "Seguro de vida", amount: 19500 },
  { id: "t10", date: "2026-06-05", description: "Salida fin de semana", type: "Gasto Extra", paymentMethod: "Efectivo", category: "Salidas", amount: 419249 },
  { id: "t11", date: "2026-06-05", description: "Ahorro Nu / Lulo (Abono 1)", type: "Movimiento a Reserva", paymentMethod: "Débito", category: "Ahorro 1", amount: 120000 },
  { id: "t12", date: "2026-06-06", description: "Abono Crédito Bancario", type: "Gasto Extra", paymentMethod: "Débito", category: "CREDITO", amount: 163842 }
];

let pool: Pool | null = null;

const getPool = () => {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
};

// Initialize DB structure
export const initDb = async () => {
  const pgPool = getPool();
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS budget_items (
          id VARCHAR(50) PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          item VARCHAR(100) NOT NULL,
          assigned INT NOT NULL,
          paid INT NOT NULL
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(50) PRIMARY KEY,
          date VARCHAR(50) NOT NULL,
          description VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          category VARCHAR(100) NOT NULL,
          amount INT NOT NULL
        );
      `);

      // Seed if empty
      const budgetRes = await pgPool.query("SELECT COUNT(*) FROM budget_items");
      if (parseInt(budgetRes.rows[0].count) === 0) {
        for (const item of initialBudgetItems) {
          await pgPool.query(
            "INSERT INTO budget_items (id, category, item, assigned, paid) VALUES ($1, $2, $3, $4, $5)",
            [item.id, item.category, item.item, item.assigned, item.paid]
          );
        }
      }

      const txRes = await pgPool.query("SELECT COUNT(*) FROM transactions");
      if (parseInt(txRes.rows[0].count) === 0) {
        for (const tx of initialTransactions) {
          await pgPool.query(
            "INSERT INTO transactions (id, date, description, type, payment_method, category, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [tx.id, tx.date, tx.description, tx.type, tx.paymentMethod, tx.category, tx.amount]
          );
        }
      }
    } catch (err) {
      console.error("Failed to initialize PostgreSQL tables:", err);
    }
  } else {
    // JSON file fallback init
    const dataDir = path.dirname(dbJsonPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dbJsonPath)) {
      fs.writeFileSync(dbJsonPath, JSON.stringify({
        budgetItems: initialBudgetItems,
        transactions: initialTransactions
      }, null, 2));
    }
  }
};

// Read local JSON file
const readJson = () => {
  if (!fs.existsSync(dbJsonPath)) {
    return { budgetItems: initialBudgetItems, transactions: initialTransactions };
  }
  try {
    return JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));
  } catch (err) {
    return { budgetItems: initialBudgetItems, transactions: initialTransactions };
  }
};

// Write local JSON file
const writeJson = (data: { budgetItems: BudgetItem[]; transactions: Transaction[] }) => {
  try {
    fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write JSON DB:", err);
  }
};

// --- DATA ACCESS METHODS ---

export const getTransactions = async (): Promise<Transaction[]> => {
  const pgPool = getPool();
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id, date, description, type, payment_method as "paymentMethod", category, amount FROM transactions ORDER BY date DESC, id DESC'
    );
    return res.rows;
  } else {
    return readJson().transactions;
  }
};

export const getBudgetItems = async (): Promise<BudgetItem[]> => {
  const pgPool = getPool();
  if (pgPool) {
    const res = await pgPool.query(
      "SELECT id, category, item, assigned, paid FROM budget_items ORDER BY id ASC"
    );
    return res.rows;
  } else {
    return readJson().budgetItems;
  }
};

export const addTransaction = async (tx: Transaction): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    // Insert transaction
    await pgPool.query(
      "INSERT INTO transactions (id, date, description, type, payment_method, category, amount) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [tx.id, tx.date, tx.description, tx.type, tx.paymentMethod, tx.category, tx.amount]
    );

    // Update paid amount in budget items if it's an expense
    if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
      const checkRes = await pgPool.query(
        "SELECT COUNT(*) FROM budget_items WHERE category = $1",
        [tx.category]
      );
      const exists = parseInt(checkRes.rows[0].count) > 0;
      if (exists) {
        await pgPool.query(
          "UPDATE budget_items SET paid = paid + $1 WHERE category = $2",
          [tx.amount, tx.category]
        );
        await pgPool.query(
          "UPDATE budget_items SET assigned = $1 WHERE category = $2 AND assigned = 0",
          [tx.amount, tx.category]
        );
      } else {
        await pgPool.query(
          "INSERT INTO budget_items (id, category, item, assigned, paid) VALUES ($1, $2, $3, $4, $5)",
          [`b-${Date.now()}`, tx.category, tx.category, tx.amount, tx.amount]
        );
      }
    }
  } else {
    const data = readJson();
    data.transactions.unshift(tx);

    if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
      let categoryFound = false;
      data.budgetItems = data.budgetItems.map((item: BudgetItem) => {
        if (item.category === tx.category) {
          categoryFound = true;
          return {
            ...item,
            paid: item.paid + tx.amount,
            assigned: item.assigned === 0 ? tx.amount : item.assigned
          };
        }
        return item;
      });

      // If it is a completely new category (custom), dynamically create a budget item for it!
      if (!categoryFound) {
        data.budgetItems.push({
          id: `b-${Date.now()}`,
          category: tx.category,
          item: tx.category,
          assigned: tx.amount,
          paid: tx.amount
        });
      }
    }

    writeJson(data);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    // Fetch transaction to see details before deleting
    const txRes = await pgPool.query(
      "SELECT type, category, amount FROM transactions WHERE id = $1",
      [id]
    );
    if (txRes.rows.length > 0) {
      const tx = txRes.rows[0];
      await pgPool.query("DELETE FROM transactions WHERE id = $1", [id]);

      if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
        await pgPool.query(
          "UPDATE budget_items SET paid = GREATEST(0, paid - $1) WHERE category = $2",
          [tx.amount, tx.category]
        );
      }
    }
  } else {
    const data = readJson();
    const txIndex = data.transactions.findIndex((t: Transaction) => t.id === id);
    if (txIndex !== -1) {
      const tx = data.transactions[txIndex];
      data.transactions.splice(txIndex, 1);

      if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
        data.budgetItems = data.budgetItems.map((item: BudgetItem) => {
          if (item.category === tx.category) {
            return {
              ...item,
              paid: Math.max(0, item.paid - tx.amount)
            };
          }
          return item;
        });
      }

      writeJson(data);
    }
  }
};

export const updateBudgetItem = async (id: string, assigned: number, paid: number): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    await pgPool.query(
      "UPDATE budget_items SET assigned = $1, paid = $2 WHERE id = $3",
      [assigned, paid, id]
    );
  } else {
    const data = readJson();
    data.budgetItems = data.budgetItems.map((item: BudgetItem) => {
      if (item.id === id) {
        return { ...item, assigned, paid };
      }
      return item;
    });
    writeJson(data);
  }
};
