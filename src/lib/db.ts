import { Pool } from "pg";
import fs from "fs";
import path from "path";

const dbJsonPath = path.join(process.cwd(), "src", "data", "db.json");

// --- TYPES ---
export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string; // 'Ingreso' | 'Gasto Extra' | 'Movimiento a Reserva'
  paymentMethod: string; // 'Débito' | 'TC' | 'Efectivo'
  category: string;
  amount: number;
  isFixed: boolean; // Fixed vs Variable
  userId?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  item: string;
  assigned: number;
  paid: number;
  isFixed: boolean; // Fixed vs Variable
  userId?: string;
}

export interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  category: string;
  userId?: string;
}

// Initial seed data with correct Fixed vs Variable classification!
const initialBudgetItems: BudgetItem[] = [];

const initialTransactions: Transaction[] = [];

let pool: Pool | null = null;

const getPool = () => {
  if (!pool) {
    const connectionString = 
      process.env.DATABASE_URL || 
      process.env.POSTGRES_URL || 
      process.env.SUPABASE_DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING;

    if (connectionString) {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      });
    }
  }
  return pool;
};

// Initialize DB structure
export const initDb = async () => {
  const pgPool = getPool();
  if (pgPool) {
    try {
      // Check if table exists before creating to avoid re-seeding bug
      const tableCheck = await pgPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'budget_items'
        )
      `);
      const tableExists = tableCheck.rows[0].exists;

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS budget_items (
          id VARCHAR(50) PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          item VARCHAR(100) NOT NULL,
          assigned NUMERIC(15,2) NOT NULL,
          paid NUMERIC(15,2) NOT NULL,
          is_fixed BOOLEAN DEFAULT false,
          user_id VARCHAR(100) DEFAULT 'default'
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
          amount NUMERIC(15,2) NOT NULL,
          is_fixed BOOLEAN DEFAULT false,
          user_id VARCHAR(100) DEFAULT 'default'
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS credits (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          total_amount NUMERIC(15,2) NOT NULL,
          remaining_amount NUMERIC(15,2) NOT NULL,
          monthly_payment NUMERIC(15,2) NOT NULL,
          total_installments INT NOT NULL,
          paid_installments INT NOT NULL,
          category VARCHAR(100) NOT NULL,
          user_id VARCHAR(100) DEFAULT 'default'
        );
      `);

      // Ensure columns exist on older tables
      await pgPool.query("ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false");
      await pgPool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false");

      // Add user_id column if not exists
      await pgPool.query("ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS user_id VARCHAR(100) DEFAULT 'default'");
      await pgPool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(100) DEFAULT 'default'");
      await pgPool.query("ALTER TABLE credits ADD COLUMN IF NOT EXISTS user_id VARCHAR(100) DEFAULT 'default'");

      // Alter columns to NUMERIC(15, 2)
      await pgPool.query("ALTER TABLE budget_items ALTER COLUMN assigned TYPE NUMERIC(15, 2)");
      await pgPool.query("ALTER TABLE budget_items ALTER COLUMN paid TYPE NUMERIC(15, 2)");
      await pgPool.query("ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(15, 2)");
      await pgPool.query("ALTER TABLE credits ALTER COLUMN total_amount TYPE NUMERIC(15, 2)");
      await pgPool.query("ALTER TABLE credits ALTER COLUMN remaining_amount TYPE NUMERIC(15, 2)");
      await pgPool.query("ALTER TABLE credits ALTER COLUMN monthly_payment TYPE NUMERIC(15, 2)");

      // Seed ONLY if table budget_items did not exist before (first deployment)
      if (!tableExists) {
        for (const item of initialBudgetItems) {
          await pgPool.query(
            "INSERT INTO budget_items (id, category, item, assigned, paid, is_fixed, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [item.id, item.category, item.item, item.assigned, item.paid, item.isFixed, 'default']
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
        transactions: initialTransactions,
        credits: []
      }, null, 2));
    }
  }
};

