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
  Plus,
  Trash2,
  Mic,
  Upload,
  Check,
  CheckCircle2,
  Circle,
  AlertTriangle,
  XCircle,
  Info
} from "lucide-react";

// --- TYPES ---
type Category = string;

type TransactionType = "Ingreso" | "Gasto Extra" | "Movimiento a Reserva";
type PaymentMethod = "TC" | "Débito" | "Efectivo";

interface BudgetItem {
  id: string;
  category: Category;
  item: string;
  assigned: number;
  paid: number;
  isFixed: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  category: Category;
  amount: number;
  isFixed: boolean;
}

interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  category: string;
}

const DEFAULT_CATEGORIES: string[] = [];

const getCategoryColor = (cat: string) => {
  const hash = cat.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const colors = [
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    "text-blue-400 bg-blue-500/10 border-blue-500/20",
    "text-purple-400 bg-purple-500/10 border-purple-500/20",
    "text-orange-400 bg-orange-500/10 border-orange-500/20",
    "text-red-400 bg-red-500/10 border-red-500/20",
    "text-pink-400 bg-pink-500/10 border-pink-500/20",
    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  ];
  return colors[hash % colors.length];
};

// --- CURRENCY UTILITY (Strict es-CO standard, with decimals) ---
const formatCOP = (value: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// --- COP FORMATTING AND PARSING UTILITIES FOR INPUTS ---
const parseFormattedCOP = (val: string): number => {
  if (!val) return 0;
  let clean = val.replace(/[^0-9.,-]/g, "");
  clean = clean.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const formatNumberCOP = (value: number): string => {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatOnFocusCOP = (val: string | number): string => {
  const num = typeof val === "number" ? val : parseFormattedCOP(val);
  if (num === 0) return "0";
  if (num % 1 === 0) {
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(num);
  }
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(num);
};

const formatAsYouTypeCOP = (val: string): string => {
  if (!val) return "";
  
  let normalized = val;
  if (normalized.endsWith(".")) {
    normalized = normalized.slice(0, -1) + ",";
  }
  
  let clean = normalized.replace(/[^0-9,-]/g, "");
  
  let parts = clean.split(",");
  if (parts.length > 2) {
    clean = parts[0] + "," + parts.slice(1).join("");
    parts = clean.split(",");
  }
  
  let integerPart = parts[0];
  let decimalPart = parts.length > 1 ? parts[1] : null;
  
  let rawInt = integerPart.replace(/[^0-9-]/g, "");
  let formattedInt = "";
  
  let isNegative = false;
  if (rawInt.startsWith("-")) {
    isNegative = true;
    rawInt = rawInt.substring(1);
  }
  
  if (rawInt) {
    const num = parseInt(rawInt, 10);
    formattedInt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(num);
    if (isNegative) {
      formattedInt = "-" + formattedInt;
    }
  } else if (isNegative) {
    formattedInt = "-";
  }
  
  if (decimalPart !== null) {
    return formattedInt + "," + decimalPart.substring(0, 2);
  }
  return formattedInt;
};

const handleFormattedChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
) => {
  const input = e.target;
  const originalValue = input.value;
  const selectionStart = input.selectionStart || 0;
  
  const formattedValue = formatAsYouTypeCOP(originalValue);
  const digitsBeforeCursor = originalValue.slice(0, selectionStart).replace(/[^0-9-]/g, "").length;
  
  setter(formattedValue);
  
  setTimeout(() => {
    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formattedValue.length; i++) {
      if (/[0-9-]/.test(formattedValue[i])) {
        digitCount++;
      }
      if (digitCount <= digitsBeforeCursor) {
        newCursorPos = i + 1;
      } else {
        break;
      }
    }
    input.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

const handleFormattedBlur = (
  val: string,
  setter: (val: string) => void
) => {
  if (!val) {
    setter("");
    return;
  }
  const num = parseFormattedCOP(val);
  setter(formatNumberCOP(num));
};

const handleFormattedFocus = (
  val: string,
  setter: (val: string) => void
) => {
  if (!val) return;
  setter(formatOnFocusCOP(val));
};

const getCategoryIcon = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes("vivienda")) return <Building2 className="h-3.5 w-3.5 text-yellow-400" />;
  if (c.includes("claro") || c.includes("movistar") || c.includes("netflix") || c.includes("google")) return <Sliders className="h-3.5 w-3.5 text-purple-400" />;
  if (c.includes("gym")) return <Activity className="h-3.5 w-3.5 text-orange-400" />;
  if (c.includes("transporte")) return <ArrowDownLeft className="h-3.5 w-3.5 text-pink-400" />;
  if (c.includes("aseo") || c.includes("salida")) return <Coins className="h-3.5 w-3.5 text-yellow-400" />;
  if (c.includes("ahorro")) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (c.includes("credito") || c.includes("deuda")) return <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />;
  return <FileText className="h-3.5 w-3.5 text-slate-400" />;
};

export default function TobiramaFinancialOS() {
  // --- TOAST NOTIFICATION SYSTEM ---
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "warning" | "info" }[]>([]);
  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Submission lock to prevent double clicks
  const [isActionPending, setIsActionPending] = useState(false);

  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("tobirama_auth") === "true" &&
        !!localStorage.getItem("tobirama_user") &&
        !!localStorage.getItem("tobirama_token")
      );
    }
    return false;
  });

  // Helper: returns Authorization header with stored session token
  const getAuthHeader = () => ({
    "Authorization": `Bearer ${typeof window !== "undefined" ? localStorage.getItem("tobirama_token") || "" : ""}`
  });
  const getAuthHeaderJSON = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${typeof window !== "undefined" ? localStorage.getItem("tobirama_token") || "" : ""}`
  });

  // Auth form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Current user profile
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("tobirama_profile");
        return raw ? JSON.parse(raw) : { fullName: "Usuario", role: "user", username: "" };
      } catch { return { fullName: "Usuario", role: "user", username: "" }; }
    }
    return { fullName: "Usuario", role: "user", username: "" };
  });

  const handleLogout = () => {
    localStorage.removeItem("tobirama_auth");
    localStorage.removeItem("tobirama_user");
    localStorage.removeItem("tobirama_token");
    localStorage.removeItem("tobirama_profile");
    setIsAuthenticated(false);
    setCurrentUser({ fullName: "Usuario", role: "user", username: "" });
    setUsernameInput("");
    setPasswordInput("");
    setEmailInput("");
    setFullNameInput("");
  };

  // --- REAL MOCK INITIAL STATE ---
  const INITIAL_INCOME = 5976687; // Base Global Income ($5.976.687 COP)

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);

  // Credits modal and form state
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditForm, setCreditForm] = useState({
    name: "",
    totalAmount: "",
    remainingAmount: "",
    monthlyPayment: "",
    totalInstallments: "",
    paidInstallments: "",
    category: ""
  });

  // Custom categories creation state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIsFixed, setNewCategoryIsFixed] = useState(false);

  // --- UI STATE ---
  const [activeView, setActiveView] = useState<"dashboard" | "tracker" | "audit">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editPaidValue, setEditPaidValue] = useState("");
  const [editAssignedValue, setEditAssignedValue] = useState("");
  const [editIsFixed, setEditIsFixed] = useState(false);

  // --- QUICK REGISTRATION FORM STATE (Optimized to match screen 2) ---
  const [inputMode, setInputMode] = useState<"keypad" | "voice" | "invoice">("keypad");
  const [quickAmount, setQuickAmount] = useState("0,00");
  const [quickCategory, setQuickCategory] = useState<Category>("Vivienda");
  const [customCategory, setCustomCategory] = useState("");
  const [quickMethod, setQuickMethod] = useState<PaymentMethod>("Débito");
  const [quickType, setQuickType] = useState<TransactionType>("Gasto Extra");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quickIsFixed, setQuickIsFixed] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  });
  const [quickSuccessMsg, setQuickSuccessMsg] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceParsedInfo, setVoiceParsedInfo] = useState<string | null>(null);

  // Invoice States
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{comercio: string; total: number; fecha: string; categoria: string; descripcion: string} | null>(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [aiTips, setAiTips] = useState<{titulo: string; consejo: string; gravedad: "INFO" | "WARNING" | "SUCCESS"}[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

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

  // Real-time API synchronization helpers
  const fetchFromServer = async () => {
    try {
      const headers = getAuthHeader();
      const [txRes, budgetRes, creditsRes] = await Promise.all([
        fetch("/api/transactions", { headers }),
        fetch("/api/budget", { headers }),
        fetch("/api/credits", { headers })
      ]);
      if (txRes.ok && budgetRes.ok && creditsRes.ok) {
        const txData = await txRes.json();
        const budgetData = await budgetRes.json();
        const creditsData = await creditsRes.json();
        setTransactions(txData);
        setBudgetItems(budgetData);
        setCredits(creditsData);
      }
    } catch (err) {
      console.error("Failed to sync with real-time DB:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFromServer();
      const interval = setInterval(fetchFromServer, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Default quickCategory to the first available category or 'Otra...' if empty
  useEffect(() => {
    if (budgetItems.length > 0) {
      if (!quickCategory || quickCategory === "Otra..." ? false : !budgetItems.some((item) => item.category === quickCategory)) {
        setQuickCategory(budgetItems[0].category as any);
      }
    } else {
      setQuickCategory("Otra..." as any);
    }
  }, [budgetItems, quickCategory]);

  // Watch category selection to auto-classify fixed vs variable
  useEffect(() => {
    const matched = budgetItems.find((item) => item.category === quickCategory);
    if (matched) {
      setQuickIsFixed(matched.isFixed);
    } else {
      setQuickIsFixed(false);
    }
  }, [quickCategory, budgetItems]);

  // --- COMPUTE CATEGORIES LIST ---
  const CATEGORIES = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    budgetItems.forEach((item) => cats.add(item.category));
    credits.forEach((c) => cats.add(c.category));
    transactions.forEach((tx) => {
      if (tx.category && tx.category !== "Ingresos") {
        cats.add(tx.category);
      }
    });
    return Array.from(cats);
  }, [budgetItems, credits, transactions]);

  const categoriesForSelection = useMemo(() => {
    if (quickType === "Ingreso") {
      const incomeCats = CATEGORIES.filter(
        (c) =>
          c === "Ingresos" ||
          c.toLowerCase().includes("ingreso") ||
          c.toLowerCase().includes("sueldo") ||
          c.toLowerCase().includes("freelance") ||
          c.toLowerCase().includes("rendimiento")
      );
      if (!incomeCats.includes("Ingresos")) {
        incomeCats.unshift("Ingresos");
      }
      return [...incomeCats, "Otra..."];
    } else if (quickType === "Movimiento a Reserva") {
      const reserveCats = CATEGORIES.filter(
        (c) =>
          c === "Ahorro / Reserva" ||
          c.toLowerCase().includes("ahorro") ||
          c.toLowerCase().includes("reserva") ||
          c.toLowerCase().includes("fondo") ||
          c.toLowerCase().includes("colchón")
      );
      if (!reserveCats.includes("Ahorro / Reserva")) {
        reserveCats.unshift("Ahorro / Reserva");
      }
      return [...reserveCats, "Otra..."];
    } else {
      const expenseCats = CATEGORIES.filter(
        (c) =>
          c !== "Ingresos" &&
          c !== "Ahorro / Reserva" &&
          !c.toLowerCase().includes("ahorro / reserva")
      );
      if (expenseCats.length === 0) {
        expenseCats.push("Otros");
      }
      return [...expenseCats, "Otra..."];
    }
  }, [CATEGORIES, quickType]);

  // --- UI/UX Helpers for Visual Capture Form ---
  const visualFormConfig = useMemo(() => {
    const isIncome = quickType === "Ingreso";
    const isReserve = quickType === "Movimiento a Reserva";

    return {
      cardBorder: isIncome 
        ? "border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.06)] bg-gradient-to-b from-[#020603] to-[#040507]" 
        : isReserve
          ? "border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.06)] bg-gradient-to-b from-[#020306] to-[#040507]"
          : "border-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.06)] bg-gradient-to-b from-[#060202] to-[#040507]",
      typeColor: isIncome
        ? "text-emerald-400"
        : isReserve
          ? "text-blue-400"
          : "text-red-400 font-semibold",
      amountLabel: isIncome
        ? "Monto del Ingreso"
        : isReserve
          ? "Monto de la Reserva / Ahorro"
          : "Monto del Gasto",
      amountRing: isIncome
        ? "focus-within:border-emerald-500/30"
        : isReserve
          ? "focus-within:border-blue-500/30"
          : "focus-within:border-red-500/30",
      descLabel: isIncome
        ? "Detalle del Ingreso"
        : isReserve
          ? "Detalle de la Reserva / Ahorro"
          : "Detalle del Gasto",
      descPlaceholder: isIncome
        ? "Concepto o Procedencia (Ej. Pago de Nómina)"
        : isReserve
          ? "Fondo de destino (Ej. Colchón de Emergencias)"
          : "Comercio o Concepto (Ej. Gasolina Copec)",
      payMethodLabel: isIncome
        ? "Recibido en (Cuenta/Caja)"
        : isReserve
          ? "Origen del Dinero"
          : "Método de Pago",
      confirmBtnBg: isIncome
        ? "bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black shadow-emerald-500/5"
        : isReserve
          ? "bg-gradient-to-r from-blue-500 to-indigo-400 hover:from-blue-400 hover:to-indigo-300 text-white shadow-blue-500/5"
          : "bg-gradient-to-r from-red-500 to-rose-400 hover:from-red-400 hover:to-rose-350 text-white shadow-red-500/5",
      confirmBtnText: isIncome
        ? "Confirmar Ingreso 💰"
        : isReserve
          ? "Confirmar Reserva 🛡️"
          : "Confirmar Gasto 💸"
    };
  }, [quickType]);

  // --- DYNAMIC MONTHLY BUDGETITEMS COMPUTATION ---
  const monthlyBudgetItems = useMemo(() => {
    const items = budgetItems.map((item) => {
      // Compute dynamically spent in selectedMonth for this category
      const spentInMonth = transactions
        .filter(
          (t) =>
            t.category === item.category &&
            t.date.startsWith(selectedMonth) &&
            (t.type === "Gasto Extra" || t.type === "Movimiento a Reserva")
        )
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...item,
        paid: spentInMonth,
      };
    });

    credits.forEach((credit) => {
      const spentInMonth = transactions
        .filter(
          (t) =>
            t.category === credit.category &&
            t.date.startsWith(selectedMonth) &&
            (t.type === "Gasto Extra" || t.type === "Movimiento a Reserva")
        )
        .reduce((sum, t) => sum + t.amount, 0);

      items.push({
        id: `credit-${credit.id}`,
        category: credit.category,
        item: `${credit.name} (Cuota ${credit.paidInstallments}/${credit.totalInstallments})`,
        assigned: credit.monthlyPayment,
        paid: spentInMonth,
        isFixed: true,
        isCredit: true,
        creditId: credit.id
      } as any);
    });

    return items;
  }, [budgetItems, transactions, credits, selectedMonth]);

  // --- REAL-TIME ANALYSIS COMPUTATIONS ---
  const flowMetrics = useMemo(() => {
    const monthlyTxs = transactions.filter((t) => t.date.startsWith(selectedMonth));

    const totalIncomes = monthlyTxs
      .filter((t) => t.type === "Ingreso")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTxs
      .filter((t) => t.type === "Gasto Extra")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalReserves = monthlyTxs
      .filter((t) => t.type === "Movimiento a Reserva")
      .reduce((sum, t) => sum + t.amount, 0);

    const spendRatio = totalIncomes > 0 ? (totalExpenses / totalIncomes) * 100 : 0;
    const savingsRatio = totalIncomes > 0 ? (totalReserves / totalIncomes) * 100 : 0;

    // Fixed vs Variable breakdown
    const totalFixedIncomes = monthlyTxs
      .filter((t) => t.type === "Ingreso" && t.isFixed)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalVariableIncomes = monthlyTxs
      .filter((t) => t.type === "Ingreso" && !t.isFixed)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalFixedExpenses = monthlyTxs
      .filter((t) => t.type === "Gasto Extra" && t.isFixed)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalVariableExpenses = monthlyTxs
      .filter((t) => (t.type === "Gasto Extra" || t.type === "Movimiento a Reserva") && !t.isFixed)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Group transactions by category to find top spend category
    const categorySpent: { [key: string]: number } = {};
    monthlyTxs.forEach(t => {
      if (t.type === "Gasto Extra" || t.type === "Movimiento a Reserva") {
        categorySpent[t.category] = (categorySpent[t.category] || 0) + t.amount;
      }
    });

    const sortedCats = Object.entries(categorySpent)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = sortedCats[0] || null;
    const topCategoryPercent = totalExpenses + totalReserves > 0 && topCategory
      ? (topCategory.amount / (totalExpenses + totalReserves)) * 100
      : 0;

    return {
      totalIncomes,
      totalExpenses,
      totalReserves,
      spendRatio,
      savingsRatio,
      totalFixedIncomes,
      totalVariableIncomes,
      totalFixedExpenses,
      totalVariableExpenses,
      topCategory,
      topCategoryPercent,
      sortedCats
    };
  }, [transactions, selectedMonth]);

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
    const savingsAmount = transactions
      .filter((t) => t.type === "Movimiento a Reserva" || t.category.toLowerCase().includes("ahorro"))
      .reduce((sum, t) => sum + t.amount, 0);
    return pocketLiquidity + savingsAmount;
  }, [pocketLiquidity, transactions]);

  // Deuda Erradicada (Including Credits & Budget Debts)
  const debtMetrics = useMemo(() => {
    const targetCategories: Category[] = ["Deudas de Consumo", "Tarjetas de Crédito"];
    const debtItems = monthlyBudgetItems.filter((item) => targetCategories.includes(item.category) && !(item as any).isCredit);
    const budgetAssigned = debtItems.reduce((sum, item) => sum + item.assigned, 0);
    const budgetPaid = debtItems.reduce((sum, item) => sum + item.paid, 0);

    const creditsTotal = credits.reduce((sum, c) => sum + c.totalAmount, 0);
    const creditsRemaining = credits.reduce((sum, c) => sum + c.remainingAmount, 0);
    const creditsPaid = Math.max(0, creditsTotal - creditsRemaining);

    const totalOriginalDebt = budgetAssigned + creditsTotal;
    const totalRemainingDebt = Math.max(0, (budgetAssigned - budgetPaid) + creditsRemaining);
    const totalPaidDebt = Math.max(0, totalOriginalDebt - totalRemainingDebt);

    const percentage = totalOriginalDebt > 0 ? (totalPaidDebt / totalOriginalDebt) * 100 : 100;
    return {
      percentage,
      totalAssigned: totalOriginalDebt,
      totalPaid: totalPaidDebt,
      totalPending: totalRemainingDebt,
    };
  }, [monthlyBudgetItems, credits]);

  // Burn Rate mensual (gasto acumulado real de compromisos pagados)
  const monthlyBurn = useMemo(() => {
    return monthlyBudgetItems.reduce((sum, item) => sum + item.paid, 0);
  }, [monthlyBudgetItems]);

  // Output Distribution Matrix
  const distributionMatrix = useMemo(() => {
    return monthlyBudgetItems.map((item) => {
      const percentage = item.assigned > 0 ? (item.paid / item.assigned) * 100 : 0;
      return {
        ...item,
        percentage: Math.min(100, Math.max(0, percentage)),
        pending: Math.max(0, item.assigned - item.paid),
      };
    });
  }, [monthlyBudgetItems]);

  // --- DYNAMIC ASSET TRAJECTORY GENERATOR (SVG-based Wave Chart) ---
  const { chartPathData, trajectoryPoints } = useMemo(() => {
    const monthlyTxs = transactions
      .filter((t) => t.date.startsWith(selectedMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    let currentBalance = 0;
    const points: { date: string; balance: number }[] = [];
    
    monthlyTxs.forEach((tx) => {
      if (tx.type === "Ingreso") {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      points.push({ date: tx.date, balance: currentBalance });
    });

    if (points.length === 0) return { chartPathData: { linePath: "", areaPath: "", points: [] }, trajectoryPoints: [] };
    
    const maxVal = Math.max(...points.map(p => p.balance), 100000);
    const minVal = Math.min(...points.map(p => p.balance), 0);
    const valRange = maxVal - minVal || 1;
    
    const width = 500;
    const height = 150; 
    
    const svgPoints = points.map((p, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * width : width / 2;
      const y = height - ((p.balance - minVal) / valRange) * (height - 20) - 10;
      return { x, y, balance: p.balance, date: p.date };
    });
    
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
  }, [transactions, selectedMonth]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) {
      showToast("Inicio de sesión en progreso. Por favor, espera...", "info");
      return;
    }
    if (!usernameInput.trim()) {
      setLoginError("Ingresa tu usuario");
      return;
    }
    setIsAuthLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: usernameInput.trim(),
          password: passwordInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const profile = { fullName: data.fullName || data.userId, role: data.role || "user", username: data.username || data.userId };
        if (typeof window !== "undefined") {
          localStorage.setItem("tobirama_auth", "true");
          localStorage.setItem("tobirama_user", data.userId);
          localStorage.setItem("tobirama_token", data.token);
          localStorage.setItem("tobirama_profile", JSON.stringify(profile));
        }
        setCurrentUser(profile);
        setIsAuthenticated(true);
        setLoginError("");
        showToast("Sesión iniciada correctamente.", "success");
        const now = new Date().toLocaleTimeString();
        setTerminalLogs((prev) => [
          ...prev,
          `[${now}] SEGURIDAD: Usuario '${data.userId}' autenticado correctamente a través del Gateway seguro.`
        ]);
      } else {
        setLoginError(data.error || "Usuario o contraseña incorrectos");
        showToast(data.error || "Usuario o contraseña incorrectos", "error");
      }
    } catch {
      setLoginError("Error de conexión. Intenta de nuevo.");
      showToast("Error de conexión al servidor.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) {
      showToast("Registro en progreso. Por favor, espera...", "info");
      return;
    }
    setLoginError("");
    if (passwordInput !== confirmPasswordInput) {
      setLoginError("Las contraseñas no coinciden");
      return;
    }
    if (passwordInput.length < 8) {
      setLoginError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: usernameInput.trim(),
          password: passwordInput,
          email: emailInput.trim(),
          fullName: fullNameInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const profile = { fullName: data.fullName || data.userId, role: data.role || "user", username: data.username || data.userId };
        if (typeof window !== "undefined") {
          localStorage.setItem("tobirama_auth", "true");
          localStorage.setItem("tobirama_user", data.userId);
          localStorage.setItem("tobirama_token", data.token);
          localStorage.setItem("tobirama_profile", JSON.stringify(profile));
        }
        setCurrentUser(profile);
        setIsAuthenticated(true);
        setLoginError("");
        showToast("¡Registro exitoso! Bienvenido a Tobirama OS.", "success");
      } else {
        setLoginError(data.error || "Error al registrarse");
        showToast(data.error || "Error al registrarse", "error");
      }
    } catch {
      setLoginError("Error de conexión. Intenta de nuevo.");
      showToast("Error de conexión al servidor.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEditBudget = (item: BudgetItem) => {
    setEditingItem(item);
    setEditPaidValue(formatOnFocusCOP(item.paid));
    setEditAssignedValue(formatOnFocusCOP(item.assigned));
    setEditIsFixed(item.isFixed ?? false);
  };

  const saveBudgetEdit = async () => {
    if (!editingItem) return;
    if (isActionPending) {
      showToast("Ya hay una acción en progreso. Por favor, espera.", "warning");
      return;
    }

    setIsActionPending(true);

    const newPaid = parseFormattedCOP(editPaidValue) || 0;
    const newAssigned = parseFormattedCOP(editAssignedValue) || 0;

    // Optimistically update budget items locally
    setBudgetItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id ? { ...item, paid: newPaid, assigned: newAssigned, isFixed: editIsFixed } : item
      )
    );

    // Reactively insert a transaction to adjust cash ledger
    const diff = newPaid - editingItem.paid;
    let adjustmentTx: Transaction | null = null;
    if (diff !== 0) {
      adjustmentTx = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: `Ajuste presupuesto: ${editingItem.item}`,
        type: diff > 0 ? "Gasto Extra" : "Ingreso",
        paymentMethod: "Débito",
        category: editingItem.category,
        amount: Math.abs(diff),
        isFixed: editIsFixed,
      };
      setTransactions((prev) => [adjustmentTx!, ...prev]);

      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${timeStr}] AUDIT_LOG: Presupuesto '${editingItem.item}' modificado. Ajuste de ${formatCOP(Math.abs(diff))} registrado.`
      ]);
    }

    // Close modal and reset editing state IMMEDIATELY (optimistic UX)
    const itemBackup = { ...editingItem };
    setEditingItem(null);
    showToast("Presupuesto modificado con éxito.", "success");

    try {
      const headers = getAuthHeaderJSON();
      // Update the budget item on database
      const budgetRes = await fetch("/api/budget", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: itemBackup.id,
          assigned: newAssigned,
          paid: newPaid,
          isFixed: editIsFixed
        }),
      });

      // If there was a difference, write the transaction adjustment
      if (adjustmentTx) {
        await fetch("/api/transactions", {
          method: "POST",
          headers,
          body: JSON.stringify(adjustmentTx),
        });
      }

      if (!budgetRes.ok) {
        throw new Error("Failed to update budget on DB");
      }
      fetchFromServer(); // Refresh in background
    } catch (err) {
      console.error("Failed to sync budget edit with DB:", err);
      showToast("Error al guardar cambios en el servidor.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionPending) {
      showToast("Ya hay una acción en progreso. Por favor, espera.", "warning");
      return;
    }

    const catName = newCategoryName.trim();
    if (!catName) return;

    if (budgetItems.some((item) => item.category.toLowerCase() === catName.toLowerCase())) {
      showToast("Esta categoría ya existe.", "warning");
      return;
    }

    setIsActionPending(true);

    const newItem: BudgetItem = {
      id: `b-${Date.now()}`,
      category: catName,
      item: catName,
      assigned: 0,
      paid: 0,
      isFixed: newCategoryIsFixed,
    };

    setBudgetItems((prev) => [...prev, newItem]);
    setNewCategoryName("");
    showToast(`Categoría '${catName}' añadida con éxito.`, "success");

    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: getAuthHeaderJSON(),
        body: JSON.stringify({
          id: newItem.id,
          assigned: 0,
          paid: 0,
          isFixed: newItem.isFixed,
          category: newItem.category,
          item: newItem.item,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create new budget category");
      }
      fetchFromServer();
    } catch (err) {
      console.error("Failed to add new budget item:", err);
      showToast("Error al sincronizar categoría con el servidor.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  // Quick register transaction form submission (Vista C - Screen 2 style)
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountVal = parseFormattedCOP(quickAmount) || 0;
    if (amountVal <= 0) return;

    const finalCategory = quickCategory === "Otra..." ? (customCategory.trim() || "Otros") : quickCategory;
    const desc = quickDescription.trim() || `Transacción flash: ${finalCategory}`;

    // Add transaction to central state
    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      date: quickDate || new Date().toISOString().split("T")[0],
      description: desc,
      type: quickType,
      paymentMethod: quickMethod,
      category: finalCategory,
      amount: amountVal,
      isFixed: quickIsFixed,
    };

    // Optimistic UI updates
    setTransactions((prev) => [newTx, ...prev]);

    // Reactively update budget items
    if (quickType === "Gasto Extra" || quickType === "Movimiento a Reserva") {
      setBudgetItems((prev) => {
        let categoryFound = false;
        const updated = prev.map((item) => {
          if (item.category === finalCategory) {
            categoryFound = true;
            return {
              ...item,
              paid: item.paid + amountVal,
              assigned: item.assigned === 0 ? amountVal : item.assigned,
            };
          }
          return item;
        });
        if (!categoryFound) {
          updated.push({
            id: `b-${Date.now()}`,
            category: finalCategory,
            item: finalCategory,
            assigned: amountVal,
            paid: amountVal,
            isFixed: quickIsFixed,
          });
        }
        return updated;
      });
    }

    // Clear form immediately so the action feels instantaneous
    setQuickAmount("0,00");
    setQuickDescription("");
    setCustomCategory("");
    if (quickCategory === "Otra...") {
      setQuickCategory("Vivienda"); // reset
    }

    // Show high-visibility success feedback instantly
    showToast(`Transacción de ${formatCOP(amountVal)} registrada con éxito.`, "success");
    setQuickSuccessMsg(true);
    setJustSaved(true);
    setTimeout(() => { setQuickSuccessMsg(false); setJustSaved(false); }, 2200);

    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${timeStr}] TRANSACCIÓN: Registro flash de ${formatCOP(amountVal)} en la categoría '${finalCategory}' añadido.`
    ]);

    // Fire-and-forget DB save — no re-fetch to keep UI instant
    fetch("/api/transactions", {
      method: "POST",
      headers: getAuthHeaderJSON(),
      body: JSON.stringify(newTx),
    }).catch(() => {
      showToast("Error de red al guardar en la base de datos.", "warning");
    });
  };

  // REACTIVE TRANSACTION DELETION (Clear data cleanly)
  const handleDeleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    // Remove from central list
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Reactively subtract the payment from the corresponding budget item if it was an expense
    if (txToDelete.type === "Gasto Extra" || txToDelete.type === "Movimiento a Reserva") {
      setBudgetItems((prev) =>
        prev.map((item) => {
          if (item.category === txToDelete.category) {
            return {
              ...item,
              paid: Math.max(0, item.paid - txToDelete.amount),
            };
          }
          return item;
        })
      );
    }

    showToast(`Transacción '${txToDelete.description}' eliminada con éxito.`, "info");

    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error("Failed to delete transaction on DB");
      }
      fetchFromServer(); // Sync ledger
    } catch (err) {
      console.error("Failed to delete transaction from DB:", err);
      showToast("Error al eliminar la transacción del servidor.", "error");
    }

    // Append terminal logs
    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${timeStr}] ELIMINACIÓN: Transacción '${txToDelete.description}' de ${formatCOP(txToDelete.amount)} fue eliminada del Ledger.`
    ]);
  };

  const handleDeleteBudget = async (id: string) => {
    const itemToDelete = budgetItems.find((item) => item.id === id);
    if (!itemToDelete) return;
    if (isActionPending) {
      showToast("Ya hay una acción en progreso. Por favor, espera.", "warning");
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${itemToDelete.category}"? Esto borrará el registro de presupuesto asociado.`)) {
      return;
    }

    setIsActionPending(true);

    // Optimistically update locally
    setBudgetItems((prev) => prev.filter((item) => item.id !== id));
    showToast(`Categoría '${itemToDelete.category}' eliminada con éxito.`, "info");

    try {
      const res = await fetch(`/api/budget?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error("Failed to delete budget item on DB");
      }
      fetchFromServer();
      
      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${timeStr}] CATEGORÍA: La categoría '${itemToDelete.category}' fue eliminada del presupuesto.`
      ]);
    } catch (err) {
      console.error("Failed to delete budget item from DB:", err);
      showToast("Error al eliminar la categoría del servidor.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTogglePaid = async (item: any) => {
    if (item.isCredit) {
      const credit = credits.find(c => c.id === item.creditId);
      if (!credit) return;

      const isCurrentlyPaid = item.paid >= item.assigned && item.assigned > 0;
      
      if (isCurrentlyPaid) {
        // Find the transaction for this credit category in this month and delete it
        const txToDelete = transactions.find(
          (t) =>
            t.category === credit.category &&
            t.date.startsWith(selectedMonth) &&
            (t.type === "Gasto Extra" || t.type === "Movimiento a Reserva")
        );
        if (txToDelete) {
          // Optimistically delete transaction
          setTransactions(prev => prev.filter(t => t.id !== txToDelete.id));
          
          // Optimistically update credit locally
          setCredits(prev => prev.map(c => c.id === credit.id ? {
            ...c,
            paidInstallments: Math.max(0, c.paidInstallments - 1),
            remainingAmount: c.remainingAmount + txToDelete.amount
          } : c));

          const timeStr = new Date().toLocaleTimeString();
          setTerminalLogs((prev) => [
            ...prev,
            `[${timeStr}] CRÉDITO: Abono a '${credit.name}' marcado como PENDIENTE. Eliminando transacción.`
          ]);
          showToast(`Abono a '${credit.name}' marcado como PENDIENTE.`, "info");

          try {
            await fetch(`/api/transactions?id=${txToDelete.id}`, { 
              method: "DELETE",
              headers: getAuthHeader()
            });
            fetchFromServer();
          } catch (err) {
            console.error("Failed to delete credit payment transaction:", err);
          }
        }
      } else {
        // Register a new payment transaction
        const newTx: Transaction = {
          id: `t-${Date.now()}`,
          date: selectedMonth === new Date().toISOString().slice(0, 7)
            ? new Date().toISOString().split("T")[0]
            : `${selectedMonth}-01`,
          description: `Pago Cuota: ${credit.name}`,
          type: "Gasto Extra",
          paymentMethod: "Débito",
          category: credit.category,
          amount: credit.monthlyPayment,
          isFixed: true
        };

        // Optimistically add transaction
        setTransactions(prev => [newTx, ...prev]);

        // Optimistically update credit locally
        setCredits(prev => prev.map(c => c.id === credit.id ? {
          ...c,
          paidInstallments: Math.min(c.totalInstallments, c.paidInstallments + 1),
          remainingAmount: Math.max(0, c.remainingAmount - credit.monthlyPayment)
        } : c));

        const timeStr = new Date().toLocaleTimeString();
        setTerminalLogs((prev) => [
          ...prev,
          `[${timeStr}] CRÉDITO: Abono a '${credit.name}' de ${formatCOP(credit.monthlyPayment)} registrado como PAGADO.`
        ]);
        showToast(`Abono a '${credit.name}' registrado como PAGADO.`, "success");

        try {
          await fetch("/api/transactions", {
            method: "POST",
            headers: getAuthHeaderJSON(),
            body: JSON.stringify(newTx),
          });
          fetchFromServer();
        } catch (err) {
          console.error("Failed to save credit payment transaction:", err);
        }
      }
      return;
    }

    const isCurrentlyPaid = item.paid >= item.assigned && item.assigned > 0;
    const newPaid = isCurrentlyPaid ? 0 : item.assigned;

    // Optimistically update locally
    setBudgetItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, paid: newPaid } : i))
    );

    // Transaction adjustment
    const diff = newPaid - item.paid;
    let adjustmentTx: Transaction | null = null;
    if (diff !== 0) {
      adjustmentTx = {
        id: `t-${Date.now()}`,
        date: selectedMonth === new Date().toISOString().slice(0, 7)
          ? new Date().toISOString().split("T")[0]
          : `${selectedMonth}-01`,
        description: diff > 0 ? `Pago rápido: ${item.item}` : `Ajuste débito: ${item.item}`,
        type: diff > 0 ? "Gasto Extra" : "Ingreso",
        paymentMethod: "Débito",
        category: item.category,
        amount: Math.abs(diff),
        isFixed: item.isFixed,
      };
      setTransactions((prev) => [adjustmentTx!, ...prev]);

      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${timeStr}] PAGO RÁPIDO: Registro de ajuste por ${formatCOP(Math.abs(diff))} en '${item.category}'.`
      ]);
      if (newPaid > 0) {
        showToast(`Marcado como PAGADO: ${item.item} (${formatCOP(newPaid)})`, "success");
      } else {
        showToast(`Marcado como PENDIENTE: ${item.item}`, "info");
      }
    }

    try {
      const headers = getAuthHeaderJSON();
      await fetch("/api/budget", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: item.id,
          assigned: item.assigned,
          paid: newPaid,
          isFixed: item.isFixed,
          category: item.category,
          item: item.item
        }),
      });

      if (adjustmentTx) {
        await fetch("/api/transactions", {
          method: "POST",
          headers,
          body: JSON.stringify(adjustmentTx),
        });
      }
      fetchFromServer();
    } catch (err) {
      console.error("Failed to toggle paid state on server:", err);
    }
  };

  const handleResetDb = async () => {
    if (!confirm("⚠️ ADVERTENCIA MÁXIMA: ¿Estás seguro de restablecer por completo la base de datos? Esto eliminará permanentemente todas tus transacciones y pondrá todos los presupuestos en $0. Esta acción es irreversible.")) {
      return;
    }

    // Optimistic UI updates
    setTransactions([]);
    setBudgetItems([]);
    setCredits([]);

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error("Failed to reset DB on server");
      }
      fetchFromServer();

      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [
        ...prev,
        `[${timeStr}] MANTENIMIENTO: Base de datos restablecida correctamente. Sistema limpio.`
      ]);
      alert("La base de datos ha sido restablecida con éxito. Todo el sistema está en $0.");
    } catch (err) {
      console.error("Failed to reset database:", err);
      alert("Hubo un error al restablecer la base de datos.");
    }
  };

  const handleAddCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionPending) {
      showToast("Ya hay una acción en progreso. Por favor, espera.", "warning");
      return;
    }
    const totalAmt = parseFormattedCOP(creditForm.totalAmount) || 0;
    const remainingAmt = parseFormattedCOP(creditForm.remainingAmount) || 0;
    const monthlyPay = parseFormattedCOP(creditForm.monthlyPayment) || 0;
    const totalInst = parseInt(creditForm.totalInstallments) || 0;
    const paidInst = parseInt(creditForm.paidInstallments) || 0;
    const categoryVal = creditForm.category.trim();

    if (!creditForm.name || totalAmt <= 0 || !categoryVal) return;

    setIsActionPending(true);

    const newCredit: Credit = {
      id: `c-${Date.now()}`,
      name: creditForm.name.trim(),
      totalAmount: totalAmt,
      remainingAmount: remainingAmt,
      monthlyPayment: monthlyPay,
      totalInstallments: totalInst,
      paidInstallments: paidInst,
      category: categoryVal
    };

    // Optimistically update locally
    setCredits((prev) => [...prev, newCredit]);
    setShowCreditModal(false);
    setCreditForm({
      name: "",
      totalAmount: "",
      remainingAmount: "",
      monthlyPayment: "",
      totalInstallments: "",
      paidInstallments: "",
      category: ""
    });

    showToast(`Crédito '${newCredit.name}' registrado con éxito.`, "success");

    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${timeStr}] CRÉDITO: Se registró un nuevo crédito '${newCredit.name}' en la categoría '${newCredit.category}'.`
    ]);

    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: getAuthHeaderJSON(),
        body: JSON.stringify(newCredit)
      });
      if (!res.ok) {
        throw new Error("Failed to create credit on server");
      }
      fetchFromServer();
    } catch (err) {
      console.error("Failed to add credit:", err);
      showToast("Error al registrar el crédito en el servidor.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDeleteCredit = async (id: string) => {
    const creditToDelete = credits.find(c => c.id === id);
    if (!creditToDelete) return;
    if (isActionPending) {
      showToast("Ya hay una acción en progreso. Por favor, espera.", "warning");
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar el crédito "${creditToDelete.name}"?`)) return;

    setIsActionPending(true);

    // Optimistically update locally
    setCredits((prev) => prev.filter((c) => c.id !== id));
    showToast(`Crédito '${creditToDelete.name}' eliminado con éxito.`, "info");

    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      `[${timeStr}] CRÉDITO: El crédito '${creditToDelete.name}' fue eliminado del sistema.`
    ]);

    try {
      const res = await fetch(`/api/credits?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error("Failed to delete credit on server");
      }
      fetchFromServer();
    } catch (err) {
      console.error("Failed to delete credit:", err);
      showToast("Error al eliminar el crédito del servidor.", "error");
    } finally {
      setIsActionPending(false);
    }
  };

  // --- VOICE SPEECH RECOGNITION PARSER (Web Speech API) ---
  const handleVoiceListen = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Tu navegador no soporta el reconocimiento de voz. Usa Chrome, Edge o Safari.");
      // Simulated fallback for demonstration
      simulateVoiceInput();
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText("Escuchando... Habla ahora...");
      setVoiceParsedInfo(null);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceText("Error al capturar voz. Inténtelo de nuevo.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setVoiceText(`Dijiste: "${speechToText}"`);
      parseVoiceCommand(speechToText);
    };

    recognition.start();
  };

  // Simulated voice parsing fallback
  const simulateVoiceInput = () => {
    setIsListening(true);
    setVoiceText("Simulando comando de voz...");
    setTimeout(() => {
      const mockCommands = [
        "gasto ciento cuarenta mil pesos en mercado con tarjeta",
        "gasto sesenta y cinco mil pesos en gastos fijos con debito",
        "ingreso cincuenta mil pesos",
        "reserva o ahorro doscientos mil en nu"
      ];
      const selected = mockCommands[Math.floor(Math.random() * mockCommands.length)];
      setVoiceText(`Simulado: "${selected}"`);
      parseVoiceCommand(selected);
      setIsListening(false);
    }, 1500);
  };

  // Parse voice text for numeric amounts, categories, and payment methods
  const parseVoiceCommand = (text: string) => {
    const cleaned = text.toLowerCase();
    
    // Parse Amount (Extract digits or translate key Spanish numbers)
    let parsedAmount = 0;
    
    // Check digits
    const digitMatch = cleaned.match(/\d+/g);
    if (digitMatch) {
      parsedAmount = parseInt(digitMatch.join(""));
    } else {
      // Basic text parser for Spanish numbers
      if (cleaned.includes("cien mil")) parsedAmount = 100000;
      else if (cleaned.includes("doscientos mil")) parsedAmount = 200000;
      else if (cleaned.includes("cincuenta mil")) parsedAmount = 50000;
      else if (cleaned.includes("sesenta mil")) parsedAmount = 60000;
      else if (cleaned.includes("ochenta mil")) parsedAmount = 80000;
      else if (cleaned.includes("ciento cuarenta mil")) parsedAmount = 140000;
      else if (cleaned.includes("un millon") || cleaned.includes("un millón")) parsedAmount = 1000000;
    }

    // Parse Category
    let category: Category = "Estilo de Vida / Mercado";
    if (cleaned.includes("vivienda") || cleaned.includes("cuota") || cleaned.includes("tamarindo")) {
      category = "Vivienda";
    } else if (cleaned.includes("deuda") || cleaned.includes("addi") || cleaned.includes("credito") || cleaned.includes("crédito")) {
      category = "Deudas de Consumo";
    } else if (cleaned.includes("tarjeta") || cleaned.includes("cupo")) {
      category = "Tarjetas de Crédito";
    } else if (cleaned.includes("fijo") || cleaned.includes("internet") || cleaned.includes("madre") || cleaned.includes("apoyo")) {
      category = "Gastos Fijos";
    } else if (cleaned.includes("ahorro") || cleaned.includes("reserva") || cleaned.includes("nu") || cleaned.includes("lulo")) {
      category = "Ahorro / Reserva";
    } else if (cleaned.includes("mercado") || cleaned.includes("estilo") || cleaned.includes("comida") || cleaned.includes("restaurante")) {
      category = "Estilo de Vida / Mercado";
    }

    // Parse Method
    let method: PaymentMethod = "Débito";
    if (cleaned.includes("debito") || cleaned.includes("débito")) {
      method = "Débito";
    } else if (cleaned.includes("tarjeta") || cleaned.includes("credito") || cleaned.includes("crédito") || cleaned.includes("tc")) {
      method = "TC";
    } else if (cleaned.includes("efectivo") || cleaned.includes("plata")) {
      method = "Efectivo";
    }

    // Parse Transaction Type
    let type: TransactionType = "Gasto Extra";
    if (cleaned.includes("ingreso") || cleaned.includes("nomina") || cleaned.includes("nómina")) {
      type = "Ingreso";
    } else if (cleaned.includes("ahorro") || cleaned.includes("reserva") || cleaned.includes("guardar")) {
      type = "Movimiento a Reserva";
    }

    if (parsedAmount > 0) {
      setQuickAmount(formatNumberCOP(parsedAmount));
      setQuickCategory(category);
      setQuickMethod(method);
      setQuickType(type);
      setQuickDescription(`Voz: ${text.length > 30 ? text.slice(0, 28) + "..." : text}`);
      setVoiceParsedInfo(`Monto: ${formatCOP(parsedAmount)} | Categoría: ${category} | Método: ${method}`);
    } else {
      setVoiceParsedInfo("No se pudo identificar el monto. Intente diciendo la cantidad en números.");
    }
  };

  // --- ESCÁNER DE FACTURAS CON GEMINI AI ---
  const invoiceInputRef = React.useRef<HTMLInputElement>(null);

  // --- UTILS PARA ESCÁNER: COMPRESIÓN Y LUMINOSIDAD ---
  const compressAndAnalyzeImage = (file: File): Promise<{ file: File; isDark: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ file, isDark: false });
          return;
        }

        // Redimensionar si supera 1024px para mantener el OCR rápido e instantáneo
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Analizar brillo promedio
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          let totalLuminance = 0;
          const pixelCount = data.length / 4;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Fórmula estándar de luminancia
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += lum;
          }
          const avgLuminance = totalLuminance / pixelCount;
          // Si el brillo promedio es < 50, se considera muy oscura
          const isDark = avgLuminance < 50;

          // Comprimir como JPEG con 82% de calidad (OCR perfecto y archivo liviano ~150-200KB)
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve({ file: compressedFile, isDark });
            } else {
              resolve({ file, isDark });
            }
          }, "image/jpeg", 0.82);

        } catch (err) {
          console.error("Error al procesar canvas:", err);
          resolve({ file, isDark: false });
        }
      };
      img.onerror = () => {
        resolve({ file, isDark: false });
      };
    });
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    setIsScanning(true);
    setScanSuccess(false);
    setScanResult(null);
    setScanProgress(5);

    // Revocar preview anterior
    if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl);

    // Mostrar preview local de inmediato (sin esperar la API)
    const localUrl = URL.createObjectURL(originalFile);
    setInvoicePreviewUrl(localUrl);

    const progressInterval = setInterval(() => {
      setScanProgress(prev => prev < 85 ? prev + Math.random() * 8 : prev);
    }, 450);

    try {
      // 1. Comprimir y analizar la imagen en el cliente
      const { file, isDark } = await compressAndAnalyzeImage(originalFile);

      // Si es muy oscura, advertir al usuario pero seguir intentando
      if (isDark) {
        showToast("⚠️ Foto muy oscura: Asegúrate de tener buena luz para que la IA lea bien los datos.", "warning");
      }

      setScanProgress(20);

      const formData = new FormData();
      formData.append("file", file);

      // La ruta /api/ai/invoice no requiere auth — solo procesa la imagen
      const res = await fetch("/api/ai/invoice", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      // Error especial: imagen de mala calidad (detectado por Gemini)
      if (data.error === "imagen_mala") {
        setScanProgress(0);
        showToast("📸 " + (data.mensaje || "La foto no tiene suficiente calidad. Intenta con mejor luz y enfoque."), "warning");
        return;
      }

      if (data.error) throw new Error(data.error);

      setScanProgress(100);
      setScanResult(data);

      // Rellenar automáticamente el formulario con los datos extraídos
      if (data.total && data.total > 0) setQuickAmount(formatNumberCOP(data.total));
      if (data.comercio && data.descripcion) setQuickDescription(`${data.comercio}: ${data.descripcion}`);
      else if (data.comercio) setQuickDescription(data.comercio);
      if (data.categoria) setQuickCategory(data.categoria as Category);
      setQuickType("Gasto Extra");
      if (data.fecha) setQuickDate(data.fecha);
      setScanSuccess(true);

      const qualityNote = data.calidad_imagen === "REGULAR" ? " · verifica los datos" : "";
      showToast(`✅ Factura escaneada: ${data.comercio}${qualityNote}`, "success");

    } catch (err: any) {
      setScanProgress(0);
      const msg = err?.message || "Error desconocido";
      showToast(`Error al escanear: ${msg.slice(0, 90)}`, "warning");
      console.error("[OCR]", err);
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  };

  // Limpiar URL al desmontar
  React.useEffect(() => {
    return () => { if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- GOOGLE GEMINI AI COACHING TIPS ---
  const loadAiTips = async () => {
    setIsLoadingTips(true);
    try {
      const res = await fetch("/api/ai/tips", {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data)) {
        setAiTips(data);
      }
    } catch (err) {
      console.error("Error al cargar tips con IA:", err);
      // Fallback local tips
      setAiTips([
        {
          titulo: "Estabilidad de Capital",
          consejo: "Tu nivel de gasto variable está dentro de los límites saludables. Sigue manteniendo este comportamiento.",
          gravedad: "SUCCESS"
        },
        {
          titulo: "Consejo de Reservas",
          consejo: "Considera incrementar tu traslado a reservas a inicio de mes para automatizar tu ahorro antes de consumir.",
          gravedad: "INFO"
        },
        {
          titulo: "Optimización de Deudas",
          consejo: "El pago de cuotas fijas representa un compromiso importante. Amortizar saldos pendientes reducirá los intereses.",
          gravedad: "WARNING"
        }
      ]);
    } finally {
      setIsLoadingTips(false);
    }
  };

  // Auto-load AI Tips on dashboard entry
  useEffect(() => {
    if (activeView === "dashboard" && aiTips.length === 0) {
      loadAiTips();
    }
  }, [activeView]);

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
      newLogs.push(`[${timeStr}] TERMINAL: Para restablecer la base de datos usa el panel de Mantenimiento.`);
      newLogs.push(`[${timeStr}] TERMINAL: Navega a la pestaña Auditoría > Mantenimiento y presiona el botón de reset.`);
    } else {
      newLogs.push(`[${timeStr}] ERROR: Comando '${cmd}' no reconocido. Escribe /help para ayuda.`);
    }

    setTerminalLogs(newLogs);
    setTerminalInput("");
  };

  const handleDigitPress = (digit: string) => {
    setQuickAmount((prev) => {
      let raw = prev.replace(/[^0-9]/g, "");
      if (raw === "0") {
        raw = digit;
      } else {
        raw = raw + digit;
      }
      const num = parseInt(raw, 10) || 0;
      return formatNumberCOP(num);
    });
  };

  const handleBackspace = () => {
    setQuickAmount((prev) => {
      let raw = prev.replace(/[^0-9]/g, "");
      if (raw.length <= 1) return "0,00";
      raw = raw.slice(0, -1);
      const num = parseInt(raw, 10) || 0;
      return formatNumberCOP(num);
    });
  };

  // --- PREVENT HYDRATION MISMATCH ---
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black font-sans text-slate-100 relative overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center font-bold font-mono text-2xl text-white animate-pulse">
            T
          </div>
          <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase animate-pulse">
            Tobirama OS Booting...
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LOGIN / REGISTER GATEWAY ---
  if (!isAuthenticated) {
    const isRegister = authMode === "register";
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans text-slate-100 select-none relative overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-3xl" />
        </div>

        <motion.div
          key={authMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Card */}
          <div className="bg-[#090a0d]/95 border border-white/[0.06] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            {/* Logo and Title */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-emerald-600/20 border border-white/[0.08] flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-wider uppercase text-white">Tobirama OS</h2>
              <p className="text-xs text-slate-500 font-mono tracking-wider mt-1">
                {isRegister ? "CREAR CUENTA — ACCESO FINANCIERO PERSONAL" : "SISTEMA DE CONTROL DE ACTIVOS"}
              </p>
            </div>

            {/* Mode switcher */}
            <div className="flex gap-1 p-0.5 bg-black rounded-xl border border-white/[0.04] mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setLoginError(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !isRegister ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-slate-600 hover:text-slate-400"
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setLoginError(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isRegister ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-slate-600 hover:text-slate-400"
                }`}
              >
                Registrarse
              </button>
            </div>

            {/* LOGIN FORM */}
            {!isRegister && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono select-none">@</span>
                  <input
                    type="text"
                    placeholder="Usuario"
                    value={usernameInput}
                    onChange={(e) => { setUsernameInput(e.target.value); setLoginError(""); }}
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-blue-500/40 focus:outline-none text-sm placeholder-slate-700"
                    autoFocus
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setLoginError(""); }}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-black border border-white/[0.06] font-mono tracking-widest text-slate-200 focus:border-blue-500/40 focus:outline-none text-sm placeholder-slate-700"
                    required
                  />
                </div>

                {loginError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 font-mono px-1">
                  ⚠️ {loginError}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-black text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isAuthLoading ? "Verificando..." : "Acceder al Sistema"}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {isRegister && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={fullNameInput}
                  onChange={(e) => { setFullNameInput(e.target.value); setLoginError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-emerald-500/40 focus:outline-none text-sm placeholder-slate-700"
                  required
                />

                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setLoginError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-emerald-500/40 focus:outline-none text-sm placeholder-slate-700"
                  required
                />

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono select-none">@</span>
                  <input
                    type="text"
                    placeholder="Nombre de usuario (sin espacios)"
                    value={usernameInput}
                    onChange={(e) => { setUsernameInput(e.target.value.replace(/\s/g, "")); setLoginError(""); }}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-emerald-500/40 focus:outline-none text-sm placeholder-slate-700"
                    minLength={3}
                    required
                  />
                </div>

                <input
                  type="password"
                  placeholder="Contraseña (mín. 8 caracteres)"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setLoginError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-emerald-500/40 focus:outline-none text-sm placeholder-slate-700"
                  minLength={8}
                  required
                />

                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPasswordInput}
                  onChange={(e) => { setConfirmPasswordInput(e.target.value); setLoginError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/[0.06] font-mono text-slate-200 focus:border-emerald-500/40 focus:outline-none text-sm placeholder-slate-700"
                  required
                />

                {loginError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 font-mono px-1">
                  ⚠️ {loginError}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isAuthLoading ? "Creando cuenta..." : "Crear Cuenta"}
                </button>
                <p className="text-center text-[12px] text-slate-600 font-mono pt-1">
                  Al registrarte, tus datos financieros son completamente privados e independientes.
                </p>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[12px] text-slate-700 font-mono mt-4">
            Tobirama OS · Datos encriptados · Acceso personal
          </p>
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
          <div className="h-12 w-12 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center font-bold font-mono text-xl text-white">
            T
          </div>

          <nav className="flex flex-col gap-4">
            {[
              { id: "dashboard", label: "Dashboard", icon: Layers },
              { id: "tracker", label: "Movimientos", icon: Coins },
              { id: "audit", label: "Control mensual", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as "dashboard" | "tracker" | "audit")}
                  title={item.label}
                  className={`relative h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? "text-white bg-white/[0.04] border border-white/[0.08]" : "text-slate-600 hover:text-slate-350 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-350 cursor-pointer">
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
                    { id: "dashboard", label: "Dashboard", icon: Layers },
                    { id: "tracker", label: "Movimientos", icon: Coins },
                    { id: "audit", label: "Control mensual", icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id as "dashboard" | "tracker" | "audit");
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
            <div className="flex items-center gap-8">
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">Tobirama OS</h2>
              
              <div className="hidden md:flex gap-1 p-0.5 bg-[#0a0a0c] rounded-lg border border-white/[0.04]">
                {[
                  { id: "dashboard", label: "Dashboard" },
                  { id: "tracker", label: "Movimientos" },
                  { id: "audit", label: "Control mensual" }
                ].map((tab) => {
                  const isActive = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveView(tab.id as "dashboard" | "tracker" | "audit")}
                      className={`relative px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isActive ? "text-white font-bold" : "text-slate-500 hover:text-slate-350"
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

          <div className="flex items-center gap-4">

            {/* User avatar + name + logout */}
            <div className="flex items-center gap-2 ml-1">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-700 to-emerald-600 border border-white/[0.08] flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0">
                {(currentUser.fullName || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <span className="hidden lg:block text-xs font-mono text-slate-400 max-w-[100px] truncate">
                {currentUser.username || currentUser.fullName}
              </span>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* --- MONTH SELECTOR BAR --- */}
        <div className="bg-[#050505] border-b border-white/[0.03] px-6 py-3 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[12px] font-bold font-mono tracking-widest text-slate-500 uppercase">Periodo de Análisis</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const [year, month] = selectedMonth.split("-").map(Number);
                const prevDate = new Date(year, month - 2, 1);
                setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="p-1.5 rounded-lg bg-[#090a0c] border border-white/[0.04] text-slate-400 hover:text-white text-[12px] font-bold cursor-pointer transition-colors"
            >
              ◀
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="bg-[#090a0c] border border-white/[0.04] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-white/[0.1] [color-scheme:dark]"
            />
            <button
              onClick={() => {
                const [year, month] = selectedMonth.split("-").map(Number);
                const nextDate = new Date(year, month, 1);
                setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="p-1.5 rounded-lg bg-[#090a0c] border border-white/[0.04] text-slate-400 hover:text-white text-[12px] font-bold cursor-pointer transition-colors"
            >
              ▶
            </button>
          </div>
        </div>

        {/* --- VIEW ROUTING --- */}
        <main className="flex-1 p-6 pb-24 md:p-8 md:pb-8 max-w-7xl w-full mx-auto space-y-8 bg-black min-h-[60vh]">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Patrimonio Neto */}
                  <div className="relative glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[180px] group transition-all hover:border-emerald-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono font-semibold">PATRIMONIO NETO</span>
                        <div className="text-3xl font-bold font-mono text-white mt-3">
                          {formatCOP(netWorthTotal)}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-emerald-600/5 border border-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.03] grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[13px] text-slate-500 font-mono uppercase">Ingresos Fijos</div>
                        <div className="text-[13px] font-bold font-mono text-slate-200">{formatCOP(flowMetrics.totalFixedIncomes)}</div>
                      </div>
                      <div>
                        <div className="text-[13px] text-slate-500 font-mono uppercase">Ingresos Variables</div>
                        <div className="text-[13px] font-bold font-mono text-slate-400">{formatCOP(flowMetrics.totalVariableIncomes)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Burnout Mensual */}
                  <div className="relative glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[180px] group transition-all hover:border-red-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono font-semibold">GASTO MENSUAL</span>
                        <div className="text-3xl font-bold font-mono text-white mt-3">
                          {formatCOP(monthlyBurn)}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-red-600/5 border border-red-500/10 flex items-center justify-center font-bold font-mono text-xs text-red-400">
                        GM
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.03] grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[13px] text-slate-500 font-mono uppercase">Gastos Fijos</div>
                        <div className="text-[13px] font-bold font-mono text-slate-200">
                          {formatCOP(flowMetrics.totalFixedExpenses)}
                        </div>
                        <div className="text-[13px] text-slate-650 font-mono">
                          Prog: {formatCOP(monthlyBudgetItems.filter(i => i.isFixed).reduce((s, i) => s + i.assigned, 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] text-slate-500 font-mono uppercase">Gastos Variables</div>
                        <div className="text-[13px] font-bold font-mono text-slate-200">
                          {formatCOP(flowMetrics.totalVariableExpenses)}
                        </div>
                        <div className="text-[13px] text-slate-650 font-mono">
                          Prog: {formatCOP(monthlyBudgetItems.filter(i => !i.isFixed).reduce((s, i) => s + i.assigned, 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Radial Deuda Erradicada */}
                  <div className="relative glass-panel rounded-2xl p-6 flex items-center justify-between min-h-[160px] group transition-all hover:border-blue-500/20 bg-[#0a0b0d]/50 border-white/[0.04]">
                    <div className="space-y-4">
                      <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">DEUDA ERRADICADA</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[12px] text-slate-600 font-mono block">PENDIENTE</span>
                          <span className="text-sm font-bold font-mono text-slate-300">{formatCOP(debtMetrics.totalPending)}</span>
                        </div>
                        <div>
                          <span className="text-[12px] text-slate-600 font-mono block">PROYECTADO Q4</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">$0</span>
                        </div>
                      </div>
                    </div>

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
                        <span className="text-[13px] text-slate-500 uppercase tracking-tight font-semibold">Completado</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Column 1 & 2: Asset Trajectory Chart (Col-span 8) */}
                  <div className="lg:col-span-8 glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04] hover:border-white/[0.08] transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">TRAYECTORIA MENSUAL</span>
                        <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">VELOCIDAD DEL CAPITAL</h4>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-lg font-bold text-white">{formatCOP(pocketLiquidity)}</span>
                        <span className="text-[12px] text-emerald-400 block">+12.4% vs prev</span>
                      </div>
                    </div>

                    <div className="relative h-44 w-full overflow-hidden bg-black border border-white/[0.04] rounded-xl p-4">
                      {chartPathData.linePath ? (
                        <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="35" x2="500" y2="35" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          <line x1="0" y1="115" x2="500" y2="115" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
                          
                          <path d={chartPathData.areaPath} fill="url(#chartGrad)" />
                          <path d={chartPathData.linePath} stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          
                          {chartPathData.points.map((pt, i) => (
                            <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#60a5fa" stroke="#000" strokeWidth="1.5" />
                          ))}
                        </svg>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-mono text-xs text-slate-600">
                          Sin datos de trayectoria suficientes
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-[13px] font-mono text-slate-650 mt-2">
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

                  {/* Column 3: Control de Caja metrics (Col-span 4) */}
                  <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between bg-[#0a0b0d]/50 border-white/[0.04] hover:border-white/[0.08] transition-all">
                    <div>
                      <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono font-semibold">CONTROL DE CAJA</span>
                      <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">EFICIENCIA Y LIQUIDEZ</h4>
                    </div>

                    <div className="grid grid-cols-12 gap-4 my-4 items-center">
                      {/* Thermometer */}
                      <div className="col-span-4 flex flex-col items-center gap-2">
                        <div className="w-6 h-24 rounded-full bg-black border border-white/[0.04] p-0.5 relative flex flex-col justify-end overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-cyan-500/10 to-emerald-500/10" />
                          <motion.div 
                            className="w-full bg-gradient-to-t from-blue-500 to-emerald-450 rounded-full"
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.min(100, Math.max(0, (pocketLiquidity / INITIAL_INCOME) * 100))}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                        <span className="text-[12px] font-mono text-emerald-400 font-bold">{((pocketLiquidity / INITIAL_INCOME) * 100).toFixed(0)}% Liq</span>
                      </div>

                      {/* Circular Gauge */}
                      <div className="col-span-8 space-y-3 pl-2 border-l border-white/[0.03]">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 flex items-center justify-center flex-shrink-0">
                            <svg className="h-full w-full -rotate-90">
                              <circle cx="24" cy="24" r="19" stroke="rgba(255,255,255,0.01)" strokeWidth="3" fill="none"/>
                              <circle 
                                cx="24" 
                                cy="24" 
                                r="19" 
                                stroke="#3b82f6" 
                                strokeWidth="3" 
                                fill="none" 
                                strokeDasharray="120" 
                                strokeDashoffset={120 - (120 * (monthlyBurn / (INITIAL_INCOME || 1)))} 
                                strokeLinecap="round" 
                              />
                            </svg>
                            <span className="absolute text-[12px] font-bold font-mono text-white">
                              {Math.round((monthlyBurn / INITIAL_INCOME) * 100)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[12px] text-slate-550 font-mono block leading-none">BURN RATE</span>
                            <span className="text-xs font-bold font-mono text-slate-200 mt-1 block">{formatCOP(monthlyBurn)}</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-[12px] font-mono text-slate-400 leading-tight">
                          <div><span className="text-slate-600">DISPONIBLE:</span> {formatCOP(pocketLiquidity)}</div>
                          <div><span className="text-slate-600">RUNWAY:</span> 18 Meses</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[12px] text-slate-650 font-mono leading-tight">
                      Caja libre optimizada contra compromisos vigentes.
                    </div>
                  </div>

                </div>

                {/* Real-time Analysis and Reports Center */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04] hover:border-white/[0.08] transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold font-mono">CENTRO DE ANÁLISIS Y FLUJO DE CAJA</span>
                      <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">DIAGNÓSTICO DE MOVIMIENTOS Y REPORTES</h4>
                    </div>
                    <span className="text-[12px] text-emerald-400 font-mono animate-pulse">● Sincronizado en tiempo real</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel 1: Ranking de Egresos */}
                    <div className="space-y-4 bg-black border border-white/[0.02] p-5 rounded-xl">
                      <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                        <span className="text-[12px] text-slate-400 font-mono font-bold uppercase">Categorías de Mayor Consumo</span>
                        <span className="text-[12px] text-slate-655 font-mono">Orden por gasto</span>
                      </div>
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {flowMetrics.sortedCats.length > 0 ? (
                          flowMetrics.sortedCats.map((item, idx) => {
                            const isTop = idx === 0;
                            return (
                              <div key={item.category} className={`space-y-1.5 p-2.5 rounded-lg transition-all border ${
                                isTop ? "bg-white/[0.02] border-yellow-500/20" : "bg-transparent border-transparent"
                              }`}>
                                <div className="flex justify-between items-center text-[12px] font-mono">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isTop && <span className="text-yellow-400 text-[12px]">👑</span>}
                                    <span className="text-slate-300 font-bold truncate">{item.category}</span>
                                  </div>
                                  <span className="text-slate-400 font-bold">{formatCOP(item.amount)}</span>
                                </div>
                                <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isTop ? "bg-yellow-500" : "bg-blue-500"}`} 
                                    style={{ width: `${(item.amount / (flowMetrics.totalExpenses + flowMetrics.totalReserves || 1)) * 100}%` }} 
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-xs font-mono text-slate-600">
                            Sin egresos registrados
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Panel 2: Movimientos Mensuales */}
                    <div className="space-y-4 bg-black border border-white/[0.02] p-5 rounded-xl flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                          <span className="text-[12px] text-slate-400 font-mono font-bold uppercase">Resumen Mensual de Caja</span>
                          <span className="text-[12px] text-slate-655 font-mono">Flujos</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[#050608] rounded-xl border border-white/[0.02]">
                            <span className="text-[12px] text-slate-600 font-mono block">INGRESOS</span>
                            <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">
                              +{formatCOP(flowMetrics.totalIncomes)}
                            </span>
                          </div>
                          <div className="p-3 bg-[#050608] rounded-xl border border-white/[0.02]">
                            <span className="text-[12px] text-slate-600 font-mono block">EGRESOS</span>
                            <span className="text-xs font-bold font-mono text-red-400 mt-1 block">
                              -{formatCOP(flowMetrics.totalExpenses)}
                            </span>
                          </div>
                          <div className="p-3 bg-[#050608] rounded-xl border border-white/[0.02]">
                            <span className="text-[12px] text-slate-600 font-mono block">RESERVAS / AHORRO</span>
                            <span className="text-xs font-bold font-mono text-blue-400 mt-1 block">
                              {formatCOP(flowMetrics.totalReserves)}
                            </span>
                          </div>
                          <div className="p-3 bg-[#050608] rounded-xl border border-white/[0.02]">
                            <span className="text-[12px] text-slate-600 font-mono block">LIQUIDEZ NETO</span>
                            <span className="text-xs font-bold font-mono text-white mt-1 block">
                              {formatCOP(flowMetrics.totalIncomes - flowMetrics.totalExpenses - flowMetrics.totalReserves)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Small visual indicator */}
                      <div className="space-y-1 pt-4 border-t border-white/[0.02] mt-auto">
                        <div className="flex justify-between text-[12px] text-slate-500 font-mono">
                          <span>Inflow vs Outflow</span>
                          <span>Ratio: {flowMetrics.spendRatio.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 rounded-full flex overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, 100 - flowMetrics.spendRatio)}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${Math.min(100, flowMetrics.spendRatio)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Panel 3: Diagnóstico del Capital (AI style advice) */}
                    <div className="space-y-4 bg-black border border-white/[0.02] p-5 rounded-xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                          <span className="text-[12px] text-slate-400 font-mono font-bold uppercase">Diagnóstico Financiero</span>
                          <button
                            onClick={loadAiTips}
                            disabled={isLoadingTips}
                            className="text-[12px] text-blue-400 hover:text-blue-300 font-mono bg-transparent border-0 cursor-pointer transition-all hover:underline"
                          >
                            {isLoadingTips ? "Analizando... 🤖" : "Refrescar AI 🤖"}
                          </button>
                        </div>

                        {/* AI Tips Section */}
                        {isLoadingTips ? (
                          <div className="py-6 flex flex-col items-center justify-center gap-2">
                            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[12px] font-mono text-slate-500 uppercase tracking-widest">Analizando con Tobirama AI...</span>
                          </div>
                        ) : aiTips.length > 0 ? (
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {aiTips.map((tip, idx) => (
                              <div 
                                key={idx} 
                                className={`p-2.5 rounded-lg border ${
                                  tip.gravedad === "WARNING" ? "bg-red-500/[0.03] border-red-500/15 text-red-355" :
                                  tip.gravedad === "SUCCESS" ? "bg-emerald-500/[0.03] border-emerald-500/15 text-emerald-355" :
                                  "bg-blue-500/[0.03] border-blue-500/15 text-blue-355"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase">
                          <span>{tip.gravedad === "WARNING" ? "⚠️" : tip.gravedad === "SUCCESS" ? "✓" : "ℹ️"}</span>
                                  <span>{tip.titulo}</span>
                                </div>
                                <p className="text-[13px] font-mono leading-relaxed mt-1 text-slate-400">{tip.consejo}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs font-mono text-slate-300 leading-relaxed space-y-3">
                            <p>
                              Has ejecutado el <span className="text-emerald-400 font-bold">{flowMetrics.spendRatio.toFixed(1)}%</span> de tus ingresos mensuales en gastos directos.
                            </p>
                            {flowMetrics.topCategory ? (
                              <p>
                                Tu mayor centro de consumo es <span className="text-yellow-400 font-bold">{flowMetrics.topCategory.category}</span> con un gasto real de <span className="text-white font-bold">{formatCOP(flowMetrics.topCategory.amount)}</span>, lo cual representa el <span className="text-red-400 font-bold">{flowMetrics.topCategoryPercent.toFixed(1)}%</span> de tus egresos totales.
                              </p>
                            ) : (
                              <p>No se han registrado consumos en categorías de gastos aún.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {!isLoadingTips && aiTips.length === 0 && (
                        <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[12px] font-mono text-emerald-400 leading-normal flex items-center gap-2">
                          <span>⚡</span>
                          <span>
                            {flowMetrics.spendRatio > 70 
                              ? "Alerta: Tu nivel de gasto supera el 70% de tus ingresos. Se sugiere restringir egresos variables."
                              : "Estado: Salud de capital saludable. La distribución de caja y nivel de reservas se encuentran estables."
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Credits and Loans Report Section */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04] hover:border-white/[0.08] transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">SEGUIMIENTO DE CRÉDITOS</span>
                      <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">CRÉDITOS Y OBLIGACIONES FINANCIERAS</h4>
                    </div>
                    <button
                      onClick={() => setShowCreditModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black font-bold text-xs uppercase tracking-wide transition-all cursor-pointer"
                    >
                      + Registrar Crédito
                    </button>
                  </div>

                  {credits.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/[0.04] rounded-xl font-mono text-xs text-slate-650 bg-black/20">
                      No hay créditos registrados en el sistema.<br/>
                      Registra tus compromisos financieros para realizar seguimiento de cuotas y saldos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {credits.map((credit) => {
                        const cuotasPercent = credit.totalInstallments > 0 
                          ? (credit.paidInstallments / credit.totalInstallments) * 100 
                          : 0;
                        const debtPaid = Math.max(0, credit.totalAmount - credit.remainingAmount);
                        const debtPercent = credit.totalAmount > 0 
                          ? (debtPaid / credit.totalAmount) * 100 
                          : 0;

                        const remainingInstallments = Math.max(0, credit.totalInstallments - credit.paidInstallments);
                        let projectedEndMonthStr = "N/A";
                        if (remainingInstallments === 0) {
                          projectedEndMonthStr = "¡CANCELADO!";
                        } else if (selectedMonth) {
                          const [year, month] = selectedMonth.split("-").map(Number);
                          const date = new Date(year, month - 1 + remainingInstallments, 1);
                          const monthsSpanish = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                          projectedEndMonthStr = `${monthsSpanish[date.getMonth()]} ${date.getFullYear()}`;
                        }

                        return (
                          <div 
                            key={credit.id} 
                            className="bg-[#050608]/60 border border-white/[0.03] rounded-xl p-4.5 space-y-4 hover:border-purple-500/20 transition-all relative group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-xs font-bold text-slate-200">{credit.name}</h5>
                                <span className="text-[12px] text-slate-500 uppercase tracking-wider font-mono mt-0.5 block">
                                  {credit.category}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteCredit(credit.id)}
                                className="p-1.5 rounded bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer"
                                title="Eliminar Crédito"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Installment Progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[12px] font-mono text-slate-400">
                                <span>Abono de Cuotas</span>
                                <span>
                                  {credit.paidInstallments}/{credit.totalInstallments} ({Math.round(cuotasPercent)}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.max(0, cuotasPercent))}%` }}
                               />
                              </div>
                            </div>

                            {/* Debt Progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[12px] font-mono text-slate-400">
                                <span>Saldo Amortizado</span>
                                <span>{Math.round(debtPercent)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.max(0, debtPercent))}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[12px] font-mono text-slate-500 pt-0.5">
                                <span>P.: {formatCOP(credit.remainingAmount)}</span>
                                <span>T.: {formatCOP(credit.totalAmount)}</span>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-white/[0.02] flex flex-col gap-1.5 text-[12px] font-mono">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">PAGO MENSUAL</span>
                                <span className="text-slate-200 font-bold">{formatCOP(credit.monthlyPayment)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">PROYECCIÓN DE CANCELACIÓN</span>
                                <span className={`font-bold ${remainingInstallments === 0 ? "text-emerald-400" : "text-purple-400"}`}>
                                  {projectedEndMonthStr}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Recent Entities table mapping */}
                <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-base font-bold text-white uppercase tracking-wider">COMPROMISOS PRESUPUESTALES</h4>
                      <p className="text-xs text-slate-600">Volumen financiero de abonos y nivel de ejecución real.</p>
                    </div>
                    <button onClick={() => setActiveView("audit")} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors">Ver todos</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-slate-950/20 text-slate-500 uppercase tracking-widest text-[12px] font-bold">
                          <th className="px-6 py-3.5">Compromiso / Categoría</th>
                          <th className="px-6 py-3.5">Estado</th>
                          <th className="px-6 py-3.5 text-right">Volumen Pagado</th>
                          <th className="px-6 py-3.5 text-center">Nivel de Ejecución</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {monthlyBudgetItems.map((item, i) => {
                          const outstanding = Math.max(0, item.assigned - item.paid);
                          const isPaid = outstanding === 0;
                          
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
                                  <div className="text-[12px] text-slate-500 uppercase tracking-tight mt-0.5">{item.category}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[12px] border font-bold ${
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

                <button
                  onClick={() => setActiveView("tracker")}
                  className="fixed bottom-24 md:fixed md:bottom-6 right-6 h-12 w-12 rounded-full bg-white hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center text-black shadow-lg z-30 cursor-pointer animate-bounce"
                  title="Nueva Transacción Flash"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </motion.div>
            )}

            {/* --- VISTA C: LIBRO DIARIO (REGISTRO FLASH) --- */}
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
                  
                  {/* Left Column: Visual Capture Form */}
                  <div className="lg:col-span-6 flex flex-col justify-center">
                    <div className={`glass-panel-heavy rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-auto space-y-5 relative border shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 ${visualFormConfig.cardBorder}`}>
                      
                      {/* PROMINENT MOVEMENT TYPE SWITCHER (Gasto / Ingreso / Reserva) */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090a0c] rounded-2xl border border-white/[0.04] relative">
                        {[
                          { id: "Gasto Extra", label: "Gasto", icon: ArrowDownLeft, activeClass: "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]", inactiveClass: "text-slate-500 hover:text-red-400/80" },
                          { id: "Ingreso", label: "Ingreso", icon: ArrowUpRight, activeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]", inactiveClass: "text-slate-500 hover:text-emerald-400/80" },
                          { id: "Movimiento a Reserva", label: "Reserva", icon: TrendingUp, activeClass: "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.05)]", inactiveClass: "text-slate-500 hover:text-blue-400/80" }
                        ].map((t) => {
                          const isSel = quickType === t.id;
                          const Icon = t.icon;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setQuickType(t.id as any);
                                // Automatically adjust quickCategory to match type
                                if (t.id === "Ingreso") {
                                  setQuickCategory("Ingresos");
                                } else if (t.id === "Movimiento a Reserva") {
                                  setQuickCategory("Ahorro / Reserva");
                                } else {
                                  setQuickCategory("Vivienda");
                                }
                              }}
                              className={`py-2.5 px-2 rounded-xl border text-[12px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isSel ? t.activeClass : `bg-black border-transparent ${t.inactiveClass}`
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Input Mode Selector tabs */}
                      <div className="grid grid-cols-3 gap-1 p-1 bg-[#090a0c] rounded-xl border border-white/[0.04] relative">
                        {[
                          { id: "keypad", label: "Teclado" },
                          { id: "voice", label: "Por Voz" },
                          { id: "invoice", label: "Por Factura" }
                        ].map((mode) => {
                          const isSel = inputMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setInputMode(mode.id as any);
                                setVoiceParsedInfo(null);
                                setVoiceText("");
                              }}
                              className={`py-1.5 rounded-lg text-3xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer relative ${
                                isSel ? "text-white" : "text-slate-555 hover:text-slate-350"
                              }`}
                            >
                              {isSel && (
                                <motion.div
                                  layoutId="inputModePill"
                                  className="absolute inset-0 bg-black border border-white/[0.06] rounded-lg shadow-sm"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                              <span className="relative z-10">{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-center space-y-0.5">
                        <span className="text-[12px] text-slate-550 uppercase tracking-widest font-mono block font-semibold">REGISTRO DE OPERACIÓN</span>
                        <h3 className={`text-xs font-bold font-mono tracking-tight ${visualFormConfig.typeColor}`}>
                          {quickType === "Ingreso" ? "INGRESO DE FONDOS" : quickType === "Movimiento a Reserva" ? "TRASLADO A RESERVA / AHORRO" : "EGRESO / GASTO EXTRA DE CAJA"}
                        </h3>
                      </div>

                      {/* Display amount & direct edit field */}
                      <div className="space-y-1.5 relative">
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">{visualFormConfig.amountLabel}</span>
                        <div className={`relative flex items-center bg-[#090a0c]/60 border border-white/[0.04] rounded-2xl px-4 py-3.5 hover:border-white/[0.08] transition-all ${visualFormConfig.amountRing}`}>
                          <span className="text-slate-500 font-mono text-lg font-bold mr-2 select-none">$</span>
                          
                          <input
                            type="text"
                            inputMode="decimal"
                            value={quickAmount === "0,00" ? "" : quickAmount}
                            onChange={(e) => handleFormattedChange(e, setQuickAmount)}
                            onFocus={() => handleFormattedFocus(quickAmount, setQuickAmount)}
                            onBlur={() => handleFormattedBlur(quickAmount, setQuickAmount)}
                            className="w-full bg-transparent border-0 p-0 text-xl font-bold font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:ring-0 leading-none"
                            placeholder="0,00"
                          />

                          {isScanning && (
                            <motion.div 
                              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-10 bottom-0"
                              animate={{ left: ["0%", "100%", "0%"] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Description Input */}
                      <div className="space-y-1.5">
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">{visualFormConfig.descLabel}</span>
                        <input
                          type="text"
                          placeholder={visualFormConfig.descPlaceholder}
                          value={quickDescription}
                          onChange={(e) => setQuickDescription(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-white/[0.04] bg-[#090a0c]/60 text-xs text-slate-200 placeholder-slate-700 focus:border-white/[0.1] focus:bg-[#090a0c]/80 transition-all focus:outline-none"
                        />
                      </div>

                      {/* INPUT MODES ROUTING — min-h evita el brinco al cambiar de modo */}
                      <div className="min-h-[200px]">
                      {inputMode === "keypad" && (
                        <div className="space-y-3 pt-1 border-t border-white/[0.03]">
                          {/* Quick shortcuts row */}
                          <div className="flex gap-2">
                            {[
                              { value: 10000, label: "+10K" },
                              { value: 50000, label: "+50K" },
                              { value: 100000, label: "+100K" },
                              { value: 500000, label: "+500K" }
                            ].map((pill) => (
                              <button
                                key={pill.label}
                                type="button"
                                onClick={() => {
                                  setQuickAmount((prev) => {
                                    const current = parseFormattedCOP(prev);
                                    return formatNumberCOP(current + pill.value);
                                  });
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-[#090a0c] border border-white/[0.02] hover:border-white/[0.08] text-[12px] font-mono text-slate-500 hover:text-white transition-all cursor-pointer"
                              >
                                {pill.label}
                              </button>
                            ))}
                          </div>

                          {/* Keyboard keypad digit keys grid (Compact) */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {["1", "2", "3", "000"].map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleDigitPress(key)}
                                className="py-2.5 rounded-lg bg-[#090a0c]/40 hover:bg-[#090a0c] border border-white/[0.02] font-mono text-xs text-slate-350 transition-colors cursor-pointer"
                              >
                                {key}
                              </button>
                            ))}
                            {["4", "5", "6", "0"].map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleDigitPress(key)}
                                className="py-2.5 rounded-lg bg-[#090a0c]/40 hover:bg-[#090a0c] border border-white/[0.02] font-mono text-xs text-slate-350 transition-colors cursor-pointer"
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
                                  className={`py-2.5 rounded-lg border font-mono text-xs text-slate-300 transition-colors cursor-pointer ${
                                    isBack ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-400" : "bg-[#090a0c]/40 hover:bg-[#090a0c] border-white/[0.02]"
                                  }`}
                                >
                                  {isBack ? "←" : key}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setQuickAmount("0,00")}
                              className="col-span-4 py-1.5 text-[12px] font-mono text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest cursor-pointer"
                            >
                              Limpiar Teclado
                            </button>
                          </div>
                        </div>
                      )}

                      {inputMode === "voice" && (
                        /* Voice Input Mode panel */
                        <div className="py-3 border-t border-white/[0.03] text-center space-y-3">
                          <button
                            type="button"
                            onClick={handleVoiceListen}
                            className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              isListening 
                                ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse animate-duration-1000" 
                                : "bg-zinc-955 border border-white/[0.06] text-slate-350 hover:bg-zinc-900 hover:text-white"
                            }`}
                          >
                            <Mic className="h-5.5 w-5.5" />
                          </button>
                          
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono text-slate-300 min-h-[16px]">
                              {voiceText || "Presiona el micrófono para hablar..."}
                            </div>
                            <p className="text-[12px] text-slate-600 italic max-w-xs mx-auto">
                              Ej. "Gasto cincuenta mil en mercado con débito"
                            </p>
                          </div>

                          {voiceParsedInfo && (
                            <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.04] font-mono text-[12px] text-emerald-400">
                              {voiceParsedInfo}
                            </div>
                          )}
                        </div>
                      )}

                      {inputMode === "invoice" && (
                        <div className="border-t border-white/[0.03] space-y-3 pt-3">

                          {/* Zona de carga — visible cuando no hay preview */}
                          {!invoicePreviewUrl && !isScanning && (
                            <label className="border border-dashed border-white/[0.08] hover:border-blue-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 transition-all bg-[#090a0c]/20 hover:bg-[#090a0c]/45 cursor-pointer">
                              <Upload className="h-6 w-6 text-slate-400" />
                              <span className="text-[13px] font-mono text-slate-200 font-semibold">Toca para fotografiar tu factura</span>
                              <span className="text-[12px] text-slate-500 text-center">La IA leerá el monto, comercio y fecha automáticamente</span>
                              <input
                                ref={invoiceInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleInvoiceUpload}
                                className="hidden"
                              />
                            </label>
                          )}

                          {/* Barra de progreso mientras escanea */}
                          {isScanning && (
                            <div className="space-y-2">
                              {/* Preview de la imagen mientras carga */}
                              {invoicePreviewUrl && (
                                <div className="rounded-xl overflow-hidden border border-white/[0.06] max-h-36">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={invoicePreviewUrl} alt="Escaneando..." className="w-full max-h-36 object-contain bg-black/60 opacity-60" />
                                </div>
                              )}
                              <div className="flex justify-between text-[12px] font-mono text-slate-500">
                                <span className="text-blue-400 animate-pulse">🔎 Analizando factura con IA...</span>
                                <span>{Math.round(scanProgress)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                  animate={{ width: `${scanProgress}%` }}
                                  transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                              </div>
                              <p className="text-[13px] text-slate-600 font-mono text-center">Extrayendo comercio, monto, fecha y categoría...</p>
                            </div>
                          )}

                          {/* Resultado: preview + datos extraídos */}
                          {scanSuccess && scanResult && invoicePreviewUrl && (
                            <div className="space-y-2">
                              {/* Imagen de la factura escaneada */}
                              <div className="relative rounded-xl overflow-hidden border border-emerald-500/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={invoicePreviewUrl} alt="Factura escaneada" className="w-full max-h-40 object-contain bg-black/60" />
                                <div className="absolute top-1.5 right-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      URL.revokeObjectURL(invoicePreviewUrl);
                                      setInvoicePreviewUrl(null);
                                      setScanSuccess(false);
                                      setScanResult(null);
                                      setScanProgress(0);
                                      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
                                    }}
                                    className="bg-black/70 hover:bg-black/90 border border-white/10 text-slate-400 hover:text-white rounded-lg px-2 py-1 text-[12px] font-mono transition-all cursor-pointer"
                                  >
                                    ✖ Nueva foto
                                  </button>
                                </div>
                              </div>

                              {/* Datos extraídos */}
                              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-2.5 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-400 text-[12px] font-mono font-bold">
                                  <Check className="h-3 w-3" />
                                  <span>DATOS EXTRAÍDOS AUTOMÁTICAMENTE</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[12px] font-mono">
                                  <div className="bg-black/40 rounded-lg p-1.5">
                                    <span className="text-slate-600 block text-[13px]">COMERCIO</span>
                                    <span className="text-slate-200 font-bold truncate block">{scanResult.comercio}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-lg p-1.5">
                                    <span className="text-slate-600 block text-[13px]">TOTAL</span>
                                    <span className="text-emerald-400 font-bold block">{formatCOP(scanResult.total)}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-lg p-1.5">
                                    <span className="text-slate-600 block text-[13px]">FECHA</span>
                                    <span className="text-slate-200 font-bold block">{scanResult.fecha}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-lg p-1.5">
                              <span className="text-slate-600 block text-[13px]">CATEGORÍA</span>
                                    <span className="text-slate-200 font-bold truncate block">{scanResult.categoria}</span>
                                  </div>
                                </div>
                                <p className="text-[13px] text-slate-600 font-mono">Verifica los datos arriba antes de guardar.</p>
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      </div>{/* end min-h input mode container */}

                      {/* Category Selector Grid */}
                      <div className="space-y-2">
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">Categoría</span>
                        <div className="grid grid-cols-2 gap-2">
                          {categoriesForSelection.map((cat) => {
                            const isSel = quickCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setQuickCategory(cat);
                                  if (cat !== "Otra...") {
                                    setCustomCategory("");
                                  }
                                }}
                                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                                  isSel 
                                    ? "bg-white/[0.04] border-white/[0.12] text-white shadow-[0_0_15px_rgba(255,255,255,0.02)]" 
                                    : "bg-black border-white/[0.02] text-slate-500 hover:text-slate-350 hover:bg-[#090a0c]"
                                }`}
                              >
                                {cat === "Otra..." ? (
                                  <Plus className="h-3.5 w-3.5 text-blue-400" />
                                ) : (
                                  getCategoryIcon(cat)
                                )}
                                <span className="text-[12px] font-bold font-mono tracking-tight">{cat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Category Input if "Otra..." is selected */}
                      {quickCategory === "Otra..." && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">Nombre de la Nueva Categoría</span>
                          <input
                            type="text"
                            placeholder="Nombre de la nueva categoría (Ej. Mascotas)"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border border-white/[0.04] bg-[#090a0c]/60 text-xs text-slate-200 placeholder-slate-700 focus:border-white/[0.1] focus:bg-[#090a0c]/80 transition-all focus:outline-none"
                            required
                          />
                        </div>
                      )}

                      {/* Payment method segmented control */}
                      <div className="space-y-2">
                        <span className="text-[12px] text-slate-550 uppercase tracking-widest font-mono block font-semibold">{visualFormConfig.payMethodLabel}</span>
                        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#090a0c] rounded-xl border border-white/[0.02]">
                          {(["Débito", "TC", "Efectivo"] as PaymentMethod[]).map((method) => {
                            const isSel = quickMethod === method;
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setQuickMethod(method)}
                                className={`py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer relative ${
                                  isSel ? "text-white" : "text-slate-650 hover:text-slate-400"
                                }`}
                              >
                                {isSel && (
                                  <motion.div
                                    layoutId="quickMethodPill"
                                    className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] rounded-lg"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                  />
                                )}
                                <span className="relative z-10">{method === "TC" ? "CRÉDITO" : method.toUpperCase()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date & Classification row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-[12px] text-slate-555 uppercase tracking-widest font-mono block font-semibold">Fecha</span>
                          <input
                            type="date"
                            value={quickDate}
                            onChange={(e) => setQuickDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-white/[0.04] bg-[#090a0c]/60 text-xs font-mono text-slate-200 focus:border-white/[0.1] focus:bg-[#090a0c]/80 transition-all focus:outline-none [color-scheme:dark]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[12px] text-slate-555 uppercase tracking-widest font-mono block font-semibold">Clasificación</span>
                          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#090a0c] rounded-xl border border-white/[0.02] h-[34px]">
                            {[
                              { value: true, label: "Fijo" },
                              { value: false, label: "Variable" }
                            ].map((opt) => {
                              const isSel = quickIsFixed === opt.value;
                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => setQuickIsFixed(opt.value)}
                                  className={`py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer relative ${
                                    isSel ? "text-white" : "text-slate-655 hover:text-slate-400"
                                  }`}
                                >
                                  {isSel && (
                                    <motion.div
                                      layoutId="quickIsFixedPill"
                                      className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] rounded-lg"
                                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                  )}
                                  <span className="relative z-10">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Large Glowing Confirm Button */}
                      <button
                        onClick={handleQuickRegister}
                        disabled={parseFormattedCOP(quickAmount) === 0 || isScanning}
                        className={`w-full py-3.5 rounded-2xl font-bold tracking-widest uppercase text-xs shadow-lg transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer ${
                          justSaved
                            ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 scale-[0.99]"
                            : visualFormConfig.confirmBtnBg
                        } ${
                          parseFormattedCOP(quickAmount) === 0 || isScanning ? "opacity-35 pointer-events-none" : ""
                        }`}
                      >
                        {justSaved ? "✓ ¡Guardado!" : visualFormConfig.confirmBtnText}
                      </button>

                      {quickSuccessMsg && (
                        <div className="absolute inset-x-8 bottom-20 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center font-mono text-[12px] text-emerald-400 z-20">
                          Movimiento registrado correctamente en el Ledger.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setQuickAmount("0,00");
                          setQuickDescription("");
                        }}
                        className="text-center font-mono text-[12px] text-slate-600 hover:text-slate-400 block w-full uppercase tracking-wider cursor-pointer"
                      >
                        Cancelar Registro
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Timeline audit feed with DELETION */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="glass-panel rounded-3xl p-6 flex flex-col min-h-[480px] bg-[#0a0b0d]/50 border-white/[0.04]">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-slate-400" />
                          <h4 className="text-base font-bold text-white uppercase tracking-wider">LIBRO DE MOVIMIENTOS</h4>
                        </div>
                        <span className="text-xs font-mono text-slate-550">
                          {transactions.filter(t => t.date.startsWith(selectedMonth)).length} de {transactions.length} registros
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 max-h-[620px] pr-2 scrollbar-thin">
                        <AnimatePresence initial={false}>
                          {transactions.filter(t => t.date.startsWith(selectedMonth)).map((tx) => {
                            const isIncome = tx.type === "Ingreso";
                            const isReserve = tx.type === "Movimiento a Reserva";

                            return (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.02] bg-[#050608]/50 hover:bg-[#050608]/80 transition-colors group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${
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

                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-200 truncate" title={tx.description}>
                                      {tx.description}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-[12px] font-mono text-slate-500">
                                        {tx.date}
                                      </span>
                                      <span className="text-[12px] font-mono bg-black border border-white/[0.04] text-slate-500 px-1.5 py-0.25 rounded">
                                        {tx.paymentMethod === "TC" ? "CRÉDITO" : tx.paymentMethod.toUpperCase()}
                                      </span>
                                      <span className="text-[12px] font-semibold text-slate-550 font-mono">
                                        {tx.category}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
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
                                    <span className="text-[12px] font-mono uppercase text-slate-550 mt-0.5 block">
                                      {tx.type}
                                    </span>
                                  </div>

                                  {/* Delete Transaction action button - fully responsive */}
                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer flex-shrink-0"
                                    title="Eliminar Registro"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white uppercase tracking-wider">MATRIZ DE CONTROL MENSUAL</h3>
                    <p className="text-sm text-slate-400 font-mono text-xs">Auditoría presupuestaria de gastos fijos y variables.</p>
                  </div>
                  
                  {/* Form to add a new category */}
                  <form onSubmit={handleAddCategorySubmit} className="flex flex-wrap items-center gap-2 bg-[#090a0c]/60 p-2.5 rounded-xl border border-white/[0.04]">
                    <input
                      type="text"
                      placeholder="Nueva Categoría (Ej: Supermercado)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.04] bg-black text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-white/[0.1] w-48"
                      required
                    />
                    <select
                      value={newCategoryIsFixed ? "true" : "false"}
                      onChange={(e) => setNewCategoryIsFixed(e.target.value === "true")}
                      className="px-2 py-1.5 rounded-lg border border-white/[0.04] bg-black text-xs font-mono text-slate-200 focus:outline-none focus:border-white/[0.1] [color-scheme:dark]"
                    >
                      <option value="true">Gasto Fijo</option>
                      <option value="false">Gasto Variable</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wide transition-all cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </form>
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
                        {monthlyBudgetItems.map((item) => {
                          const outstanding = Math.max(0, item.assigned - item.paid);
                          const isPaid = outstanding === 0;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-white/[0.01] transition-colors"
                            >
                              <td className="px-6 py-4.5">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[12px] font-mono border ${getCategoryColor(item.category)}`}>
                                    {item.category}
                                  </span>
                                  <span className={`px-1.5 py-0.25 rounded text-[13px] font-mono font-bold ${
                                    item.isFixed 
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  }`}>
                                    {item.isFixed ? "FIJO" : "VAR"}
                                  </span>
                                </div>
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
                                <button
                                  type="button"
                                  onClick={() => handleTogglePaid(item)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                    isPaid 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.02)]" 
                                      : "bg-yellow-500/5 text-yellow-400/80 border-yellow-500/20 hover:border-yellow-500/40"
                                  }`}
                                  title={isPaid ? "Marcar como pendiente" : "Marcar como pagado (igualar a asignado)"}
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>PAGADO</span>
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3.5 w-3.5 text-yellow-500/40" />
                                      <span>PENDIENTE</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4.5 text-center space-x-2">
                                {(item as any).isCredit ? (
                                  <span className="text-[12px] text-slate-500 font-mono italic">Crédito Activo</span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEditBudget(item)}
                                      className="px-2.5 py-1 rounded bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBudget(item.id)}
                                      className="px-2.5 py-1 rounded bg-red-950/20 border border-red-900/30 hover:bg-red-950/45 text-xs font-semibold text-red-400 transition-all cursor-pointer"
                                    >
                                      Borrar
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Database Control Panel */}
                {currentUser?.role === "admin" && (
                  <div className="glass-panel rounded-2xl p-6 bg-[#0a0b0d]/50 border-white/[0.04] mt-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                      <div>
                        <span className="text-[12px] text-slate-500 uppercase tracking-widest font-mono block font-semibold">PANEL ADMINISTRATIVO</span>
                        <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">MANTENIMIENTO DE BASE DE DATOS</h4>
                      </div>
                      <span className="text-[12px] text-slate-500 font-mono">
                        Estado: <span className="text-emerald-400 font-bold">CONECTADO</span>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <p className="text-xs text-slate-400 max-w-lg leading-normal font-mono">
                        Para limpiar el sistema y comenzar de cero, puedes restablecer la base de datos. Esto eliminará de forma irreversible todas las transacciones registradas y reestablecerá los presupuestos de las categorías base a $0.
                      </p>
                      <button
                        onClick={handleResetDb}
                        className="px-5 py-3 rounded-xl bg-red-650/10 hover:bg-red-650/20 border border-red-500/25 hover:border-red-500/40 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
                      >
            Restablecer Sistema (Borrar Todo) ⚠️
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* --- QUICK EDIT MODAL (BUDGET GRID ADJUSTMENTS) --- */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-black border border-white/[0.06] rounded-2xl p-6 shadow-2xl z-10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">EDITAR REGISTRO</h4>
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
                      type="text"
                      inputMode="decimal"
                      value={editAssignedValue}
                      onChange={(e) => handleFormattedChange(e, setEditAssignedValue)}
                      onFocus={() => handleFormattedFocus(editAssignedValue, setEditAssignedValue)}
                      onBlur={() => handleFormattedBlur(editAssignedValue, setEditAssignedValue)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/[0.06] bg-black text-sm font-mono text-slate-200 focus:border-white/[0.15] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-550 mb-1">Ya Pagué (Real)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editPaidValue}
                      onChange={(e) => handleFormattedChange(e, setEditPaidValue)}
                      onFocus={() => handleFormattedFocus(editPaidValue, setEditPaidValue)}
                      onBlur={() => handleFormattedBlur(editPaidValue, setEditPaidValue)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 focus:border-white/[0.15] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-slate-550 mb-1">Clasificación</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-black rounded-xl border border-white/[0.06] h-[36px]">
                    {[
                      { value: true, label: "Gasto Fijo" },
                      { value: false, label: "Gasto Variable" }
                    ].map((opt) => {
                      const isSel = editIsFixed === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setEditIsFixed(opt.value)}
                          className={`py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer relative ${
                            isSel ? "text-white" : "text-slate-650 hover:text-slate-400"
                          }`}
                        >
                          {isSel && (
                            <motion.div
                              layoutId="editIsFixedPill"
                              className="absolute inset-0 bg-white/[0.03] border border-white/[0.08] rounded-lg"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">{opt.label}</span>
                        </button>
                      );
                    })}
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

      {/* --- CREDIT REGISTRATION MODAL --- */}
      <AnimatePresence>
        {showCreditModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreditModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-black border border-white/[0.06] rounded-2xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-white font-mono">REGISTRAR CRÉDITO</h4>
                  <p className="text-xs text-slate-500">Añadir una nueva obligación o préstamo al control mensual.</p>
                </div>
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddCreditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Nombre de la Entidad / Préstamo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ADDI, Lulo Bank, Cuota Apartamento"
                    value={creditForm.name}
                    onChange={(e) => setCreditForm({ ...creditForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Cupo Total / Monto Prestado</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="3.000.000,00"
                        value={creditForm.totalAmount}
                        onChange={(e) => handleFormattedChange(e, (formatted) => setCreditForm(prev => ({ ...prev, totalAmount: formatted })))}
                        onFocus={() => handleFormattedFocus(creditForm.totalAmount, (formatted) => setCreditForm(prev => ({ ...prev, totalAmount: formatted })))}
                        onBlur={() => handleFormattedBlur(creditForm.totalAmount, (formatted) => setCreditForm(prev => ({ ...prev, totalAmount: formatted })))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Saldo Pendiente Actual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="1.200.000,00"
                        value={creditForm.remainingAmount}
                        onChange={(e) => handleFormattedChange(e, (formatted) => setCreditForm(prev => ({ ...prev, remainingAmount: formatted })))}
                        onFocus={() => handleFormattedFocus(creditForm.remainingAmount, (formatted) => setCreditForm(prev => ({ ...prev, remainingAmount: formatted })))}
                        onBlur={() => handleFormattedBlur(creditForm.remainingAmount, (formatted) => setCreditForm(prev => ({ ...prev, remainingAmount: formatted })))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Cuotas Totales</label>
                    <input
                      type="number"
                      required
                      placeholder="10"
                      value={creditForm.totalInstallments}
                      onChange={(e) => setCreditForm({ ...creditForm, totalInstallments: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Cuotas Pagas</label>
                    <input
                      type="number"
                      required
                      placeholder="6"
                      value={creditForm.paidInstallments}
                      onChange={(e) => setCreditForm({ ...creditForm, paidInstallments: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Pago Mensual</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="300.000,00"
                        value={creditForm.monthlyPayment}
                        onChange={(e) => handleFormattedChange(e, (formatted) => setCreditForm(prev => ({ ...prev, monthlyPayment: formatted })))}
                        onFocus={() => handleFormattedFocus(creditForm.monthlyPayment, (formatted) => setCreditForm(prev => ({ ...prev, monthlyPayment: formatted })))}
                        onBlur={() => handleFormattedBlur(creditForm.monthlyPayment, (formatted) => setCreditForm(prev => ({ ...prev, monthlyPayment: formatted })))}
                        className="w-full pl-6 pr-2 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 placeholder-slate-700 focus:border-white/[0.15] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-mono uppercase text-slate-550 mb-1">Categoría del Presupuesto (Asociar)</label>
                  <select
                    required
                    value={creditForm.category}
                    onChange={(e) => setCreditForm({ ...creditForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#050608] text-sm font-mono text-slate-200 focus:border-white/[0.15] focus:outline-none [color-scheme:dark]"
                  >
                    <option value="" disabled>Seleccione una categoría</option>
                    {CATEGORIES.filter(c => c !== "Ingresos" && c !== "Ahorro / Reserva").map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Deudas de Consumo">Deudas de Consumo</option>
                    <option value="Tarjetas de Crédito">Tarjetas de Crédito</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreditModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/[0.06] hover:bg-white/5 transition-all text-xs font-bold uppercase text-slate-400 cursor-pointer font-mono"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold uppercase cursor-pointer font-mono"
                  >
                    Registrar Crédito
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PREMIUM FLOATING TOAST NOTIFICATIONS --- */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            const isError = toast.type === "error";
            const isWarning = toast.type === "warning";
            const isInfo = toast.type === "info";
            
            // Icon selection
            let IconComp = Info;
            if (isSuccess) IconComp = CheckCircle2;
            if (isError) IconComp = XCircle;
            if (isWarning) IconComp = AlertTriangle;

            // Premium Color Scheme & Border glows
            let ringColor = "border-emerald-500/30 shadow-emerald-950/20";
            let textColor = "text-emerald-400";
            let iconColor = "text-emerald-400";
            if (isError) {
              ringColor = "border-red-500/30 shadow-red-950/20";
              textColor = "text-red-400";
              iconColor = "text-red-400";
            } else if (isWarning) {
              ringColor = "border-yellow-500/30 shadow-yellow-950/20";
              textColor = "text-yellow-400";
              iconColor = "text-yellow-400";
            } else if (isInfo) {
              ringColor = "border-blue-500/30 shadow-blue-950/20";
              textColor = "text-blue-400";
              iconColor = "text-blue-400";
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
                layout
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border ${ringColor} shadow-xl pointer-events-auto`}
              >
                <div className={`p-1.5 rounded-xl bg-white/[0.03] flex-shrink-0 ${iconColor}`}>
                  <IconComp className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 text-slate-100 text-[13px] leading-snug font-sans font-medium">
                  {toast.message}
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all cursor-pointer flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050505]/98 backdrop-blur-xl border-t border-white/[0.05] px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-around items-center">
          {[
            { id: "dashboard", label: "Dashboard", icon: Layers },
            { id: "tracker", label: "Movimientos", icon: Coins },
            { id: "audit", label: "Control", icon: FileText }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as "dashboard" | "tracker" | "audit")}
                className="flex flex-col items-center gap-1 py-1.5 px-4 transition-all cursor-pointer bg-transparent border-0 min-h-[52px] justify-center"
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white/[0.07] text-white border border-white/[0.1]' : 'text-slate-500'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[11px] font-medium tracking-wide transition-colors ${isActive ? 'text-white' : 'text-slate-600'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="h-0.5 w-4 rounded-full bg-white/50 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

