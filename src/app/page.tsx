"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  X,
  Menu,
  ChevronRight,
  Activity,
  Layers,
  FileText,
  Coins,
  ShieldCheck,
  RotateCcw
} from "lucide-react";

// --- STRICT TYPES ---
type Category =
  | "Vivienda"
  | "Deudas de Consumo"
  | "Tarjetas de Crédito"
  | "Gastos Fijos"
  | "Ahorro / Reserva"
  | "Estilo de Vida / Mercado";

type TransactionType = "Ingreso" | "Gasto Extra" | "Movimiento a Reserva";
type PaymentMethod = "TC" | "Débito" | "Efectivo";

interface BudgetItem {
  id: string;
  category: Category;
  item: string;
  assigned: number;
  paid: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  category: Category;
  amount: number;
}

// --- CONSTANTS ---
const CATEGORIES: Category[] = [
  "Vivienda",
  "Deudas de Consumo",
  "Tarjetas de Crédito",
  "Gastos Fijos",
  "Ahorro / Reserva",
  "Estilo de Vida / Mercado",
];

const CATEGORY_COLORS: Record<Category, string> = {
  "Vivienda": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Deudas de Consumo": "text-red-400 bg-red-500/10 border-red-500/20",
  "Tarjetas de Crédito": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Gastos Fijos": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Ahorro / Reserva": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Estilo de Vida / Mercado": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

// --- CURRENCY UTILITY (Strict es-CO standard, no decimals) ---
const formatCOP = (value: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function TobiramaFinancialOS() {
  // --- MOCK INITIAL STATE ---
  const INITIAL_INCOME = 5976687; // Base Global Income

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    {
      id: "b1",
      category: "Vivienda",
      item: "Cuota Tamarindo",
      assigned: 1427000,
      paid: 1427000,
    },
    {
      id: "b2",
      category: "Deudas de Consumo",
      item: "ADDI / Crédito",
      assigned: 2029023,
      paid: 2029023,
    },
    {
      id: "b3",
      category: "Tarjetas de Crédito",
      item: "Cupo Utilizado",
      assigned: 0,
      paid: 0,
    },
    {
      id: "b4",
      category: "Gastos Fijos",
      item: "Apoyo Madre & Internet",
      assigned: 650000,
      paid: 650000,
    },
    {
      id: "b5",
      category: "Ahorro / Reserva",
      item: "Fondo Nu / Lulo",
      assigned: 587029,
      paid: 587029,
    },
    {
      id: "b6",
      category: "Estilo de Vida / Mercado",
      item: "Gastos Mensuales",
      assigned: 600000,
      paid: 0,
    },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "t1",
      date: "2026-06-01",
      description: "Ingreso Nómina Base",
      type: "Ingreso",
      paymentMethod: "Débito",
      category: "Gastos Fijos",
      amount: 5976687,
    },
    {
      id: "t2",
      date: "2026-06-02",
      description: "Pago Cuota Tamarindo Jaramillo Mora",
      type: "Gasto Extra",
      paymentMethod: "Débito",
      category: "Vivienda",
      amount: 1427000,
    },
    {
      id: "t3",
      date: "2026-06-02",
      description: "Liquidación Crédito ADDI",
      type: "Gasto Extra",
      paymentMethod: "Débito",
      category: "Deudas de Consumo",
      amount: 2029023,
    },
    {
      id: "t4",
      date: "2026-06-03",
      description: "Fondo Nu / Lulo (Ahorro)",
      type: "Movimiento a Reserva",
      paymentMethod: "Débito",
      category: "Ahorro / Reserva",
      amount: 587029,
    },
    {
      id: "t5",
      date: "2026-06-03",
      description: "Servicios e Internet & Apoyo Familiar",
      type: "Gasto Extra",
      paymentMethod: "Débito",
      category: "Gastos Fijos",
      amount: 650000,
    },
  ]);

  // --- UI STATE ---
  const [activeView, setActiveView] = useState<"dashboard" | "budget" | "tracker">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editPaidValue, setEditPaidValue] = useState("");
  const [editAssignedValue, setEditAssignedValue] = useState("");
  const [trackerForm, setTrackerForm] = useState<{
    date: string;
    description: string;
    type: TransactionType;
    paymentMethod: PaymentMethod;
    category: Category;
    amount: string;
  }>({
    date: "2026-06-05",
    description: "",
    type: "Gasto Extra",
    paymentMethod: "Débito",
    category: "Estilo de Vida / Mercado",
    amount: "",
  });

  // --- REACTIVE COMPUTATIONS ---
  // Pocket liquidity calculation: Total incomes in ledger minus total extra expenses, reserve transfers, and pocket allocations
  const pocketLiquidity = useMemo(() => {
    const totalIncomes = transactions
      .filter((t) => t.type === "Ingreso")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpensesAndReserves = transactions
      .filter((t) => t.type === "Gasto Extra" || t.type === "Movimiento a Reserva")
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncomes - totalExpensesAndReserves;
  }, [transactions]);

  // Eradicated debt calculation
  const debtMetrics = useMemo(() => {
    const targetCategories: Category[] = ["Deudas de Consumo", "Tarjetas de Crédito"];
    const debtItems = budgetItems.filter((item) => targetCategories.includes(item.category));
    const totalAssigned = debtItems.reduce((sum, item) => sum + item.assigned, 0);
    const totalPaid = debtItems.reduce((sum, item) => sum + item.paid, 0);

    const percentage = totalAssigned > 0 ? (totalPaid / totalAssigned) * 100 : 100;
    return {
      percentage,
      totalAssigned,
      totalPaid,
      totalPending: Math.max(0, totalAssigned - totalPaid),
    };
  }, [budgetItems]);

  // Credit Card Balance Assessment
  const creditCardMetrics = useMemo(() => {
    const ccItem = budgetItems.find((item) => item.category === "Tarjetas de Crédito");
    const outstanding = ccItem ? Math.max(0, ccItem.assigned - ccItem.paid) : 0;
    return {
      outstanding,
      isFree: outstanding === 0,
    };
  }, [budgetItems]);

  // Output Distribution Matrix
  const distributionMatrix = useMemo(() => {
    return budgetItems.map((item) => {
      const percentage = item.assigned > 0 ? (item.paid / item.assigned) * 100 : 0;
      return {
        ...item,
        percentage: Math.min(100, Math.max(0, percentage)),
        pending: Math.max(0, item.assigned - item.paid),
      };
    });
  }, [budgetItems]);

  // --- HANDLERS ---
  const handleEditBudget = (item: BudgetItem) => {
    setEditingItem(item);
    setEditPaidValue(item.paid.toString());
    setEditAssignedValue(item.assigned.toString());
  };

  const saveBudgetEdit = () => {
    if (!editingItem) return;

    const newPaid = parseInt(editPaidValue) || 0;
    const newAssigned = parseInt(editAssignedValue) || 0;

    // Reactively update budget items
    setBudgetItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id ? { ...item, paid: newPaid, assigned: newAssigned } : item
      )
    );

    // Reactively insert a transaction to adjust cash ledger
    const diff = newPaid - editingItem.paid;
    if (diff !== 0) {
      const adjustmentTx: Transaction = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: `Ajuste pago: ${editingItem.item}`,
        type: diff > 0 ? "Gasto Extra" : "Ingreso",
        paymentMethod: "Débito",
        category: editingItem.category,
        amount: Math.abs(diff),
      };
      setTransactions((prev) => [adjustmentTx, ...prev]);
    }

    setEditingItem(null);
  };

  const handleRegisterTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseInt(trackerForm.amount) || 0;
    if (!trackerForm.description.trim() || amountVal <= 0) return;

    // Add transaction to central state
    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      date: trackerForm.date,
      description: trackerForm.description.trim(),
      type: trackerForm.type,
      paymentMethod: trackerForm.paymentMethod,
      category: trackerForm.category,
      amount: amountVal,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // If transaction is an expense/reserve, reactively update the paid column of the corresponding budget item
    if (trackerForm.type === "Gasto Extra" || trackerForm.type === "Movimiento a Reserva") {
      setBudgetItems((prev) =>
        prev.map((item) => {
          if (item.category === trackerForm.category) {
            // Update the paid amount
            return {
              ...item,
              paid: item.paid + amountVal,
              // If initial assigned is 0, auto-assign this to balance it out if needed
              assigned: item.assigned === 0 ? amountVal : item.assigned,
            };
          }
          return item;
        })
      );
    }

    // Reset Form
    setTrackerForm((prev) => ({
      ...prev,
      description: "",
      amount: "",
    }));
  };

  const handleResetState = () => {
    if (window.confirm("¿Seguro que deseas reiniciar los datos al estado inicial?")) {
      setBudgetItems([
        {
          id: "b1",
          category: "Vivienda",
          item: "Cuota Tamarindo",
          assigned: 1427000,
          paid: 1427000,
        },
        {
          id: "b2",
          category: "Deudas de Consumo",
          item: "ADDI / Crédito",
          assigned: 2029023,
          paid: 2029023,
        },
        {
          id: "b3",
          category: "Tarjetas de Crédito",
          item: "Cupo Utilizado",
          assigned: 0,
          paid: 0,
        },
        {
          id: "b4",
          category: "Gastos Fijos",
          item: "Apoyo Madre & Internet",
          assigned: 650000,
          paid: 650000,
        },
        {
          id: "b5",
          category: "Ahorro / Reserva",
          item: "Fondo Nu / Lulo",
          assigned: 587029,
          paid: 587029,
        },
        {
          id: "b6",
          category: "Estilo de Vida / Mercado",
          item: "Gastos Mensuales",
          assigned: 600000,
          paid: 0,
        },
      ]);
      setTransactions([
        {
          id: "t1",
          date: "2026-06-01",
          description: "Ingreso Nómina Base",
          type: "Ingreso",
          paymentMethod: "Débito",
          category: "Gastos Fijos",
          amount: 5976687,
        },
        {
          id: "t2",
          date: "2026-06-02",
          description: "Pago Cuota Tamarindo Jaramillo Mora",
          type: "Gasto Extra",
          paymentMethod: "Débito",
          category: "Vivienda",
          amount: 1427000,
        },
        {
          id: "t3",
          date: "2026-06-02",
          description: "Liquidación Crédito ADDI",
          type: "Gasto Extra",
          paymentMethod: "Débito",
          category: "Deudas de Consumo",
          amount: 2029023,
        },
        {
          id: "t4",
          date: "2026-06-03",
          description: "Fondo Nu / Lulo (Ahorro)",
          type: "Movimiento a Reserva",
          paymentMethod: "Débito",
          category: "Ahorro / Reserva",
          amount: 587029,
        },
        {
          id: "t5",
          date: "2026-06-03",
          description: "Servicios e Internet & Apoyo Familiar",
          type: "Gasto Extra",
          paymentMethod: "Débito",
          category: "Gastos Fijos",
          amount: 650000,
        },
      ]);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-[#f8fafc] overflow-hidden">
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-[#0b1120]/80 backdrop-blur-xl p-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-slate-200">Tobirama</h1>
            <p className="text-xs text-blue-400 font-mono tracking-tight">FINANCIAL OS v1.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "dashboard", label: "Torre de Control", icon: Layers },
            { id: "budget", label: "Matriz Mensual", icon: FileText },
            { id: "tracker", label: "Tracker Diario", icon: Coins },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as "dashboard" | "budget" | "tracker")}
                className={`relative flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 bg-blue-600/10 border border-blue-500/20 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`h-4.5 w-4.5 z-10 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                <span className="z-10">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-4 w-4 ml-auto text-blue-400 z-10" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ingreso Base Nómina</div>
            <div className="text-lg font-mono font-bold text-slate-200">{formatCOP(INITIAL_INCOME)}</div>
          </div>
          
          <button
            onClick={handleResetState}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-white/5 bg-slate-900/30 hover:bg-red-500/10 hover:border-red-500/20 text-xs font-medium text-slate-400 hover:text-red-400 transition-all duration-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar Sistema
          </button>
        </div>
      </aside>

      {/* --- MOBILE DRAWERS --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0b1120] border-r border-white/5 p-6 z-40 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-600/25 flex items-center justify-center">
                    <Activity className="h-4.5 w-4.5 text-blue-400" />
                  </div>
                  <h1 className="text-sm font-semibold tracking-wider uppercase text-slate-200">Tobirama</h1>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-2 flex-1">
                {[
                  { id: "dashboard", label: "Torre de Control", icon: Layers },
                  { id: "budget", label: "Matriz Mensual", icon: FileText },
                  { id: "tracker", label: "Tracker Diario", icon: Coins },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id as "dashboard" | "budget" | "tracker");
                        setIsSidebarOpen(false);
                      }}
                      className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive ? "text-white bg-blue-600/20 border border-blue-500/20" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-white/5 pt-6 mt-auto space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Base Global</div>
                  <div className="text-base font-mono font-bold text-slate-200">{formatCOP(INITIAL_INCOME)}</div>
                </div>
                <button
                  onClick={() => {
                    handleResetState();
                    setIsSidebarOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-white/5 bg-slate-900/30 text-xs text-slate-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reiniciar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* --- HEADER --- */}
        <header className="sticky top-0 bg-[#090d16]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Entorno Financiero Activo</span>
              <h2 className="text-lg font-semibold tracking-tight text-white">Tobirama OS</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-4 py-1.5 rounded-full text-xs font-mono font-semibold text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nómina Base: {formatCOP(INITIAL_INCOME)}
            </div>
          </div>
        </header>

        {/* --- SUBVIEW ROUTING --- */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {activeView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-8"
              >
                {/* Visual Dashboard Top Title */}
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Torre de Control</h3>
                  <p className="text-sm text-slate-400">Panel consolidado de alta gerencia, liquidez e indicadores clave.</p>
                </div>

                {/* --- Vista A: KPI CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Termómetro de Liquidez */}
                  <div className="relative glass-panel rounded-2xl p-6 overflow-hidden flex flex-col justify-between min-h-[160px] group transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_0_25px_rgba(59,130,246,0.05)]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                      <Wallet className="h-24 w-24 text-blue-400" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-widest">Termómetro de Liquidez</span>
                        <div className="text-3xl font-bold font-mono text-white mt-2">
                          {formatCOP(pocketLiquidity)}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-mono">
                        <span>Disponible real</span>
                        <span>{Math.round((pocketLiquidity / INITIAL_INCOME) * 100)}% de nómina</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (pocketLiquidity / INITIAL_INCOME) * 100))}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Progreso de Deuda Erradicada */}
                  <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[160px] group transition-all duration-300 hover:border-emerald-500/20 hover:shadow-[0_0_25px_rgba(34,197,94,0.05)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-widest">Deuda Erradicada</span>
                        <div className="text-3xl font-bold font-mono text-white mt-2">
                          {debtMetrics.percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/25 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-mono">
                        <span>Restante: {formatCOP(debtMetrics.totalPending)}</span>
                        <span>Pagado: {formatCOP(debtMetrics.totalPaid)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${debtMetrics.percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Estado de Tarjetas de Crédito */}
                  <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[160px] group transition-all duration-300 hover:border-purple-500/20 hover:shadow-[0_0_25px_rgba(168,85,247,0.05)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-widest">Crédito & Tarjetas</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`h-2 w-2 rounded-full ${creditCardMetrics.isFree ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
                          <div className={`text-base font-bold ${creditCardMetrics.isFree ? "text-emerald-400" : "text-yellow-400"}`}>
                            {creditCardMetrics.isFree ? "Tarjetas en $0 (Liberadas)" : `Pendiente: ${formatCOP(creditCardMetrics.outstanding)}`}
                          </div>
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/25 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-400" />
                      </div>
                    </div>

                    <div className="mt-4 border-t border-white/5 pt-3">
                      <div className="text-[11px] text-slate-500 leading-relaxed font-mono">
                        {creditCardMetrics.isFree 
                          ? "Sin saldo flotante. Capacidad operativa limpia." 
                          : "Consumo registrado. Se aconseja liberar cupo de inmediato."}
                      </div>
                    </div>
                  </div>

                </div>

                {/* --- Matriz de Distribución de Salidas --- */}
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-base font-bold tracking-tight text-white">Distribución de Salidas</h4>
                      <p className="text-xs text-slate-400">Progreso presupuestal por categoría de egresos obligatoria.</p>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Categorías Estrictas
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {distributionMatrix.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl border border-white/5 bg-slate-950/45 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${CATEGORY_COLORS[item.category]}`}>
                              {item.category}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">{item.item}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {Math.round(item.percentage)}%
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-current ${item.percentage === 100 ? "text-emerald-500" : "text-yellow-500"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                          <div>
                            PAGADO: <span className="text-slate-300">{formatCOP(item.paid)}</span>
                          </div>
                          <div>
                            ASIGNADO: <span className="text-slate-300">{formatCOP(item.assigned)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "budget" && (
              <motion.div
                key="budget"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Matriz de Control Mensual</h3>
                  <p className="text-sm text-slate-400">Data Grid de alta densidad informativa y auditoría presupuestaria.</p>
                </div>

                {/* --- Vista B: BUDGET GRID --- */}
                <div className="glass-panel rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#0b1120]/60 text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
                          <th className="px-6 py-4.5">Categoría</th>
                          <th className="px-6 py-4.5">Ítem / Compromiso</th>
                          <th className="px-6 py-4.5 text-right">Presupuesto Inicial</th>
                          <th className="px-6 py-4.5 text-right">Ya Pagué (Real)</th>
                          <th className="px-6 py-4.5 text-right">Falta por Pagar</th>
                          <th className="px-6 py-4.5 text-center">Estado</th>
                          <th className="px-6 py-4.5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {budgetItems.map((item) => {
                          const outstanding = Math.max(0, item.assigned - item.paid);
                          const isPaid = outstanding === 0;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="px-6 py-4.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${CATEGORY_COLORS[item.category]}`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="px-6 py-4.5 font-medium text-slate-200">
                                {item.item}
                              </td>
                              <td className="px-6 py-4.5 text-right font-mono text-slate-300">
                                {formatCOP(item.assigned)}
                              </td>
                              <td className="px-6 py-4.5 text-right font-mono text-emerald-400 font-semibold">
                                {formatCOP(item.paid)}
                              </td>
                              <td className={`px-6 py-4.5 text-right font-mono font-semibold ${isPaid ? "text-slate-500" : "text-yellow-500"}`}>
                                {formatCOP(outstanding)}
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isPaid 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                }`}>
                                  {isPaid ? "PAGADO" : "PENDIENTE"}
                                </span>
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                <button
                                  onClick={() => handleEditBudget(item)}
                                  className="px-3 py-1 rounded bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-xs font-semibold text-blue-400 transition-all cursor-pointer"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "tracker" && (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Libro Diario Financiero</h3>
                  <p className="text-sm text-slate-400">Captura ágil de movimientos &quot;flash&quot; y auditoría de transacciones.</p>
                </div>

                {/* --- Vista C: TWO COLUMN TRACKER --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Column 1: Captura Rápida Form */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="glass-panel rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <PlusCircle className="h-5 w-5 text-blue-400" />
                        <h4 className="text-base font-bold text-white">Registro Flash</h4>
                      </div>

                      <form onSubmit={handleRegisterTransaction} className="space-y-4">
                        <div>
                          <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Fecha</label>
                          <input
                            type="date"
                            value={trackerForm.date}
                            onChange={(e) => setTrackerForm({ ...trackerForm, date: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm font-mono text-slate-200 focus:border-blue-500/50"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Descripción / Comercio</label>
                          <input
                            type="text"
                            placeholder="Ej. Almuerzo o Pago de cuotas"
                            value={trackerForm.description}
                            onChange={(e) => setTrackerForm({ ...trackerForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm text-slate-200 focus:border-blue-500/50"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Tipo Movimiento</label>
                            <select
                              value={trackerForm.type}
                              onChange={(e) => setTrackerForm({ ...trackerForm, type: e.target.value as TransactionType })}
                              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm text-slate-200 focus:border-blue-500/50"
                            >
                              <option value="Gasto Extra">Gasto Extra</option>
                              <option value="Movimiento a Reserva">Movimiento a Reserva</option>
                              <option value="Ingreso">Ingreso</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Medio de Pago</label>
                            <select
                              value={trackerForm.paymentMethod}
                              onChange={(e) => setTrackerForm({ ...trackerForm, paymentMethod: e.target.value as PaymentMethod })}
                              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm text-slate-200 focus:border-blue-500/50"
                            >
                              <option value="Débito">Débito</option>
                              <option value="TC">TC</option>
                              <option value="Efectivo">Efectivo</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Categoría</label>
                          <select
                            value={trackerForm.category}
                            onChange={(e) => setTrackerForm({ ...trackerForm, category: e.target.value as Category })}
                            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm text-slate-200 focus:border-blue-500/50"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Monto (COP)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={trackerForm.amount}
                              onChange={(e) => setTrackerForm({ ...trackerForm, amount: e.target.value })}
                              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm font-mono text-slate-200 focus:border-blue-500/50"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-sm font-semibold tracking-wider uppercase text-white shadow-lg shadow-blue-600/15 cursor-pointer"
                        >
                          Registrar
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Column 2: Audit Trail Log */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="glass-panel rounded-2xl p-6 flex flex-col min-h-[480px]">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-400" />
                          <h4 className="text-base font-bold text-white">Feed de Auditoría</h4>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {transactions.length} registros
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-2">
                        <AnimatePresence initial={false}>
                          {transactions.map((tx) => {
                            const isIncome = tx.type === "Ingreso";
                            const isReserve = tx.type === "Movimiento a Reserva";

                            return (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#0b1120]/40 hover:bg-[#0b1120]/80 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${
                                    isIncome 
                                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                                      : isReserve
                                        ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                                        : "bg-red-500/10 border-red-500/25 text-red-400"
                                  }`}>
                                    {isIncome ? (
                                      <ArrowUpRight className="h-4.5 w-4.5" />
                                    ) : isReserve ? (
                                      <TrendingUp className="h-4.5 w-4.5" />
                                    ) : (
                                      <ArrowDownLeft className="h-4.5 w-4.5" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-200">
                                      {tx.description}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {tx.date}
                                      </span>
                                      <span className="text-[10px] font-mono bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.25 rounded">
                                        {tx.paymentMethod}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-400">
                                        {tx.category}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className={`text-sm font-mono font-bold ${
                                    isIncome 
                                      ? "text-emerald-400" 
                                      : isReserve
                                        ? "text-blue-400"
                                        : "text-red-400"
                                  }`}>
                                    {isIncome ? "+" : "-"}{formatCOP(tx.amount)}
                                  </div>
                                  <div className="text-[9px] font-mono uppercase text-slate-500 mt-0.5">
                                    {tx.type}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* --- QUICK EDIT MODAL (BUDGET GRID ADJUSTMENTS) --- */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[#0b1120] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-white">Editar Registro</h4>
                  <p className="text-xs text-slate-400">{editingItem.item} ({editingItem.category})</p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Presupuesto Inicial (Asignado)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      value={editAssignedValue}
                      onChange={(e) => setEditAssignedValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm font-mono text-slate-200 focus:border-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Ya Pagué (Real)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      value={editPaidValue}
                      onChange={(e) => setEditPaidValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm font-mono text-slate-200 focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-xs font-bold uppercase text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveBudgetEdit}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase text-white cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