// Read local JSON file
const readJson = () => {
  if (!fs.existsSync(dbJsonPath)) {
    return { budgetItems: initialBudgetItems, transactions: initialTransactions, credits: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));
    return {
      budgetItems: data.budgetItems || [],
      transactions: data.transactions || [],
      credits: data.credits || []
    };
  } catch (err) {
    return { budgetItems: initialBudgetItems, transactions: initialTransactions, credits: [] };
  }
};

// Write local JSON file
const writeJson = (data: { budgetItems: BudgetItem[]; transactions: Transaction[]; credits?: Credit[] }) => {
  try {
    fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write JSON DB:", err);
  }
};

// --- DATA ACCESS METHODS ---

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const pgPool = getPool();
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id, date, description, type, payment_method as "paymentMethod", category, amount, is_fixed as "isFixed", user_id as "userId" FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC',
      [userId]
    );
    return res.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }));
  } else {
    return (readJson().transactions || []).filter((t: any) => (t.userId || 'default') === userId);
  }
};

export const getBudgetItems = async (userId: string): Promise<BudgetItem[]> => {
  const pgPool = getPool();
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id, category, item, assigned, paid, is_fixed as "isFixed", user_id as "userId" FROM budget_items WHERE user_id = $1 ORDER BY id ASC',
      [userId]
    );
    return res.rows.map(r => ({
      ...r,
      assigned: parseFloat(r.assigned),
      paid: parseFloat(r.paid)
    }));
  } else {
    return (readJson().budgetItems || []).filter((b: any) => (b.userId || 'default') === userId);
  }
};

export const addTransaction = async (tx: Transaction, userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    // Insert transaction
    await pgPool.query(
      "INSERT INTO transactions (id, date, description, type, payment_method, category, amount, is_fixed, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [tx.id, tx.date, tx.description, tx.type, tx.paymentMethod, tx.category, tx.amount, tx.isFixed ?? false, userId]
    );

    // Update paid amount in budget items if it's an expense
    if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
      const checkRes = await pgPool.query(
        "SELECT COUNT(*) FROM budget_items WHERE category = $1 AND user_id = $2",
        [tx.category, userId]
      );
      const exists = parseInt(checkRes.rows[0].count) > 0;
      if (exists) {
        await pgPool.query(
          "UPDATE budget_items SET paid = paid + $1 WHERE category = $2 AND user_id = $3",
          [tx.amount, tx.category, userId]
        );
        await pgPool.query(
          "UPDATE budget_items SET assigned = $1 WHERE category = $2 AND assigned = 0 AND user_id = $3",
          [tx.amount, tx.category, userId]
        );
      } else {
        await pgPool.query(
          "INSERT INTO budget_items (id, category, item, assigned, paid, is_fixed, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [`b-${Date.now()}`, tx.category, tx.category, tx.amount, tx.amount, tx.isFixed ?? false, userId]
        );
      }

      // Automatically update matching credits
      const creditRes = await pgPool.query(
        "SELECT id, total_installments, paid_installments, remaining_amount FROM credits WHERE category = $1 AND user_id = $2",
        [tx.category, userId]
      );
      if (creditRes.rows.length > 0) {
        for (const credit of creditRes.rows) {
          const newPaid = Math.min(parseInt(credit.total_installments), parseInt(credit.paid_installments) + 1);
          const newRemaining = Math.max(0, parseFloat(credit.remaining_amount) - tx.amount);
          await pgPool.query(
            "UPDATE credits SET paid_installments = $1, remaining_amount = $2 WHERE id = $3 AND user_id = $4",
            [newPaid, newRemaining, credit.id, userId]
          );
        }
      }
    }
  } else {
    const data = readJson();
    const newTx = { ...tx, userId };
    data.transactions.unshift(newTx);

    if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
      let categoryFound = false;
      data.budgetItems = data.budgetItems.map((item: BudgetItem) => {
        if (item.category === tx.category && (item.userId || 'default') === userId) {
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
          paid: tx.amount,
          isFixed: tx.isFixed,
          userId
        });
      }

      // Automatically update matching credits in JSON
      if (data.credits) {
        data.credits = data.credits.map((c: Credit) => {
          if (c.category === tx.category && (c.userId || 'default') === userId) {
            return {
              ...c,
              paidInstallments: Math.min(c.totalInstallments, c.paidInstallments + 1),
              remainingAmount: Math.max(0, c.remainingAmount - tx.amount)
            };
          }
          return c;
        });
      }
    }

    writeJson(data);
  }
};

