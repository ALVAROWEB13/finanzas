"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Menu,
  Activity,
  Layers,
  FileText,
  Coins,
  Lock,
  Bell,
  History,
  Sliders,
  Search,
  Building2,
  HelpCircle,
  Send,
  Terminal,
  Plus
} from "lucide-react";

// --- TYPES ---
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

interface SystemNode {
  name: string;
  status: "ONLINE" | "ESTABLE" | "SEGURO";
  statusColor: string;
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
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);

  // --- REAL MOCK INITIAL STATE ---
  const INITIAL_INCOME = 5976687; // Base Global Income ($5.976.687 COP)

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
  const [activeView, setActiveView] = useState<"dashboard" | "reporting" | "tracker" | "audit">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editPaidValue, setEditPaidValue] = useState("");
  const [editAssignedValue, setEditAssignedValue] = useState("");

  // --- QUICK REGISTRATION FORM STATE (Optimized to match screen 2) ---
  const [quickAmount, setQuickAmount] = useState("0");
  const [quickCategory, setQuickCategory] = useState<Category>("Estilo de Vida / Mercado");
  const [quickMethod, setQuickMethod] = useState<PaymentMethod>("Débito");
  const [quickType, setQuickType] = useState<TransactionType>("Gasto Extra");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickSuccessMsg, setQuickSuccessMsg] = useState(false);

  // --- TERMINAL LOGS STATE (Optimized to match screen 1) ---
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[08:42:11] SYSTEM_BOOT: Módulos financieros de Tobirama iniciados.",
    "[09:15:42] SYNC: Libro mayor sincronizado con servidor seguro de bolsillo.",
    "[09:18:22] AUDITORÍA: Escaneo completado. Sin anomalías en registros.",
    "[10:05:01] NOTIFICACIÓN: Límite de deudas establecido en $0 para tarjetas.",
    "[10:12:44] RASTREO: Usuario 'Tobirama_Admin' modificó la cuota Tamarindo.",
    "[11:00:00] LATIDO: Latido de base de datos verificado con éxito (3ms latencia)."
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // --- SYSTEM MODULES METRICS (Spanish health indicators) ---
  const systemNodes: SystemNode[] = [
    { name: "Libro Mayor V.2", status: "ONLINE", statusColor: "text-emerald-400" },
    { name: "Puente API", status: "ONLINE", statusColor: "text-emerald-400" },
    { name: "Módulo Sincro", status: "ESTABLE", statusColor: "text-yellow-400" },
    { name: "Filtro Seguridad", status: "SEGURO", statusColor: "text-emerald-400" },
  ];

  // --- REACTIVE COMPUTATIONS ---
  // Real Liquidez de Bolsillo (Termómetro de Liquidez)
  const pocketLiquidity = useMemo(() => {
    const totalIncomes = transactions
      .filter((t) => t.type === "Ingreso")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpensesAndReserves = transactions
      .filter((t) => t.type === "Gasto Extra" || t.type === "Movimiento a Reserva")
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncomes - totalExpensesAndReserves;
  }, [transactions]);

  // Real Patrimonio Neto: Caja Libre + Ahorros Nu/Lulo
  const netWorthTotal = useMemo(() => {
    const savingsItem = budgetItems.find((item) => item.category === "Ahorro / Reserva");
    const savingsAmount = savingsItem ? savingsItem.paid : 0;
    return pocketLiquidity + savingsAmount;
  }, [pocketLiquidity, budgetItems]);

  // Deuda Erradicada
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

  // Burn Rate mensual (gasto acumulado real de compromisos pagados)
  const monthlyBurn = useMemo(() => {
    return budgetItems.reduce((sum, item) => sum + item.paid, 0);
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

  // --- DYNAMIC ASSET TRAJECTORY GENERATOR (SVG-based Wave Chart) ---
  const { chartPathData, trajectoryPoints } = useMemo(() => {
    // Sort transactions chronologically to build day-by-day trajectory
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    let currentBalance = 0;
    const points: { date: string; balance: number }[] = [];
    
    sortedTxs.forEach((tx) => {
      if (tx.type === "Ingreso") {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      // Ensure we register balance points
      points.push({ date: tx.date, balance: currentBalance });
    });

    if (points.length === 0) return { chartPathData: { linePath: "", areaPath: "", points: [] }, trajectoryPoints: [] };
    
    const maxVal = Math.max(...points.map(p => p.balance), INITIAL_INCOME);
    const minVal = 0;
    const valRange = maxVal - minVal || 1;
    
    const width = 500;
    const height = 150; 
    
    const svgPoints = points.map((p, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * width : width / 2;
      const y = height - ((p.balance - minVal) / valRange) * (height - 20) - 10;
      return { x, y, balance: p.balance, date: p.date };
    });
    
    // Draw smooth line path
    let linePath = "";
    if (svgPoints.length > 0) {
      linePath = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
      for (let i = 1; i < svgPoints.length; i++) {
        linePath += ` L ${svgPoints[i].x} ${svgPoints[i].y}`;
      }
    }
    
    const areaPath = linePath 
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height} L ${svgPoints[0].x} ${height} Z`
      : "";
      
    return { 
      chartPathData: { linePath, areaPath, points: svgPoints }, 
      trajectoryPoints: points 
    };
  }, [transactions, INITIAL_INCOME]);

  // --- HANDLERS ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "tobirama2026" || passwordInput === "1208") {
      setIsAuthenticated(true);
      setLoginError(false);
      const now = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${now}] SEGURIDAD: Usuario autenticado correctamente a través del Gateway local.`
      ]);
    } else {
      setLoginError(true);
    }
  };

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
        description: `Ajuste presupuesto: ${editingItem.item}`,
        type: diff > 0 ? "Gasto Extra" : "Ingreso",
        paymentMethod: "Débito",
        category: editingItem.category,
        amount: Math.abs(diff),
      };
      setTransactions((prev) => [adjustmentTx, ...prev]);

      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${timeStr}] AUDIT_LOG: Presupuesto '${editingItem.item}' modificado. Ajuste de ${formatCOP(Math.abs(diff))} registrado.`
      ]);
    }

    setEditingItem(null);
  };

  // Quick register transaction form submission (Vista C - Screen 2 style)
  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseInt(quickAmount) || 0;
    if (amountVal <= 0) return;

    const desc = quickDescription.trim() || `Transacción flash: ${quickCategory}`;

    // Add transaction to central state
    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      description: desc,
      type: quickType,
      paymentMethod: quickMethod,
      category: quickCategory,
      amount: amountVal,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Reactively update budget items
    if (quickType === "Gasto Extra" || quickType === "Movimiento a Reserva") {
      setBudgetItems((prev) =>
        prev.map((item) => {
          if (item.category === quickCategory) {
            return {
              ...item,
              paid: item.paid + amountVal,
              assigned: item.assigned === 0 ? amountVal : item.assigned,
            };
          }
          return item;
        })
      );
    }

    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${timeStr}] TRANSACCIÓN: Registro flash de ${formatCOP(amountVal)} en la categoría '${quickCategory}' añadido con éxito.`
    ]);

    setQuickSuccessMsg(true);
    setQuickAmount("0");
    setQuickDescription("");
    setTimeout(() => setQuickSuccessMsg(false), 3000);
  };

  // Terminal commands handling
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const timeStr = new Date().toLocaleTimeString();
    const newLogs = [...terminalLogs, `> ${cmd}`];

    if (cmd === "/audit") {
      newLogs.push(`[${timeStr}] TERMINAL: Iniciando auditoría profunda de activos...`);
      newLogs.push(`[${timeStr}] TERMINAL: Total Ingresos: ${formatCOP(INITIAL_INCOME)} | Gasto Mensual: ${formatCOP(monthlyBurn)}`);
      newLogs.push(`[${timeStr}] TERMINAL: Liquidez neta verificada: ${formatCOP(pocketLiquidity)}. Todo en orden.`);
    } else if (cmd === "/clear") {
      setTerminalLogs([]);
      setTerminalInput("");
      return;
    } else if (cmd === "/help") {
      newLogs.push(`[${timeStr}] TERMINAL: Comandos disponibles:`);
      newLogs.push("  /audit   - Ejecuta un diagnóstico rápido del estado de activos.");
      newLogs.push("  /clear   - Limpia los registros de la consola virtual.");
      newLogs.push("  /reset   - Restablece el OS financiero a su estado de fábrica.");
    } else if (cmd === "/reset") {
      setBudgetItems([
        { id: "b1", category: "Vivienda", item: "Cuota Tamarindo", assigned: 1427000, paid: 1427000 },
        { id: "b2", category: "Deudas de Consumo", item: "ADDI / Crédito", assigned: 2029023, paid: 2029023 },
        { id: "b3", category: "Tarjetas de Crédito", item: "Cupo Utilizado", assigned: 0, paid: 0 },
        { id: "b4", category: "Gastos Fijos", item: "Apoyo Madre & Internet", assigned: 650000, paid: 650000 },
        { id: "b5", category: "Ahorro / Reserva", item: "Fondo Nu / Lulo", assigned: 587029, paid: 587029 },
        { id: "b6", category: "Estilo de Vida / Mercado", item: "Gastos Mensuales", assigned: 600000, paid: 0 },
      ]);
      setTransactions([
        { id: "t1", date: "2026-06-01", description: "Ingreso Nómina Base", type: "Ingreso", paymentMethod: "Débito", category: "Gastos Fijos", amount: 5976687 },
        { id: "t2", date: "2026-06-02", description: "Pago Cuota Tamarindo Jaramillo Mora", type: "Gasto Extra", paymentMethod: "Débito", category: "Vivienda", amount: 1427000 },
        { id: "t3", date: "2026-06-02", description: "Liquidación Crédito ADDI", type: "Gasto Extra", paymentMethod: "Débito", category: "Deudas de Consumo", amount: 2029023 },
        { id: "t4", date: "2026-06-03", description: "Fondo Nu / Lulo (Ahorro)", type: "Movimiento a Reserva", paymentMethod: "Débito", category: "Ahorro / Reserva", amount: 587029 },
        { id: "t5", date: "2026-06-03", description: "Servicios e Internet & Apoyo Familiar", type: "Gasto Extra", paymentMethod: "Débito", category: "Gastos Fijos", amount: 650000 },
      ]);
      newLogs.push(`[${timeStr}] SYSTEM: Reinicio de base de datos completado.`);
    } else {
      newLogs.push(`[${timeStr}] ERROR: Comando '${cmd}' no reconocido. Escribe /help para ayuda.`);
    }

    setTerminalLogs(newLogs);
    setTerminalInput("");
  };

  const handleDigitPress = (digit: string) => {
    setQuickAmount((prev) => {
      if (prev === "0") return digit;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setQuickAmount((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  // --- RENDER LOGIN GATEWAY ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans text-slate-100 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01),transparent_70%)] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-[#0a0b0d]/90 border border-white/[0.04] rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-wider uppercase text-slate-200">Tobirama OS</h2>
              <p className="text-xs text-slate-500 font-mono tracking-wider mt-1">SISTEMA CONTROL DE ACTIVOS</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="w-full space-y-4 pt-4">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Ingrese Clave de Acceso"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-black border border-white/[0.06] text-center font-mono tracking-widest text-slate-200 focus:border-blue-500/40 text-base"
                  autoFocus
                  required
                />
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-red-500 font-mono"
                >
                  Clave inválida. Acceso restringido.
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-white hover:bg-slate-200 text-black text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-[0.98] cursor-pointer"
              >
                AUTENTICAR OS
              </button>
            </form>

            <div className="text-[10px] text-slate-600 font-mono pt-4 leading-relaxed">
              ID de Terminal: {new Date().getFullYear()}-OS-TOBIRAMA<br/>
              Acceso restringido a personal de Alta Gerencia.
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER MAIN OS APP ---
  return (
    <div className="flex min-h-screen bg-black text-[#f8fafc] overflow-hidden select-none font-sans">
      
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex flex-col w-24 border-r border-white/[0.04] bg-[#050505] p-6 flex-shrink-0 z-20 items-center justify-between">
        <div className="flex flex-col items-center gap-10">
          {/* Logo Brand Emblem (Screen 2: big letter T) */}
          <div className="h-12 w-12 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center font-bold font-mono text-xl text-white">
            T
          </div>

          <nav className="flex flex-col gap-4">
            {[
              { id: "dashboard", label: "Dashboard", icon: Layers },
              { id: "reporting", label: "Reportes", icon: TrendingUp },
              { id: "tracker", label: "Tracker", icon: Coins },
              { id: "audit", label: "Auditoría", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as "dashboard" | "reporting" | "tracker" | "audit")}
                  title={item.label}
                  className={`relative h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? "text-white bg-white/[0.04] border border-white/[0.08]" : "text-slate-600 hover:text-slate-300 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom utility */}
        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-300 cursor-pointer">
          <HelpCircle className="h-5 w-5" />
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-black border-r border-white/[0.04] p-6 z-40 md:hidden flex flex-col justify-between"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center font-bold text-xl text-white">
                      T
                    </div>
                    <span className="text-sm font-semibold tracking-wider uppercase text-slate-200">Tobirama OS</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {[
                    { id: "dashboard", label: "Torre de Control", icon: Layers },
                    { id: "reporting", label: "Reportes y Gráficos", icon: TrendingUp },
                    { id: "tracker", label: "Tracker / Libro Diario", icon: Coins },
                    { id: "audit", label: "Auditoría / Presupuesto", icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id as "dashboard" | "reporting" | "tracker" | "audit");
                          setIsSidebarOpen(false);
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                          isActive ? "text-white bg-white/[0.04] border border-white/[0.08]" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-300 cursor-pointer">
                <HelpCircle className="h-5 w-5" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-black">
        {/* --- HEADER --- */}
        <header className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-white/[0.04] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-8">
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">Tobirama OS</h2>
              
              {/* Internal view selector tabs (Screen 1 style) */}
              <div className="flex gap-1 p-0.5 bg-[#0a0a0c] rounded-lg border border-white/[0.04]">
                {[
                  { id: "dashboard", label: "Torre de Control" },
                  { id: "reporting", label: "Reportes" },
                  { id: "tracker", label: "Libro Diario" },
                  { id: "audit", label: "Auditoría" }
                ].map((tab) => {
                  const isActive = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveView(tab.id as "dashboard" | "reporting" | "tracker" | "audit")}
                      className={`relative px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isActive ? "text-white font-bold" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="headerActivePill"
                          className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] rounded-md"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Header items matching screen 1: Search, Notification, History, settings, User */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                type="text"
                placeholder="Buscar global..."
                className="w-48 pl-9 pr-4 py-1.5 rounded-lg border border-white/[0.04] bg-[#0a0b0d] text-xs font-mono focus:border-white/[0.1] focus:w-60 text-slate-300"
              />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
              <Bell className="h-4 w-4" />
            </button>

            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
              <History className="h-4 w-4" />
            </button>

            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
              <Sliders className="h-4 w-4" />
            </button>

            {/* Profile Avatar mockup */}
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/[0.08] flex items-center justify-center font-bold text-[10px] text-white">
              CF
            </div>
          </div>
        </header>

        {/* --- VIEW ROUTING --- */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 bg-black">
          <AnimatePresence mode="wait">
            
            {/* --- VISTA A: TORRE DE CONTROL (DASHBOARD) --- */}
            {activeView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {/* Visual Top stats cards matching Screen 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Patrimonio Neto (Activos Totales) */}
                  <div className="relative glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[160px] group transition-all hover:border-emerald-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">PATRIMONIO NETO</span>
                        <div className="text-3xl font-bold font-mono text-white mt-3">
                          {formatCOP(netWorthTotal)}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-emerald-600/5 border border-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-mono">
                      <span className="text-emerald-400">+4.2%</span>
                      <span className="text-slate-600">vs mes anterior</span>
                      <svg className="h-6 w-20 ml-auto" viewBox="0 0 100 30" fill="none">
                        <path d="M0,25 Q15,10 30,18 T60,5 T90,28 T100,10" stroke="#10b981" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                  </div>

                  {/* Card 2: Burnout Mensual (Gasto Mensual) */}
                  <div className="relative glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[160px] group transition-all hover:border-red-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">GASTO MENSUAL</span>
                        <div className="text-3xl font-bold font-mono text-white mt-3">
                          {formatCOP(monthlyBurn)}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-red-600/5 border border-red-500/10 flex items-center justify-center font-bold font-mono text-xs text-red-400">
                        GM
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-[9px] text-slate-600 mb-1 font-mono">
                        <span>+12.5% umbral de alerta</span>
                        <span>Ejecución actual</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#121316] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-rose-400" style={{ width: `${Math.min(100, (monthlyBurn / INITIAL_INCOME) * 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Radial Deuda Erradicada */}
                  <div className="relative glass-panel rounded-2xl p-6 flex items-center justify-between min-h-[160px] group transition-all hover:border-blue-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="space-y-4">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">DEUDA ERRADICADA</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] text-slate-600 font-mono block">PENDIENTE</span>
                          <span className="text-sm font-bold font-mono text-slate-300">{formatCOP(debtMetrics.totalPending)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-600 font-mono block">PROYECTADO Q4</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">$0</span>
                        </div>
                      </div>
                    </div>

                    {/* Circular SVG Gauge matching Screen 1 */}
                    <div className="relative h-24 w-24 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.01)" strokeWidth="6" fill="none"/>
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="38"
                          stroke="#10b981"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray="238"
                          initial={{ strokeDashoffset: 238 }}
                          animate={{ strokeDashoffset: 238 - (238 * debtMetrics.percentage) / 100 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-base font-bold font-mono text-white">{Math.round(debtMetrics.percentage)}%</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-tight font-semibold">Completado</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Dashboard layout center grids matching screen 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Column 1: System Status Node List (Ledger, API) */}
                  <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">SISTEMA TOBIRAMA</span>
                      <h4 className="text-lg font-bold text-white mt-1">Nodos Activos</h4>
                    </div>

                    <div className="space-y-4 my-6">
                      {systemNodes.map((node, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.02] last:border-0">
                          <span className="text-xs text-slate-400 font-mono">{node.name}</span>
                          <span className={`text-xs font-bold font-mono ${node.statusColor}`}>{node.status}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-600 font-mono leading-relaxed">
                      Estructura operativa asegurada. Todo bajo control.
                    </div>
                  </div>

                  {/* Column 2: Termómetro de Liquidez (Slide block visual) */}
                  <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">TERMÓMETRO DE LIQUIDEZ</span>
                      <p className="text-xs text-slate-600 mt-1">Disponibilidad operativa inmediata del bolsillo.</p>
                    </div>

                    <div className="flex items-center gap-6 my-6">
                      {/* Vertical slider slider mockup */}
                      <div className="w-8 h-36 rounded-full bg-black border border-white/[0.04] p-1 relative flex flex-col justify-end overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-cyan-500/10 to-emerald-500/10" />
                        <motion.div 
                          className="w-full bg-gradient-to-t from-blue-500 to-emerald-400 rounded-full"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.min(100, Math.max(0, (pocketLiquidity / INITIAL_INCOME) * 100))}%` }}
                          transition={{ duration: 1 }}
                        />
                        <div className="absolute left-1/2 -translate-x-1/2 h-3 w-3 bg-white rounded-full border border-blue-500 shadow-md animate-bounce" style={{ bottom: `${Math.min(90, Math.max(5, (pocketLiquidity / INITIAL_INCOME) * 100))}%` }} />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block">ÓPTIMO</span>
                          <span className="text-lg font-bold font-mono text-emerald-400">
                            {((pocketLiquidity / INITIAL_INCOME) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block">RUNWAY (FONDO RESILIENCIA)</span>
                          <span className="text-sm font-bold font-mono text-white">18 Meses</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block">EFECTIVO DISPONIBLE</span>
                          <span className="text-xs font-bold font-mono text-slate-300">{formatCOP(pocketLiquidity)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 font-mono">
                      Seguimiento en vivo del pool de caja libre.
                    </div>
                  </div>

                  {/* Column 3: Command logs panel (Console simulator) */}
                  <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[280px] bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">CONSOLA OPERATIVA</span>
                      <h4 className="text-sm font-bold text-white mt-1">Terminal Logs</h4>
                    </div>

                    <div className="flex-1 bg-black border border-white/[0.04] rounded-xl p-3 my-4 overflow-y-auto max-h-[160px] font-mono text-[9px] text-slate-400 space-y-1.5 scrollbar-thin">
                      {terminalLogs.map((log, index) => (
                        <div key={index} className="leading-normal break-all">
                          {log}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>

                    <form onSubmit={handleTerminalSubmit} className="flex gap-2">
                      <div className="relative flex-1">
                        <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                        <input
                          type="text"
                          placeholder="Enviar comando..."
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/[0.04] bg-black text-xs font-mono text-slate-200 focus:border-white/[0.15]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>

                </div>

                {/* Bottom Recent Entities table mapping Screen 1 */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-base font-bold text-white">Compromisos Presupuestales</h4>
                      <p className="text-xs text-slate-600">Volumen financiero de abonos y nivel de ejecución real.</p>
                    </div>
                    <button onClick={() => setActiveView("audit")} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors">Ver todos</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-slate-950/20 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="px-6 py-3.5">Compromiso / Categoría</th>
                          <th className="px-6 py-3.5">Estado</th>
                          <th className="px-6 py-3.5 text-right">Volumen Pagado</th>
                          <th className="px-6 py-3.5 text-center">Nivel de Ejecución</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {budgetItems.map((item, i) => {
                          const outstanding = Math.max(0, item.assigned - item.paid);
                          const isPaid = outstanding === 0;
                          
                          // Risk-bar style segments
                          // 100% paid: 3 green blocks
                          // 50-99% paid: 2 green/1 gray
                          // 1-49% paid: 1 green/2 gray
                          // 0% paid: 3 gray
                          const ratio = item.assigned > 0 ? item.paid / item.assigned : 1;
                          let segments = [false, false, false];
                          if (ratio >= 1.0) segments = [true, true, true];
                          else if (ratio >= 0.5) segments = [true, true, false];
                          else if (ratio > 0) segments = [true, false, false];

                          return (
                            <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 flex items-center gap-3 font-semibold text-slate-200">
                                <Building2 className="h-4 w-4 text-slate-600" />
                                <div>
                                  <div>{item.item}</div>
                                  <div className="text-[9px] text-slate-500 uppercase tracking-tight mt-0.5">{item.category}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] border font-bold ${
                                  isPaid 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                }`}>
                                  {isPaid ? "COMPLETADO" : "PENDIENTE"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-300">
                                {formatCOP(item.paid)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="inline-flex gap-1">
                                  {segments.map((active, index) => (
                                    <span
                                      key={index}
                                      className={`h-1.5 w-6 rounded-full ${
                                        active 
                                          ? isPaid ? "bg-emerald-500" : "bg-yellow-500"
                                          : "bg-zinc-800"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Floating plus button for quick register shortcut */}
                <button
                  onClick={() => setActiveView("tracker")}
                  className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-white hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center text-black shadow-lg z-30 cursor-pointer"
                  title="Nueva Transacción Flash"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </motion.div>
            )}

            {/* --- VISTA B: REPORTES (CAPITAL VELOCITY) --- */}
            {activeView === "reporting" && (
              <motion.div
                key="reporting"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">EXECUTIVE OVERVIEW</span>
                    <h3 className="text-2xl font-bold tracking-tight text-white mt-1">Velocidad del Capital</h3>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Exportar Reporte
                    </button>
                    <select className="px-4 py-2 rounded-xl border border-white/[0.04] bg-[#0a0b0d] text-xs font-mono text-slate-400">
                      <option>Últimos 30 días</option>
                      <option>Últimos 90 días</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Asset Trajectory Chart (SVG-based Wave Chart) */}
                  <div className="lg:col-span-8 glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-base font-bold text-white">Trayectoria de Activos</h4>
                        <p className="text-xs text-slate-600">Progresión en tiempo real de la liquidez libre en el mes.</p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xl font-bold text-white">{formatCOP(pocketLiquidity)}</span>
                        <span className="text-[9px] text-emerald-400 block">+12.4% vs prev</span>
                      </div>
                    </div>

                    {/* Smooth glowing SVG wave path */}
                    <div className="relative h-60 w-full overflow-hidden bg-black border border-white/[0.04] rounded-xl p-4">
                      {chartPathData.linePath ? (
                        <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="0" y1="35" x2="500" y2="35" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          <line x1="0" y1="115" x2="500" y2="115" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          
                          {/* Shaded Area */}
                          <path d={chartPathData.areaPath} fill="url(#chartGrad)" />
                          
                          {/* Smooth Line */}
                          <path d={chartPathData.linePath} stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          
                          {/* Glow points */}
                          {chartPathData.points.map((pt, i) => (
                            <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#60a5fa" stroke="#000" strokeWidth="1.5" />
                          ))}
                        </svg>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-mono text-xs text-slate-600">
                          Sin datos de trayectoria suficientes
                        </div>
                      )}
                      
                      {/* X Axis labels based on actual transactions */}
                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-600 mt-2">
                        {trajectoryPoints.length > 0 ? (
                          <>
                            <span>{trajectoryPoints[0].date}</span>
                            <span>{trajectoryPoints[Math.floor(trajectoryPoints.length / 2)]?.date || ""}</span>
                            <span>{trajectoryPoints[trajectoryPoints.length - 1].date}</span>
                          </>
                        ) : (
                          <>
                            <span>JUN 01</span>
                            <span>JUN 15</span>
                            <span>JUN 30</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column statistics cards */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Operating Income Card */}
                    <div className="glass-panel rounded-2xl p-6 flex justify-between items-center bg-[#0a0b0d]/50 border-white/[0.04]">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">INGRESOS DE OPERACIÓN</span>
                        <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCOP(INITIAL_INCOME)}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold font-mono text-emerald-400">
                        +8.2%
                      </span>
                    </div>

                    {/* Total Expenses Card */}
                    <div className="glass-panel rounded-2xl p-6 flex justify-between items-center bg-[#0a0b0d]/50 border-white/[0.04]">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">GASTOS TOTALES</span>
                        <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCOP(monthlyBurn)}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-bold font-mono text-red-400">
                        +2.4%
                      </span>
                    </div>

                    {/* Capital Efficiency circular gauge (Total Paid vs Total Assigned) */}
                    <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block mb-4 font-semibold">EFICIENCIA DE CAPITAL</span>
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 flex items-center justify-center flex-shrink-0">
                          <svg className="h-full w-full -rotate-90">
                            <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.01)" strokeWidth="4" fill="none"/>
                            <circle 
                              cx="28" 
                              cy="28" 
                              r="22" 
                              stroke="#3b82f6" 
                              strokeWidth="4" 
                              fill="none" 
                              strokeDasharray="138" 
                              strokeDashoffset={138 - (138 * (monthlyBurn / (INITIAL_INCOME || 1)))} 
                              strokeLinecap="round" 
                            />
                          </svg>
                          <span className="absolute text-2xs font-bold font-mono text-white">
                            {Math.round((monthlyBurn / INITIAL_INCOME) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal font-mono">
                          El rendimiento de los pasivos es óptimo. Los egresos ejecutados representan el {Math.round((monthlyBurn / INITIAL_INCOME) * 100)}% del ingreso total de nómina.
                        </p>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Expense distribution metrics */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-base font-bold text-white">Distribución de Egresos</h4>
                    <span className="text-xs text-slate-400 hover:text-white cursor-pointer hover:underline">Auditoría Profunda</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {distributionMatrix.map((item, i) => (
                      <div key={i} className="space-y-2 p-4 rounded-xl bg-black border border-white/[0.02]">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400 uppercase tracking-tight font-semibold">{item.item}</span>
                          <span className="text-slate-300 font-bold">{Math.round(item.percentage)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          {formatCOP(item.paid)} de {formatCOP(item.assigned)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anomalies Detected table matching Screen 3 */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-base font-bold text-white">Operaciones Registradas</h4>
                      <p className="text-xs text-slate-600">Escaneo de movimientos financieros reales y conciliación.</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold font-mono text-emerald-400 uppercase tracking-widest">
                      Ledger Seguro
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-slate-950/20 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="px-6 py-3.5">ID Transacción</th>
                          <th className="px-6 py-3.5">Detalle / Comercio</th>
                          <th className="px-6 py-3.5 text-right">Valor</th>
                          <th className="px-6 py-3.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {transactions.slice(0, 5).map((tx, idx) => {
                          const isInc = tx.type === "Ingreso";
                          return (
                            <tr key={tx.id} className="hover:bg-white/[0.01]">
                              <td className="px-6 py-4 font-semibold text-slate-400">#TRX-{idx + 1}</td>
                              <td className="px-6 py-4 text-slate-200">{tx.description}</td>
                              <td className={`px-6 py-4 text-right font-bold ${isInc ? "text-emerald-400" : "text-red-400"}`}>
                                {isInc ? "+" : "-"}{formatCOP(tx.amount)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 ${isInc ? "text-emerald-400" : "text-slate-400"}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${isInc ? "bg-emerald-400" : "bg-slate-400"}`} />
                                  Reconciliado
                                </span>
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

            {/* --- VISTA C: LIBRO DIARIO (REGISTRO FLASH - Screen 2 style) --- */}
            {activeView === "tracker" && (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Visual Capture Form matching Screen 2 */}
                  <div className="lg:col-span-6 flex flex-col justify-center">
                    <div className="glass-panel-heavy rounded-3xl p-8 max-w-lg w-full mx-auto space-y-6 relative border border-white/[0.06] shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
                      <div className="text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block font-semibold">NUEVO REGISTRO</span>
                        <h3 className="text-xl font-bold text-slate-200">
                          {quickType === "Ingreso" ? "Ingreso de Operación" : quickType === "Movimiento a Reserva" ? "Movimiento a Reserva" : "Gasto Extra de Caja"}
                        </h3>
                      </div>

                      {/* Display amount (Screen 2: big numbers) */}
                      <div className="h-28 rounded-2xl bg-[#090a0c] border border-white/[0.02] flex items-center justify-center relative group">
                        <span className="absolute left-6 text-slate-600 font-mono text-2xl font-bold">$</span>
                        <div className="text-4xl font-bold font-mono text-slate-100 tracking-tight select-all">
                          {formatCOP(parseInt(quickAmount) || 0).replace("$", "").trim()}
                        </div>
                      </div>

                      {/* Description Input */}
                      <div>
                        <input
                          type="text"
                          placeholder="Descripción o Comercio (Ej. Mercado)"
                          value={quickDescription}
                          onChange={(e) => setQuickDescription(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-white/[0.06] bg-black text-sm text-slate-200 focus:border-white/[0.15]"
                        />
                      </div>

                      {/* Category Selector Grid with clean icons (Screen 2 grid) */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">Categoría del Gasto</span>
                        <div className="grid grid-cols-3 gap-3">
                          {CATEGORIES.map((cat) => {
                            const isSel = quickCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setQuickCategory(cat)}
                                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                                  isSel 
                                    ? "bg-white/[0.04] border-white/[0.12] text-white shadow-lg" 
                                    : "bg-black border-white/[0.02] text-slate-500 hover:text-slate-300 hover:bg-[#090a0c]"
                                }`}
                              >
                                <Building2 className="h-4.5 w-4.5" />
                                <span className="text-[9px] font-bold leading-tight font-mono">{cat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment method segmented control */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">Método de Pago</span>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-[#090a0c] rounded-xl border border-white/[0.02]">
                          {(["Débito", "TC", "Efectivo"] as PaymentMethod[]).map((method) => {
                            const isSel = quickMethod === method;
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setQuickMethod(method)}
                                className={`py-2 rounded-lg text-2xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer ${
                                  isSel ? "bg-black border border-white/[0.06] text-white shadow" : "text-slate-600 hover:text-slate-300"
                                }`}
                              >
                                {method === "TC" ? "CRÉDITO" : method.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Type switcher segmented control */}
                      <div className="grid grid-cols-3 gap-2">
                        {(["Gasto Extra", "Movimiento a Reserva", "Ingreso"] as TransactionType[]).map((tType) => {
                          const isSel = quickType === tType;
                          return (
                            <button
                              key={tType}
                              type="button"
                              onClick={() => setQuickType(tType)}
                              className={`py-2 rounded-lg text-3xs font-bold uppercase tracking-wider font-mono transition-all border cursor-pointer ${
                                isSel 
                                  ? "bg-white/[0.03] border-white/[0.1] text-white" 
                                  : "bg-black border-white/[0.02] text-slate-600 hover:text-slate-350"
                              }`}
                            >
                              {tType}
                            </button>
                          );
                        })}
                      </div>

                      {/* Virtual Digit keyboard for COP numeric entries */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.04]">
                        {["1", "2", "3", "000"].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleDigitPress(key)}
                            className="py-3 rounded-xl bg-[#090a0c]/80 hover:bg-[#090a0c] border border-white/[0.02] font-mono text-sm text-slate-300 transition-colors cursor-pointer"
                          >
                            {key}
                          </button>
                        ))}
                        {["4", "5", "6", "0"].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleDigitPress(key)}
                            className="py-3 rounded-xl bg-[#090a0c]/80 hover:bg-[#090a0c] border border-white/[0.02] font-mono text-sm text-slate-300 transition-colors cursor-pointer"
                          >
                            {key}
                          </button>
                        ))}
                        {["7", "8", "9", "back"].map((key) => {
                          const isBack = key === "back";
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={isBack ? handleBackspace : () => handleDigitPress(key)}
                              className={`py-3 rounded-xl border border-white/[0.02] font-mono text-sm text-slate-300 transition-colors cursor-pointer ${
                                isBack ? "bg-red-500/10 hover:bg-red-500/20 text-red-400" : "bg-[#090a0c]/80 hover:bg-[#090a0c]"
                              }`}
                            >
                              {isBack ? "←" : key}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setQuickAmount("0")}
                          className="col-span-4 py-2 text-[10px] font-mono text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-widest cursor-pointer"
                        >
                          Limpiar Teclado
                        </button>
                      </div>

                      {/* Large Glowing Confirm Button (Screen 2 visual) */}
                      <button
                        onClick={handleQuickRegister}
                        disabled={parseInt(quickAmount) === 0}
                        className={`w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black font-bold tracking-widest uppercase text-xs shadow-lg shadow-emerald-500/5 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer ${
                          parseInt(quickAmount) === 0 ? "opacity-35 pointer-events-none" : ""
                        }`}
                      >
                        Confirmar Transacción ⚡
                      </button>

                      {quickSuccessMsg && (
                        <div className="absolute inset-x-8 bottom-24 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center font-mono text-2xs text-emerald-400">
                          Movimiento registrado correctamente en el Ledger.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setQuickAmount("0");
                          setQuickDescription("");
                        }}
                        className="text-center font-mono text-3xs text-slate-600 hover:text-slate-400 block w-full uppercase tracking-wider cursor-pointer"
                      >
                        Cancelar Registro
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Timeline audit feed */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="glass-panel rounded-3xl p-6 flex flex-col min-h-[480px] bg-[#0a0b0d]/50 border-white/[0.04]">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-slate-400" />
                          <h4 className="text-base font-bold text-white">Libro de Movimientos</h4>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {transactions.length} registros
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 max-h-[520px] pr-2 scrollbar-thin">
                        <AnimatePresence initial={false}>
                          {transactions.map((tx) => {
                            const isIncome = tx.type === "Ingreso";
                            const isReserve = tx.type === "Movimiento a Reserva";

                            return (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.02] bg-[#050608]/50 hover:bg-[#050608]/80 transition-colors"
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
                                      <span className="text-[9px] font-mono bg-black border border-white/[0.04] text-slate-500 px-1.5 py-0.25 rounded">
                                        {tx.paymentMethod === "TC" ? "CRÉDITO" : tx.paymentMethod.toUpperCase()}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-500 font-mono">
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
                                  <span className="text-[9px] font-mono uppercase text-slate-500 mt-0.5 block">
                                    {tx.type}
                                  </span>
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

            {/* --- VISTA D: AUDITORÍA (BUDGET GRID) --- */}
            {activeView === "audit" && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">Matriz de Control Mensual</h3>
                  <p className="text-sm text-slate-400">Data Grid de alta densidad informativa y auditoría presupuestaria.</p>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden bg-[#0a0b0d]/50 border-white/[0.04]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-slate-900/10 text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
                          <th className="px-6 py-4.5">Categoría</th>
                          <th className="px-6 py-4.5">Ítem / Compromiso</th>
                          <th className="px-6 py-4.5 text-right">Presupuesto Asignado</th>
                          <th className="px-6 py-4.5 text-right">Ya Pagué (Real)</th>
                          <th className="px-6 py-4.5 text-right">Falta por Pagar</th>
                          <th className="px-6 py-4.5 text-center">Estado</th>
                          <th className="px-6 py-4.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02] text-sm">
                        {budgetItems.map((item) => {
                          const outstanding = Math.max(0, item.assigned - item.paid);
                          const isPaid = outstanding === 0;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-white/[0.01] transition-colors"
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
                                  className="px-3 py-1 rounded bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
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
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-black border border-white/[0.06] rounded-2xl p-6 shadow-2xl z-10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-white">Editar Registro</h4>
                  <p className="text-xs text-slate-500">{editingItem.item} ({editingItem.category})</p>
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
                  <label className="block text-xs font-mono uppercase text-slate-550 mb-1">Presupuesto Asignado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      value={editAssignedValue}
                      onChange={(e) => setEditAssignedValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/[0.06] bg-black text-sm font-mono text-slate-200 focus:border-white/[0.15]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-550 mb-1">Ya Pagué (Real)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      value={editPaidValue}
                      onChange={(e) => setEditPaidValue(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/[0.06] bg-black text-sm font-mono text-slate-200 focus:border-white/[0.15]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.06] hover:bg-white/5 transition-all text-xs font-bold uppercase text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveBudgetEdit}
                  className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold uppercase cursor-pointer"
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