export const deleteTransaction = async (id: string, userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    // Fetch transaction to see details before deleting
    const txRes = await pgPool.query(
      "SELECT type, category, amount FROM transactions WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (txRes.rows.length > 0) {
      const tx = txRes.rows[0];
      await pgPool.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [id, userId]);

      if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
        await pgPool.query(
          "UPDATE budget_items SET paid = GREATEST(0, paid - $1) WHERE category = $2 AND user_id = $3",
          [parseFloat(tx.amount), tx.category, userId]
        );

        // Rollback credit installments and remaining amount
        const creditRes = await pgPool.query(
          "SELECT id, paid_installments, remaining_amount FROM credits WHERE category = $1 AND user_id = $2",
          [tx.category, userId]
        );
        if (creditRes.rows.length > 0) {
          for (const credit of creditRes.rows) {
            const newPaid = Math.max(0, parseInt(credit.paid_installments) - 1);
            const newRemaining = parseFloat(credit.remaining_amount) + parseFloat(tx.amount);
            await pgPool.query(
              "UPDATE credits SET paid_installments = $1, remaining_amount = $2 WHERE id = $3 AND user_id = $4",
              [newPaid, newRemaining, credit.id, userId]
            );
          }
        }
      }
    }
  } else {
    const data = readJson();
    const txIndex = data.transactions.findIndex((t: Transaction) => t.id === id && (t.userId || 'default') === userId);
    if (txIndex !== -1) {
      const tx = data.transactions[txIndex];
      data.transactions.splice(txIndex, 1);

      if (tx.type === "Gasto Extra" || tx.type === "Movimiento a Reserva") {
        data.budgetItems = data.budgetItems.map((item: BudgetItem) => {
          if (item.category === tx.category && (item.userId || 'default') === userId) {
            return {
              ...item,
              paid: Math.max(0, item.paid - tx.amount)
            };
          }
          return item;
        });

        // Automatically update matching credits in JSON
        if (data.credits) {
          data.credits = data.credits.map((c: Credit) => {
            if (c.category === tx.category && (c.userId || 'default') === userId) {
              return {
                ...c,
                paidInstallments: Math.max(0, c.paidInstallments - 1),
                remainingAmount: c.remainingAmount + tx.amount
              };
            }
            return c;
          });
        }
      }

      writeJson(data);
    }
  }
};

export const updateBudgetItem = async (
  id: string, 
  assigned: number, 
  paid: number, 
  isFixed: boolean,
  category?: string,
  item?: string,
  userId: string = 'default'
): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    const checkRes = await pgPool.query("SELECT COUNT(*) FROM budget_items WHERE id = $1 AND user_id = $2", [id, userId]);
    const exists = parseInt(checkRes.rows[0].count) > 0;
    if (exists) {
      await pgPool.query(
        "UPDATE budget_items SET assigned = $1, paid = $2, is_fixed = $3 WHERE id = $4 AND user_id = $5",
        [assigned, paid, isFixed ?? false, id, userId]
      );
    } else {
      const finalCategory = category || "Otros";
      const finalItem = item || finalCategory;
      await pgPool.query(
        "INSERT INTO budget_items (id, category, item, assigned, paid, is_fixed, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [id, finalCategory, finalItem, assigned, paid, isFixed ?? false, userId]
      );
    }
  } else {
    const data = readJson();
    let found = false;
    data.budgetItems = data.budgetItems.map((itemVal: BudgetItem) => {
      if (itemVal.id === id && (itemVal.userId || 'default') === userId) {
        found = true;
        return { ...itemVal, assigned, paid, isFixed };
      }
      return itemVal;
    });
    if (!found) {
      data.budgetItems.push({
        id,
        category: category || "Otros",
        item: item || category || "Otros",
        assigned,
        paid,
        isFixed,
        userId
      });
    }
    writeJson(data);
  }
};

export const deleteBudgetItem = async (id: string, userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM budget_items WHERE id = $1 AND user_id = $2", [id, userId]);
  } else {
    const data = readJson();
    data.budgetItems = data.budgetItems.filter((item: BudgetItem) => !(item.id === id && (item.userId || 'default') === userId));
    writeJson(data);
  }
};

export const resetDb = async (userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM transactions WHERE user_id = $1", [userId]);
    await pgPool.query("DELETE FROM budget_items WHERE user_id = $1", [userId]);
    await pgPool.query("DELETE FROM credits WHERE user_id = $1", [userId]);
  } else {
    const data = readJson();
    data.budgetItems = (data.budgetItems || []).filter((b: any) => (b.userId || 'default') !== userId);
    data.transactions = (data.transactions || []).filter((t: any) => (t.userId || 'default') !== userId);
    data.credits = (data.credits || []).filter((c: any) => (c.userId || 'default') !== userId);
    writeJson(data);
  }
};

export const getCredits = async (userId: string): Promise<Credit[]> => {
  const pgPool = getPool();
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id, name, total_amount as "totalAmount", remaining_amount as "remainingAmount", monthly_payment as "monthlyPayment", total_installments as "totalInstallments", paid_installments as "paidInstallments", category, user_id as "userId" FROM credits WHERE user_id = $1 ORDER BY id ASC',
      [userId]
    );
    return res.rows.map(r => ({
      ...r,
      totalAmount: parseFloat(r.totalAmount),
      remainingAmount: parseFloat(r.remainingAmount),
      monthlyPayment: parseFloat(r.monthlyPayment),
      totalInstallments: parseInt(r.totalInstallments),
      paidInstallments: parseInt(r.paidInstallments)
    }));
  } else {
    return (readJson().credits || []).filter((c: any) => (c.userId || 'default') === userId);
  }
};

export const addCredit = async (credit: Credit, userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    const checkRes = await pgPool.query("SELECT COUNT(*) FROM credits WHERE id = $1 AND user_id = $2", [credit.id, userId]);
    const exists = parseInt(checkRes.rows[0].count) > 0;
    if (exists) {
      await pgPool.query(
        "UPDATE credits SET name = $1, total_amount = $2, remaining_amount = $3, monthly_payment = $4, total_installments = $5, paid_installments = $6, category = $7 WHERE id = $8 AND user_id = $9",
        [credit.name, credit.totalAmount, credit.remainingAmount, credit.monthlyPayment, credit.totalInstallments, credit.paidInstallments, credit.category, credit.id, userId]
      );
    } else {
      await pgPool.query(
        "INSERT INTO credits (id, name, total_amount, remaining_amount, monthly_payment, total_installments, paid_installments, category, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [credit.id, credit.name, credit.totalAmount, credit.remainingAmount, credit.monthlyPayment, credit.totalInstallments, credit.paidInstallments, credit.category, userId]
      );
    }
  } else {
    const data = readJson();
    if (!data.credits) data.credits = [];
    const newCredit = { ...credit, userId };
    const index = data.credits.findIndex((c: Credit) => c.id === credit.id && (c.userId || 'default') === userId);
    if (index !== -1) {
      data.credits[index] = newCredit;
    } else {
      data.credits.push(newCredit);
    }
    writeJson(data);
  }
};

export const deleteCredit = async (id: string, userId: string): Promise<void> => {
  const pgPool = getPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM credits WHERE id = $1 AND user_id = $2", [id, userId]);
  } else {
    const data = readJson();
    if (!data.credits) data.credits = [];
    data.credits = data.credits.filter((c: Credit) => !(c.id === id && (c.userId || 'default') === userId));
    writeJson(data);
  }
};
