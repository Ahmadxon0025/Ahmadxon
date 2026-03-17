import { useState, useRef, useEffect, useCallback } from "react";
const SUPA_URL = "https://usmxenqkvytwesvyhxfb.supabase.co";
const SUPA_KEY = "sb_publishable_ZLN8amLK8dUWoS5Fc48uZg_4wrtQWk8";

// Lightweight Supabase REST client (no SDK needed)
const supabase = {
  _token: null,
  _headers() {
    const h = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${this._token || SUPA_KEY}` };
    return h;
  },
  auth: {
    _self: null,
    _listeners: [],
    async getSession() {
      try {
        const s = localStorage.getItem("supa_session");
        if (s) {
          const session = JSON.parse(s);
          supabase._token = session.access_token;
          return { data: { session } };
        }
      } catch {}
      return { data: { session: null } };
    },
    async signInWithPassword({ email, password }) {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
        body: JSON.stringify({ email, password })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error_description || data.msg || "Kirish xatosi");
      localStorage.setItem("supa_session", JSON.stringify(data));
      supabase._token = data.access_token;
      const user = data.user;
      supabase.auth._listeners.forEach(fn => fn("SIGNED_IN", data));
      return { data: { user } };
    },
    async signUp({ email, password, options }) {
      const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
        body: JSON.stringify({ email, password, data: options?.data || {} })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error_description || data.msg || "Ro'yxat xatosi");
      return { data };
    },
    async signOut() {
      try {
        await fetch(`${SUPA_URL}/auth/v1/logout`, {
          method: "POST", headers: supabase._headers()
        });
      } catch {}
      localStorage.removeItem("supa_session");
      supabase._token = null;
      supabase.auth._listeners.forEach(fn => fn("SIGNED_OUT", null));
    },
    onAuthStateChange(fn) {
      supabase.auth._listeners.push(fn);
      return { data: { subscription: { unsubscribe() { supabase.auth._listeners = supabase.auth._listeners.filter(f => f !== fn); } } } };
    }
  },
  from(table) {
    return {
      _table: table, _filters: [],
      select(cols) { this._sel = cols; return this; },
      eq(col, val) { this._filters.push(`${col}=eq.${val}`); return this; },
      single() { this._single = true; return this; },
      async then(resolve) {
        const q = this._filters.length ? "?" + this._filters.join("&") : "";
        const r = await fetch(`${SUPA_URL}/rest/v1/${this._table}${q}`, { headers: supabase._headers() });
        const data = await r.json();
        resolve({ data: this._single ? (Array.isArray(data) ? data[0] : data) : data, error: r.ok ? null : data });
      },
      async upsert(row, opts) {
        const r = await fetch(`${SUPA_URL}/rest/v1/${this._table}`, {
          method: "POST",
          headers: { ...supabase._headers(), "Prefer": "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(row)
        });
        return { error: r.ok ? null : await r.json() };
      }
    };
  }
};
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  gold:"#BA7517", goldb:"#EF9F27", red:"#E24B4A", grn:"#1D9E75",
  pur:"#7F77DD", pink:"#D4537E", dark:"#141414", surf:"#1e1e1e",
  surf2:"#252525", border:"#2e2e2e", text:"#f0f0f0", muted:"#888", dim:"#555"
};

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const DEBT_CATS = ["shaxsiy","invest","sayt","un","bank","boshqa"];
const DEBT_CAT_LABELS = {shaxsiy:"Shaxsiy",invest:"Invest",sayt:"Sayt",un:"Un (don)",bank:"Bank",boshqa:"Boshqa"};

const INIT_CREDITORS = [

  // ══════════════════════════════════════════════════════════════
  // AKTIV QARZLAR — qoldig'i bor ($13,034 jami)
  // ══════════════════════════════════════════════════════════════

  // ── Invest qarzlar (kichik) ───────────────────────────────────
  {
    id:"akmal_inv", name:"Akmalxon oka | invest", cat:"invest", currency:"USD",
    total:110, status:"active",
    card:"", cardName:"", telegram:"", note:"Investitsiya ulushi",
    payments:[]
  },
  {
    id:"abduhalil_inv", name:"Abduhalil | invest", cat:"invest", currency:"USD",
    total:197, status:"active",
    card:"8600 1404 6835 7547", cardName:"Abduvohidov Abduxalil", telegram:"", note:"Investitsiya ulushi",
    payments:[]
  },
  {
    id:"ali_inv", name:"Ali oka | invest", cat:"invest", currency:"USD",
    total:147, status:"active",
    card:"9860170113385554", cardName:"Isakov Aliy", telegram:"", note:"Investitsiya ulushi",
    payments:[]
  },
  {
    id:"abdurazzoq_inv", name:"Abdurazzoq | invest", cat:"invest", currency:"USD",
    total:147, status:"active",
    card:"9860 1201 1256 2166", cardName:"Abdurazzoq Abdurashidov", telegram:"", note:"Investitsiya ulushi",
    payments:[]
  },

  // ── Sayt qarzlar ─────────────────────────────────────────────
  {
    id:"xojiakbar", name:"Xojiakbar sayt", cat:"sayt", currency:"USD",
    total:125, status:"active",
    card:"4067 0700 0378 0918", cardName:"Xojiakbar Abduraxmanov", telegram:"", note:"Sayt uchun qarz",
    payments:[]
  },
  {
    id:"shahzod_sayt", name:"Shahzod sayt", cat:"sayt", currency:"USD",
    total:300, status:"active",
    card:"", cardName:"", telegram:"", note:"Sayt uchun qarz",
    payments:[]
  },

  // ── Un (don) qarz ─────────────────────────────────────────────
  {
    id:"abdurazzoq_un", name:"Abdurazzoq | Un", cat:"un", currency:"USD",
    total:125, status:"active",
    card:"9860 1201 1256 2166", cardName:"Abdurazzoq Abdurashidov", telegram:"", note:"Un (don) qarzi",
    payments:[]
  },

  // ── Boshqa aktiv shaxsiy qarzlar ─────────────────────────────
  {
    id:"abdumalik", name:"Abdumalik", cat:"boshqa", currency:"USD",
    total:160, status:"active",
    card:"9860260101500189", cardName:"Umida", telegram:"", note:"",
    payments:[]
  },
  {
    id:"muhammedali", name:"Muhammad Ali", cat:"shaxsiy", currency:"USD",
    total:170, status:"active",
    card:"5614 6816 2568 0305", cardName:"Mirzaxmedova Zulxumor", telegram:"", note:"",
    payments:[]
  },
  {
    id:"targetolog", name:"Targetolog Mahmudxo'ja", cat:"boshqa", currency:"USD",
    total:300, status:"active",
    card:"5614 6829 1440 4233", cardName:"Qambarov Maxmudxo'ja", telegram:"", note:"",
    payments:[]
  },
  {
    id:"fozilbek", name:"Fozilbek", cat:"shaxsiy", currency:"USD",
    total:255, status:"active",
    card:"", cardName:"", telegram:"", note:"",
    payments:[]
  },
  {
    id:"abdurazzoq", name:"Abdurazzoq", cat:"shaxsiy", currency:"USD",
    total:500, status:"active",
    card:"9860 1201 1256 2166", cardName:"Abdurazzoq Abdurashidov", telegram:"", note:"",
    payments:[]
  },
  {
    id:"bekzod_active", name:"BEkzod", cat:"shaxsiy", currency:"USD",
    total:1000, status:"active",
    card:"", cardName:"", telegram:"", note:"",
    payments:[]
  },

  // ── Muhim aktiv qarzlar ───────────────────────────────────────
  {
    id:"muhjon", name:"Muhammadjon Tilalov", cat:"shaxsiy", currency:"USD",
    total:1000, status:"active",
    card:"", cardName:"", telegram:"", note:"Shaxsiy qarz — $791 qoldi",
    payments:[
      {id:"mj1", date:"2024-07-12", amount:44,  method:"card", note:"1-to'lov"},
      {id:"mj2", date:"2024-07-18", amount:50,  method:"card", note:"2-to'lov"},
      {id:"mj3", date:"2024-09-01", amount:100, method:"card", note:"3-to'lov"},
      {id:"mj4", date:"2024-10-01", amount:15,  method:"cash", note:"4-to'lov"},
    ]
  },
  {
    id:"humoy", name:"Humoyun Sobirov", cat:"shaxsiy", currency:"USD",
    total:2000, status:"active",
    card:"", cardName:"", telegram:"", note:"Shaxsiy qarz — $1,450 qoldi",
    payments:[
      {id:"h1", date:"2024-12-15", amount:450, method:"card", note:"1-to'lov"},
      {id:"h2", date:"2025-01-01", amount:100, method:"cash", note:"2-to'lov"},
    ]
  },
  {
    id:"abdul", name:"Abdulhamid Yakubov", cat:"shaxsiy", currency:"USD",
    total:1500, status:"active",
    card:"", cardName:"", telegram:"", note:"Shaxsiy qarz — hali to'lanmagan",
    payments:[]
  },
  {
    id:"obida", name:"Obidaxon Muhitdinova", cat:"shaxsiy", currency:"USD",
    total:4300, status:"active",
    card:"", cardName:"", telegram:"", note:"Shaxsiy qarz — $2,300 qoldi",
    payments:[
      {id:"o1", date:"2024-11-01", amount:775,  method:"card", note:"1-to'lov"},
      {id:"o2", date:"2025-01-01", amount:100,  method:"card", note:"2-to'lov"},
      {id:"o3", date:"2025-01-15", amount:100,  method:"cash", note:"3-to'lov"},
      {id:"o4", date:"2025-02-01", amount:1025, method:"card", note:"4-to'lov"},
    ]
  },
  {
    id:"komol", name:"Komolxon Sobirov", cat:"shaxsiy", currency:"USD",
    total:5000, status:"active",
    card:"", cardName:"", telegram:"@komolxon", note:"Shaxsiy qarz — $1,458 qoldi",
    payments:[
      {id:"k1", date:"2024-10-01", amount:100,  method:"card", note:"1-to'lov"},
      {id:"k2", date:"2024-11-15", amount:394,  method:"card", note:"2-to'lov"},
      {id:"k3", date:"2024-12-20", amount:949,  method:"card", note:"3-to'lov"},
      {id:"k4", date:"2025-01-05", amount:2099, method:"card", note:"4-to'lov"},
    ]
  },
  {
    id:"isroil", name:"Isroil Samatov", cat:"shaxsiy", currency:"USD",
    total:2000, status:"active",
    card:"", cardName:"", telegram:"@isroil_samatov", note:"SP Invest hamkor — hali to'lanmagan",
    payments:[]
  },

  // ══════════════════════════════════════════════════════════════
  // YOPILGAN QARZLAR — to'liq to'landi
  // ══════════════════════════════════════════════════════════════
  {
    id:"polat", name:"Po'lat oka", cat:"shaxsiy", currency:"USD",
    total:3800, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[
      {id:"p1", date:"2024-09-01", amount:2000, method:"cash", note:"1-to'lov"},
      {id:"p2", date:"2024-11-01", amount:1800, method:"cash", note:"Yakuniy to'lov"},
    ]
  },
  {
    id:"umida", name:"Umida", cat:"shaxsiy", currency:"USD",
    total:780, status:"closed",
    card:"9860600405050771", cardName:"Abdumalik", telegram:"", note:"To'liq yopildi ✓",
    payments:[
      {id:"um1", date:"2024-09-01", amount:100, method:"card", note:""},
      {id:"um2", date:"2024-10-01", amount:680, method:"card", note:"Yakuniy"},
    ]
  },
  {
    id:"parizoda", name:"Parizoda", cat:"shaxsiy", currency:"USD",
    total:124, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[
      {id:"par1", date:"2024-09-01", amount:124, method:"cash", note:""}
    ]
  },
  {
    id:"uzum", name:"Uzum", cat:"bank", currency:"USD",
    total:1186, status:"closed",
    card:"", cardName:"", telegram:"", note:"Bank kredit — to'liq yopildi ✓",
    payments:[
      {id:"u1", date:"2024-11-17", amount:75,  method:"bank", note:""},
      {id:"u2", date:"2024-11-17", amount:47,  method:"bank", note:""},
      {id:"u3", date:"2024-11-20", amount:100, method:"bank", note:""},
      {id:"u4", date:"2024-11-25", amount:100, method:"bank", note:""},
      {id:"u5", date:"2024-12-08", amount:100, method:"bank", note:""},
      {id:"u6", date:"2024-12-15", amount:200, method:"bank", note:""},
      {id:"u7", date:"2024-12-20", amount:200, method:"bank", note:""},
      {id:"u8", date:"2024-12-20", amount:364, method:"bank", note:"Yakuniy"},
    ]
  },
  {
    id:"anorbank", name:"Anorbank", cat:"bank", currency:"USD",
    total:620, status:"closed",
    card:"", cardName:"", telegram:"", note:"Bank kredit — to'liq yopildi ✓",
    payments:[
      {id:"a1", date:"2024-11-17", amount:50,  method:"bank", note:""},
      {id:"a2", date:"2024-12-15", amount:65,  method:"bank", note:""},
      {id:"a3", date:"2024-12-20", amount:60,  method:"bank", note:""},
      {id:"a4", date:"2024-12-20", amount:137, method:"bank", note:""},
      {id:"a5", date:"2025-01-10", amount:65,  method:"bank", note:""},
      {id:"a6", date:"2025-02-01", amount:103, method:"bank", note:""},
      {id:"a7", date:"2025-03-01", amount:140, method:"bank", note:"Yakuniy"},
    ]
  },
  {
    id:"ayubxon", name:"Ayubxon", cat:"shaxsiy", currency:"USD",
    total:16, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[{id:"ay1", date:"2024-11-01", amount:16, method:"cash", note:""}]
  },
  {
    id:"sayid", name:"Sayid", cat:"shaxsiy", currency:"USD",
    total:32, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[{id:"s1", date:"2024-11-01", amount:32, method:"cash", note:""}]
  },
  {
    id:"muhjiy_un", name:"Muhammad | Un", cat:"un", currency:"USD",
    total:300, status:"closed",
    card:"", cardName:"", telegram:"", note:"Un qarzi — to'liq yopildi ✓",
    payments:[{id:"mun1", date:"2024-12-25", amount:300, method:"cash", note:""}]
  },
  {
    id:"muhjiy_un2", name:"Muhammad jiyan | Un", cat:"un", currency:"USD",
    total:184, status:"closed",
    card:"", cardName:"", telegram:"", note:"Un qarzi — to'liq yopildi ✓",
    payments:[{id:"mjun1", date:"2024-12-25", amount:184, method:"cash", note:""}]
  },
  {
    id:"bekzod", name:"Bekzod", cat:"shaxsiy", currency:"USD",
    total:1060, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[
      {id:"b1", date:"2024-12-01", amount:1005, method:"card", note:""},
      {id:"b2", date:"2024-12-20", amount:55,   method:"cash", note:"Yakuniy"},
    ]
  },
  {
    id:"abdurashid", name:"Abdurashid", cat:"shaxsiy", currency:"USD",
    total:600, status:"closed",
    card:"", cardName:"", telegram:"", note:"To'liq yopildi ✓",
    payments:[{id:"ar1", date:"2024-12-01", amount:600, method:"card", note:""}]
  },
];


const INIT_RECEIVABLES = [
  { id:"ibr", name:"Ibrohim Nematillayev", amount:898, total:3500, paid:2602, note:"$3,500 dan $2,602 to'landi" },
  { id:"abd", name:"Abdurahmon",            amount:79,   note:"Kichik" },
  { id:"diy", name:"Diyor",                 amount:47,   note:"Kichik" },
];

const INIT_WEDDING = [
  { id:"toyxona",  label:"To'yxona (depozit+qolgan)", budget:7500, paid:0 },
  { id:"yostiq",   label:"Yostiqcha",                  budget:7000, paid:0 },
  { id:"uzuklar",  label:"Uzuklar (5 ta)",              budget:1000, paid:1000 },
  { id:"asaloy",   label:"Asaloy safari",               budget:2000, paid:0 },
  { id:"kiyim",    label:"To'y kiyimlari",              budget:500,  paid:0 },
  { id:"foto",     label:"Fotograf",                    budget:600,  paid:0 },
  { id:"boshqa",   label:"Boshqa xarajatlar",           budget:400,  paid:0 },
];
const CATS_EXP = ["Ijara","Ovqat","Transport","Kommunal","Kiyim","Sog'liq","Zapusk xarajat","Qarz to'lov","To'y","Boshqa"];
const CATS_INC = ["SP Invest vebinar","SP Invest kurs","Consulting","Boshqa daromad"];
const MONTHS_PLAN = [
  { id:"mar26", label:"Mart 2026",   incTarget:5000,  expBudget:2000, debtTarget:0,    note:"To'yxona band qilish oyi",      special:"wedding_prep" },
  { id:"apr26", label:"Aprel 2026",  incTarget:15000, expBudget:3000, debtTarget:0,    note:"VEBINAR OYI — maksimum soting", special:"vebinar" },
  { id:"may26", label:"May 2026",    incTarget:8000,  expBudget:5500, debtTarget:1000, note:"TO'Y KUNI! Yangi hayot boshlanadi", special:"wedding" },
  { id:"iyn26", label:"Iyun 2026",   incTarget:12000, expBudget:5000, debtTarget:3000, note:"Qarz burami boshlandi",          special:"debt" },
  { id:"iyl26", label:"Iyul 2026",   incTarget:12000, expBudget:5000, debtTarget:3000, note:"Qarz davom etmoqda",             special:"debt" },
  { id:"avg26", label:"Avgust 2026", incTarget:15000, expBudget:5000, debtTarget:3000, note:"Qarz so'nggi bosqich + MASHINA", special:"car" },
  { id:"sen26", label:"Sentabr 2026",incTarget:12000, expBudget:5000, debtTarget:3034, note:"QARZDAN TO'LIQ QUTULAMIZ!",      special:"debt_free" },
  { id:"okt26", label:"Oktabr 2026", incTarget:15000, expBudget:5000, debtTarget:0,    note:"Erkin oylar — tejash boshlandi", special:"save" },
  { id:"noy26", label:"Noyabr 2026", incTarget:15000, expBudget:5000, debtTarget:0,    note:"Tejash + investitsiya",          special:"save" },
  { id:"dek26", label:"Dekabr 2026", incTarget:15000, expBudget:5000, debtTarget:0,    note:"Yil xulosasi — yangi maqsadlar", special:"year_end" },
  { id:"yan27", label:"Yanvar 2027", incTarget:20000, expBudget:5000, debtTarget:0,    note:"Yangi yil, yangi rekordlar",    special:"new_year" },
  { id:"fev27", label:"Fevral 2027", incTarget:20000, expBudget:5000, debtTarget:0,    note:"SP Invest kengayishi",          special:"scale" },
];

function getInitState() {
  try {
    const s = localStorage.getItem("finOS_v15");
    if (s) return JSON.parse(s);
  } catch {}
  return {
    uzsRate: 12750,
    accounts: [
      { id:"karta_uzs",  name:"Karta",      currency:"UZS", balance:4111.66,  icon:"💳", color:"#1D9E75" },
      { id:"naqd_uzs",   name:"Naqd so'm",  currency:"UZS", balance:400000,   icon:"💵", color:"#EF9F27" },
      { id:"naqd_usd",   name:"Naqd USD",   currency:"USD", balance:0,      icon:"💵", color:"#5DCAA5" },
      { id:"visa_usd",   name:"Visa USD",   currency:"USD", balance:0,        icon:"💳", color:"#7F77DD" },
    ],
    cardBal: 1240, cashBal: 340,
    creditors: INIT_CREDITORS, receivables: INIT_RECEIVABLES, wedding: INIT_WEDDING,
    transactions: [], spInvest: { students:0, avgPrice:150, target:100 },
    carGoal: { target:15000, saved:0 }, netWorthAssets: 0,
    currentMonth: "apr26",
    monthPlans: {},
    debtFlows: [],
    mainGoalId: "toy",
    incomeSources: [
      { id:"sp_vebinar", name:"SP Invest vebinar", color:"#EF9F27", monthly:{ mar26:5000, apr26:15000, may26:5000, iyn26:10000, iyl26:10000, avg26:12000, sen26:10000, okt26:12000, noy26:12000, dek26:12000, yan27:15000, fev27:15000 } },
      { id:"sp_kurs",    name:"SP Invest kurs",    color:"#1D9E75", monthly:{ mar26:0, apr26:0, may26:2000, iyn26:2000, iyl26:2000, avg26:3000, sen26:3000, okt26:3000, noy26:3000, dek26:3000, yan27:5000, fev27:5000 } },
      { id:"other",      name:"Consulting/Boshqa", color:"#7F77DD", monthly:{ mar26:0, apr26:0, may26:0, iyn26:0, iyl26:0, avg26:0, sen26:0, okt26:1000, noy26:1000, dek26:1000, yan27:2000, fev27:2000 } },
    ],
    userGoals: [
      { id:"toy",      name:"To'y 2026",           icon:"♡", color:"#D4537E", target:18000, saved:1000, deadline:"2026-05-01", done:false },
      { id:"debt",     name:"Qarzdan ozodlik",      icon:"◎", color:"#7F77DD", target:13034, saved:0,    deadline:"2026-09-01", done:false },
      { id:"car",      name:"Mashina",              icon:"⊙", color:"#1D9E75", target:15000, saved:0,    deadline:"2026-08-01", done:false },
      { id:"asaloy",   name:"Asaloy safari",        icon:"✈", color:"#5DCAA5", target:2000,  saved:0,    deadline:"2026-06-01", done:false },
      { id:"emerg",    name:"Zaxira fond $15K",     icon:"◈", color:"#EF9F27", target:15000, saved:0,    deadline:"2027-01-01", done:false },
      { id:"invest",   name:"Investitsiya portfeli",icon:"▦", color:"#7F77DD", target:10000, saved:0,    deadline:"2027-03-01", done:false },
    ],
  };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n) => "$"+Math.round(Math.abs(n)).toLocaleString();
const fmtUZS = (n) => {
  const abs = Math.abs(Math.round(n));
  if(abs>=1000000) return (abs/1000000).toFixed(1).replace(".0","")+" mln so'm";
  return abs.toLocaleString("ru")+" so'm";
};
const fmtUZS_full = (n) => Math.round(Math.abs(n)).toLocaleString("ru")+" so'm";
const daysTill = (d) => Math.max(0, Math.ceil((new Date(d)-new Date())/86400000));
// Compute totals from accounts
const getTotalUZS = (state) => {
  const rate = state.uzsRate || 12750;
  return (state.accounts||[]).reduce((s,a) => s + (a.currency==="UZS" ? (a.balance||a.bal||0) : (a.balance||a.bal||0)*rate), 0);
};
const getTotalUSD = (state) => {
  const rate = state.uzsRate || 12750;
  return (state.accounts||[]).reduce((s,a) => s + (a.currency==="USD" ? (a.balance||a.bal||0) : (a.balance||a.bal||0)/rate), 0);
};


const getPaid = (c) => (c.payments||[]).reduce((s,p)=>s+p.amount,0);
const getAccBalUZS = (acc, rate) => acc.currency==="UZS" ? acc.balance : acc.balance * rate;


const getRemaining = (c) => Math.max(0, c.total - getPaid(c));
const getStatus = (c) => getRemaining(c)<=0 ? "closed" : "active";
const isActive = (c) => getRemaining(c)>0;


const WEDDING_DATE = "2026-05-01";

// ─── STYLES ──────────────────────────────────────────────────────────────────
const card = (bc, extra={}) => ({ background:C.surf, border:`1px solid ${bc||C.border}`, borderRadius:14, padding:16, marginBottom:12, ...extra });
const lbl = { fontSize:10, color:C.muted, letterSpacing:1.4, textTransform:"uppercase", fontWeight:600, marginBottom:6 };
const bignum = (c) => ({ fontSize:30, fontWeight:800, color:c||C.text, letterSpacing:-1, lineHeight:1 });
const barBg = { background:"#252525", borderRadius:4, height:7, overflow:"hidden", marginTop:8 };
const pbar = (pct,c) => ({ width:`${Math.min(100,Math.max(0,pct))}%`, background:c, height:"100%", borderRadius:4, transition:"width 0.5s" });
const pill = (c, sm) => ({ background:c+"18", border:`1px solid ${c}35`, borderRadius:20, padding:sm?"2px 8px":"5px 12px", color:c, fontSize:sm?10:12, fontWeight:600, display:"inline-block" });
const inp = { background:C.surf2, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };
const btn = (c, ghost) => ({ background:ghost?"transparent":c, border:`1px solid ${c}`, borderRadius:10, padding:"10px 0", color:ghost?c:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", transition:"opacity 0.15s" });

const TAG_COLORS = { vebinar:C.goldb, wedding:"#D4537E", debt:C.pur, car:C.grn, debt_free:C.grn, save:C.grn, new_year:C.goldb, scale:C.pur, wedding_prep:C.goldb, year_end:C.muted };

// ─── AI SYSTEM PROMPT BUILDER ────────────────────────────────────────────────
function buildSysPrompt(state) {
  const totalDebt = state.creditors.reduce((s,d)=>s+getRemaining(d),0);
  const totalWedding = state.wedding.reduce((s,i)=>s+(i.budget-i.paid),0);
  const cardTxns = state.transactions.slice(-10).map(t=>`${t.type==="income"?"+":"-"}$${t.amount} (${t.cat}) ${t.note||""}`).join(", ");
  const debtIds = state.creditors.map(d=>`${d.id}:${d.name}=$${Math.round(getRemaining(d))}`).join(", ");
  const today = new Date().toLocaleDateString("uz");
  return `Siz Ahmadxon Finance OS ilovasining AI yordamchisisiz. FAQAT O'ZBEK TILIDA javob bering.

JORIY HOLAT:
- Hisoblar: ${(state.accounts||[]).map(a=>a.name+': '+(a.currency==='UZS'?Math.round(a.bal).toLocaleString()+' so\'m':'$'+a.bal)).join(' | ')}
- Jami UZS: ${Math.round(getTotalUZS(state)).toLocaleString()} so'm (≈ $${Math.round(getTotalUSD(state))})
- Qarz: $${Math.round(totalDebt)} | To'y qoldi: $${Math.round(totalWedding)} | ${daysTill(WEDDING_DATE)} kun
- Kirim manbalari: ${(state.incomeSources||[]).map(s=>s.name+": $"+(s.monthly||{})[state.currentMonth||"apr26"]||0).join(", ")}
- Oy umumiy kirim maqsadi: $${(state.incomeSources||[]).reduce((sum,s)=>sum+((s.monthly||{})[state.currentMonth||"apr26"]||0),0)}
- Asosiy maqsad: ${(state.userGoals||[]).find(g=>g.id===state.mainGoalId)?.name||"yo'q"}
- Mashina: $${state.carGoal.saved}/$${state.carGoal.target}
- Kurs: ${state.uzsRate} so'm/$1
- Qarzlar: ${debtIds}
- Bugungi sana: ${today}

═══ ILOVA BOSHQARUVI ═══
Foydalanuvchi o'zgartirish so'raganda ACTIONS bloki qaytarasan.
Avval O'ZBEK TILIDA matn javob yoz, keyin quyidagi formatda ACTIONS:

<ACTIONS>
[{"type":"...", ...}]
</ACTIONS>

MAVJUD ACTIONLAR:

1. Balans yangilash — "balans X so'm" yoki "$X" so'raganda:
{"type":"UPDATE_ACCOUNT","id":"ACCOUNT_ID","bal":NUMBER}
// Account IDs: karta, naqd, viza (yoki boshqa id lar Sozlamada ko'rinadi)
// Misol: {"type":"UPDATE_ACCOUNT","id":"karta","bal":15810000}

2. Daromad qo'shish:
{"type":"ADD_TXN","txn":{"type":"income","amount":NUMBER,"cat":"SP Invest vebinar","note":"IZOH","via":"card","date":"${today}","monthId":"apr26"}}

3. Xarajat qo'shish:
{"type":"ADD_TXN","txn":{"type":"expense","amount":NUMBER,"cat":"KATEGORIYA","note":"IZOH","via":"cash","date":"${today}","monthId":"apr26"}}

4. Qarz to'lash (id: polat/komol/obida/humoy/isroil/abdul/uzum/anor):
{"type":"PAY_DEBT","id":"ID","amount":NUMBER}

5. To'y xarajat (id: toyxona/yostiq/uzuklar/asaloy/kiyim/foto/boshqa):
{"type":"WEDDING_PAY","id":"ID","amount":NUMBER}

6. SP Invest:
{"type":"UPDATE_SP","students":NUMBER,"avgPrice":NUMBER}

7. Kurs:
{"type":"UPDATE_RATE","rate":NUMBER}

8. Asosiy maqsadni o'zgartirish (id: toy/debt/car/asaloy/emerg/invest yoki yangi goal id):
{"type":"SET_MAIN_GOAL","id":"GOAL_ID"}

9. Kirim manbai yangilash (sourceId: sp_vebinar/sp_kurs/other, monthId: apr26/may26 va h.k.):
{"type":"UPDATE_INCOME_SOURCE","id":"SOURCE_ID","monthId":"MONTH_ID","value":NUMBER}

MUHIM QOIDALAR:
- So'mni dollarga o'girish: so'm / ${state.uzsRate}
- "413,011 so'm" = $${Math.round(413011/state.uzsRate)}
- Har doim avval matn javob, keyin ACTIONS bloki
- ACTIONS ichida faqat sof JSON, hech qanday izoh yo'q
- Agar hech qanday o'zgartirish kerak bo'lmasa ACTIONS qo'shma
- Foizli qarzlar birinchi: uzum, anor
- Mashina avgustdan oldin olinmaydi

Uslub: qisqa, aniq, raqamlar bilan. "Ahmadxon" deb murojaat qil.`;
}


// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
function Dashboard({ state, dispatch }) {
  const rate = state.uzsRate || 12750;
  const accounts = state.accounts || [];
  const totalUZS = getTotalUZS(state);
  const totalUSD = getTotalUSD(state);
  const [showUZS, setShowUZS] = useState(true);
  const [cfView, setCfView] = useState("monthly");

  const totalDebt = state.creditors.reduce((s,d)=>s+getRemaining(d),0);
  const daysLeft = daysTill(WEDDING_DATE);

  const curPlanBase = MONTHS_PLAN.find(m=>m.id===state.currentMonth)||MONTHS_PLAN[1];
  const curPlanOverride = state.monthPlans[state.currentMonth];
  const incTarget = curPlanOverride?.incTarget ?? curPlanBase.incTarget;
  const monthTxns = state.transactions.filter(t=>t.monthId===state.currentMonth);
  const monthInc = monthTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const monthExp = monthTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const incPct = incTarget>0?Math.round((monthInc/incTarget)*100):0;

  const predictedInc = (state.incomeSources||[]).reduce((s,src)=>s+((src.monthly||{})[state.currentMonth]||0),0);

  const weddingRem = state.wedding.reduce((s,i)=>s+(i.budget-i.paid),0);
  const debtRem = state.creditors.reduce((s,d)=>s+getRemaining(d),0);

  // ── Money Plan: where does this month's income go? ──────────────────────
  const mpItems = [];
  if(weddingRem > 0 && ["mar26","apr26","may26"].includes(state.currentMonth))
    mpItems.push({l:"To'y xarajatlari", note:"toyxona + yostiqcha", c:C.pink, v:Math.min(weddingRem, predictedInc*0.6)});
  mpItems.push({l:"Kun-ko'rish xarajati", note:"ijara, ovqat, transport", c:"#3B6D11", v:state.currentMonth==="mar26"||state.currentMonth==="apr26"?1000:1450});
  if(debtRem > 0) mpItems.push({l:"Qarz to'lov", note:"aktiv qarzlar", c:C.pur, v:Math.min(debtRem, Math.max(0, predictedInc - mpItems.reduce((s,x)=>s+x.v,0) - 500))});
  const moneyPlan = { items: mpItems, total: mpItems.reduce((s,x)=>s+x.v, 0) };

  // ── Cash flow rows ───────────────────────────────────────────────────────
  const PIE_C = ["#EF9F27","#E24B4A","#1D9E75","#7F77DD","#D4537E","#5DCAA5"];
  const txns = state.transactions || [];

  // Group transactions by cfView period
  const getPeriodKey = (t) => {
    const d = new Date(t.date || Date.now());
    if(cfView==="daily")     return t.date || "today";
    if(cfView==="weekly")    { const w=Math.ceil(d.getDate()/7); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-W${w}`; }
    if(cfView==="monthly")   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(cfView==="quarterly") return `${d.getFullYear()}-Q${Math.ceil((d.getMonth()+1)/3)}`;
    return `${d.getFullYear()}`;
  };
  const rowMap = {};
  txns.forEach(t => {
    const key = getPeriodKey(t);
    if(!rowMap[key]) rowMap[key] = {key, label:key, inc:0, exp:0};
    if(t.type==="income")  rowMap[key].inc += t.amount||0;
    if(t.type==="expense") rowMap[key].exp += t.amount||0;
  });
  const cfRows = Object.values(rowMap);

  // Pie chart: expense breakdown by category
  const expByCat = {};
  txns.filter(t=>t.type==="expense" && t.monthId===state.currentMonth).forEach(t => {
    expByCat[t.cat||"Boshqa"] = (expByCat[t.cat||"Boshqa"]||0) + (t.amount||0);
  });
  const pieData = Object.entries(expByCat).map(([name,value])=>({name,value}));

  return (
    <div style={{ padding:"14px 14px 0" }}>

      {/* ═══ BALANCE SECTION ═══ */}
      <div style={{ ...card(C.goldb+"50"), background:"linear-gradient(135deg,#1e1e1e,#252525)", paddingBottom:14 }}>
        {/* Toggle + label */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={lbl}>Umumiy balans</div>
          <button onClick={()=>setShowUZS(p=>!p)}
            style={{ background:"#252525", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 12px", color:C.muted, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ color:showUZS?"#5DCAA5":C.muted }}>so'm</span>
            <span style={{ color:C.dim }}>|</span>
            <span style={{ color:!showUZS?C.goldb:C.muted }}>USD</span>
          </button>
        </div>

        {/* Big balance */}
        <div style={{ fontSize:32, fontWeight:900, color:C.goldb, letterSpacing:-1, lineHeight:1, marginBottom:3 }}>
          {showUZS
            ? totalUZS.toLocaleString("uz-UZ")
            : "$"+Math.round(totalUSD).toLocaleString()
          }
          <span style={{ fontSize:16, fontWeight:500, color:C.muted, marginLeft:6 }}>
            {showUZS?"so'm":"USD"}
          </span>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
          {showUZS
            ? "≈ $"+Math.round(totalUSD).toLocaleString()
            : "≈ "+totalUZS.toLocaleString("uz-UZ")+" so'm"
          }
        </div>

        {/* Account cards grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {accounts.map(acc=>(
            <div key={acc.id} style={{ background:"#1a1a1a", borderRadius:12, padding:"12px 12px", border:`1px solid ${acc.color}25` }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{acc.icon}</span>
                <span style={{ fontSize:10, fontWeight:700, color:acc.color, letterSpacing:1, textTransform:"uppercase" }}>{acc.name}</span>
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:C.text, lineHeight:1 }}>
                {acc.currency==="UZS"
                  ? (acc.balance||0).toLocaleString("uz-UZ")+" so'm"
                  : "$"+Math.round(acc.balance||0).toLocaleString()
                }
              </div>
              <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
                {acc.currency==="UZS"
                  ? "≈ $"+Math.round((acc.balance||0)/rate).toLocaleString()
                  : "≈ "+(Math.round((acc.balance||0)*rate)).toLocaleString()+" so'm"
                }
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <button onClick={()=>dispatch({type:"OPEN_ADD_INCOME"})} style={{ ...btn(C.grn), padding:"10px 0" }}>+ Daromad</button>
          <button onClick={()=>dispatch({type:"OPEN_ADD_EXP"})} style={{ ...btn(C.red,true), padding:"10px 0" }}>− Xarajat</button>
        </div>
      </div>

      {/* INCOME PROGRESS */}
      <div style={card(incPct>=100?C.grn+"50":C.goldb+"40")}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <div style={lbl}>{curPlanBase.label} — daromad maqsadi</div>
            <div style={{ fontSize:12, color:C.muted }}>{curPlanOverride?.notes||curPlanBase.note}</div>
          </div>
          <div style={pill(incPct>=100?C.grn:incPct>50?C.goldb:C.red)}>{incPct}%</div>
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, margin:"10px 0" }}>
          <span style={{ fontSize:26, fontWeight:800, color:incPct>=100?C.grn:C.goldb }}>{fmt(monthInc)}</span>
          <span style={{ fontSize:16, color:C.muted }}>/ {fmt(incTarget)}</span>
        </div>
        <div style={barBg}><div style={pbar(incPct,incPct>=100?C.grn:C.goldb)}/></div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginTop:6 }}>
          <span>Xarajat: {fmt(monthExp)}</span>
          <span>Sof: {fmt(monthInc-monthExp)}</span>
          <span style={{ color:incTarget-monthInc>0?C.red:C.grn }}>
            {incTarget-monthInc>0?"Yetishmaydi: "+fmt(incTarget-monthInc):"✓ Bajarildi"}
          </span>
        </div>
      </div>

      {/* MONEY PLAN */}
      <div style={card(C.goldb+"35")}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Bu oy pul rejasi</div>
          <div style={{ fontSize:11, color:C.muted }}>topgan pulni qayerga?</div>
        </div>
        {moneyPlan.items.map((item,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<moneyPlan.items.length-1?`1px solid ${C.border}`:"none" }}>
            <div>
              <div style={{ fontSize:13, color:C.text }}>{item.l}</div>
              {item.note&&<div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{item.note}</div>}
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:item.c }}>{fmt(item.v)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0 0" }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.text }}>Jami kerak</span>
          <span style={{ fontSize:18, fontWeight:800, color:C.goldb }}>{fmt(moneyPlan.total)}</span>
        </div>
      </div>

      {/* QUICK STATS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          {l:"Qarz qoldi",v:fmt(totalDebt),v2:Math.round(totalDebt*rate).toLocaleString("uz-UZ")+" so'm",c:C.red},
          {l:"To'yga",v:daysLeft+" kun",v2:"May 1, 2026",c:C.pink},
          {l:"Naqd",v:(state.accounts||[]).find(a=>a.id==="naqd_uzs")?.balance?.toLocaleString()+" so'm",v2:"",c:C.goldb},
        ].map((s,i)=>(
          <div key={i} style={{ ...card(s.c+"35"), margin:0, padding:"10px 8px" }}>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:12, fontWeight:700, color:s.c, lineHeight:1.2 }}>{s.v}</div>
            {s.v2&&<div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{s.v2}</div>}
          </div>
        ))}
      </div>

      {/* ALERTS */}
      {[
        totalDebt>0&&{t:`Foizli birinchi: Uzum+Anorbank = $${Math.round(getRemaining(state.creditors.find(d=>d.id==="uzum")||{total:0,payments:[]})+getRemaining(state.creditors.find(d=>d.id==="anor")||{total:0,payments:[]}))}`,c:C.red},
        daysLeft<60&&{t:`To'yxona hali band qilinmadi! ${daysLeft} kun qoldi.`,c:C.pink},
        incPct<50&&monthInc<incTarget&&{t:`Bu oy hali ${fmt(incTarget-monthInc)} yig'ish kerak!`,c:C.goldb},
      ].filter(Boolean).map((a,i)=>(
        <div key={i} style={{ background:a.c+"10",border:`1px solid ${a.c}25`,borderRadius:10,padding:"11px 14px",fontSize:13,color:C.text,lineHeight:1.5,display:"flex",gap:10,marginBottom:8 }}>
          <span style={{ color:a.c,fontWeight:800 }}>!</span>{a.t}
        </div>
      ))}

      {/* CASH FLOW TABLE */}
      <div style={card()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Pul oqimi</div>
          <div style={{ display:"flex", gap:4 }}>
            {[{k:"daily",l:"Kun"},{k:"weekly",l:"Hafta"},{k:"monthly",l:"Oy"},{k:"quarterly",l:"Kv"},{k:"yearly",l:"Yil"}].map(v=>(
              <button key={v.k} onClick={()=>setCfView(v.k)}
                style={{ background:cfView===v.k?C.goldb:"transparent",border:`1px solid ${cfView===v.k?C.goldb:C.border}`,borderRadius:7,padding:"4px 8px",color:cfView===v.k?"#fff":C.muted,fontSize:11,cursor:"pointer",fontWeight:cfView===v.k?700:400,fontFamily:"inherit" }}>
                {v.l}
              </button>
            ))}
          </div>
        </div>
        {(cfRows||[]).length===0?(
          <div style={{ textAlign:"center",color:C.muted,fontSize:13,padding:"20px 0" }}>Hali tranzaksiya yo'q</div>
        ):(
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
              <thead>
                <tr style={{ background:"#1a1a1a" }}>
                  {["Davr","Kirim","Chiqim","Sof","Joriy balans"].map((h,i)=>(
                    <th key={h} style={{ textAlign:i===0?"left":"right",color:[C.muted,C.grn,C.red,C.goldb,C.pur][i],fontWeight:600,padding:"8px 10px",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  let runBal=totalUSD;
                  return [...(cfRows||[])].sort((a,b)=>b.key.localeCompare(a.key)).map((r,i)=>{
                    const net=r.inc-r.exp;
                    const bal=runBal;
                    runBal=runBal-net;
                    return (
                      <tr key={r.key} style={{ borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"#1a1a1a09" }}>
                        <td style={{ padding:"9px 10px",color:C.muted,fontWeight:500 }}>
                          {r.key}
                          {r.planned&&<div style={{ fontSize:9,color:C.goldb,marginTop:1 }}>Rej: {fmt(r.planned)}</div>}
                        </td>
                        <td style={{ textAlign:"right",padding:"9px 10px",color:r.inc>0?C.grn:C.dim,fontWeight:600 }}>{r.inc>0?fmt(r.inc):"-"}</td>
                        <td style={{ textAlign:"right",padding:"9px 10px",color:r.exp>0?C.red:C.dim,fontWeight:600 }}>{r.exp>0?fmt(r.exp):"-"}</td>
                        <td style={{ textAlign:"right",padding:"9px 10px",fontWeight:700,color:net>=0?C.grn:C.red }}>{net>=0?"+":""}{fmt(net)}</td>
                        <td style={{ textAlign:"right",padding:"9px 10px",fontWeight:800,color:C.goldb }}>{fmt(bal)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr style={{ background:"#1a1a1a",borderTop:`2px solid ${C.border}` }}>
                  <td style={{ padding:"9px 10px",color:C.text,fontWeight:700 }}>JAMI</td>
                  <td style={{ textAlign:"right",padding:"9px 10px",color:C.grn,fontWeight:800 }}>{fmt((cfRows||[]).reduce((s,r)=>s+r.inc,0))}</td>
                  <td style={{ textAlign:"right",padding:"9px 10px",color:C.red,fontWeight:800 }}>{fmt((cfRows||[]).reduce((s,r)=>s+r.exp,0))}</td>
                  <td style={{ textAlign:"right",padding:"9px 10px",fontWeight:800,color:C.goldb }}>{fmt((cfRows||[]).reduce((s,r)=>s+r.inc-r.exp,0))}</td>
                  <td style={{ textAlign:"right",padding:"9px 10px",fontWeight:800,color:C.goldb }}>{fmt(totalUSD)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* PIE */}
      {pieData.length>0&&(
        <div style={card()}>
          <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:12 }}>Bu oy xarajat taqsimoti</div>
          <div style={{ display:"flex",alignItems:"center" }}>
            <PieChart width={110} height={110}>
              <Pie data={pieData} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value" strokeWidth={0}>
                {pieData.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}
              </Pie>
            </PieChart>
            <div style={{ flex:1,marginLeft:8 }}>
              {pieData.map((d,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                  <div style={{ width:8,height:8,borderRadius:2,background:PIE_C[i%PIE_C.length],flexShrink:0 }}/>
                  <span style={{ fontSize:11,color:C.muted,flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:12,fontWeight:600,color:C.text }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECENT TXNS */}
      {state.transactions.length>0&&(
        <div style={card()}>
          <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:12 }}>So'nggi tranzaksiyalar</div>
          {[...state.transactions].reverse().slice(0,6).map((t,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<5?`1px solid ${C.border}`:"none" }}>
              <div>
                <div style={{ fontSize:13,color:C.text }}>{t.note||t.cat}</div>
                <div style={{ fontSize:10,color:C.muted,marginTop:1 }}>{t.cat} · {t.date}</div>
              </div>
              <div style={{ fontSize:15,fontWeight:700,color:t.type==="income"?C.grn:C.red }}>
                {t.type==="income"?"+":"-"}{fmt(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




// ═══════════════════════════════════════════════════════════════════════════
// ADD TRANSACTION MODAL
// ═══════════════════════════════════════════════════════════════════════════
function AddTxn({ type, state, onSave, onClose }) {
  const rate = state.uzsRate || 12750;
  const accounts = (state.accounts||[]);
  const [amtUZS, setAmtUZS] = useState("");
  const [amtUSD, setAmtUSD] = useState("");
  const [cat,    setCat]    = useState(type==="income"?CATS_INC[0]:CATS_EXP[0]);
  const [note,   setNote]   = useState("");
  const [accId,  setAccId]  = useState(accounts[0]?.id||"karta_uzs");
  const cats = type==="income"?CATS_INC:CATS_EXP;
  const isInc = type==="income";

  const onUZS = v => { setAmtUZS(v); setAmtUSD(v?String(Math.round(parseFloat(v)/rate*100)/100):""); };
  const onUSD = v => { setAmtUSD(v); setAmtUZS(v?String(Math.round(parseFloat(v)*rate)):""); };

  const save = () => {
    const uzs = parseFloat(amtUZS)||0;
    const usd = parseFloat(amtUSD)||(uzs/rate);
    if(uzs<=0) return;
    const selAcc = accounts.find(a=>a.id===accId);
    const via = selAcc?.currency==="UZS" ? (accId.includes("naqd")?"cash":"card") : "card";
    onSave({ type, amount:usd, amountUZS:uzs, cat, note, via, accId, date:new Date().toLocaleDateString("uz"), monthId:state.currentMonth });
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ background:"#1a1a1a",borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:480,boxSizing:"border-box" }}>

        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontSize:17,fontWeight:800,color:isInc?C.grn:C.red }}>
            {isInc?"＋ Daromad":"－ Xarajat"}
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer",lineHeight:1 }}>✕</button>
        </div>

        {/* UZS — PRIMARY BIG INPUT */}
        <div style={{ background:"#141414",borderRadius:14,padding:"16px 18px",marginBottom:12 }}>
          <div style={{ fontSize:10,color:isInc?C.grn:C.red,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8 }}>
            Summa (so'm)
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <input value={amtUZS} onChange={e=>onUZS(e.target.value)}
              type="number" placeholder="0"
              style={{ flex:1,background:"transparent",border:"none",outline:"none",fontSize:28,fontWeight:900,color:C.text,fontFamily:"inherit" }}
              autoFocus/>
            <span style={{ fontSize:14,color:C.muted,fontWeight:600 }}>so'm</span>
          </div>
          {amtUSD && <div style={{ fontSize:13,color:C.goldb,marginTop:6 }}>≈ {amtUSD} USD</div>}
        </div>

        {/* USD secondary */}
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10,color:C.muted,letterSpacing:1,marginBottom:4 }}>yoki USD kiritish</div>
            <input value={amtUSD} onChange={e=>onUSD(e.target.value)}
              type="number" placeholder="0"
              style={{ ...inp,fontSize:14 }}/>
          </div>
          {amtUZS && <div style={{ fontSize:11,color:C.muted,paddingTop:20 }}>= {Math.round(parseFloat(amtUZS)||0).toLocaleString()} so'm</div>}
        </div>

        {/* Account selection */}
        <div style={{ marginBottom:12 }}>
          <div style={{ ...lbl,marginBottom:6 }}>Hisob</div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {accounts.map(acc=>(
              <button key={acc.id} onClick={()=>setAccId(acc.id)}
                style={{ background:accId===acc.id?acc.color+"20":"#252525",border:`1px solid ${accId===acc.id?acc.color+"60":C.border}`,borderRadius:10,padding:"7px 12px",color:accId===acc.id?acc.color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",gap:6,alignItems:"center" }}>
                <span>{acc.icon}</span>
                <span>{acc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom:12 }}>
          <div style={{ ...lbl,marginBottom:4 }}>Kategoriya</div>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={inp}>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Note */}
        <div style={{ marginBottom:18 }}>
          <div style={{ ...lbl,marginBottom:4 }}>Izoh</div>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="ixtiyoriy" style={inp}/>
        </div>

        <button onClick={save}
          style={{ ...btn(isInc?C.grn:C.red),padding:"14px 0",fontSize:16,fontWeight:800 }}>
          Saqlash
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// DEBTS
// ═══════════════════════════════════════════════════════════════════════════
function DeadlineEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value||"");
  if(editing) return (
    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
      <input value={val} onChange={e=>setVal(e.target.value)} type="date"
        style={{ background:"#252525", border:"1px solid #2e2e2e", borderRadius:8, padding:"4px 8px", color:"#f0f0f0", fontSize:12, outline:"none", fontFamily:"inherit" }}/>
      <button onClick={()=>{ onSave(val); setEditing(false); }}
        style={{ background:"#1D9E75", border:"none", borderRadius:7, padding:"4px 10px", color:"#fff", fontSize:11, cursor:"pointer" }}>✓</button>
      <button onClick={()=>setEditing(false)}
        style={{ background:"transparent", border:"1px solid #E24B4A", borderRadius:7, padding:"4px 8px", color:"#E24B4A", fontSize:11, cursor:"pointer" }}>✕</button>
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:12, color: value ? "#f0f0f0" : "#555" }}>{value || "belgilanmagan"}</span>
      <button onClick={()=>{ setVal(value||""); setEditing(true); }}
        style={{ background:"none", border:"none", color:"#888", fontSize:12, cursor:"pointer" }}>✏</button>
    </div>
  );
}

function EditReceivable({ r, dispatch, onClose }) {
  const [amt,  setAmt]  = useState(String(r.amount));
  const [total, setTotal] = useState(String(r.total||r.amount));
  const [paid_, setPaid] = useState(String(r.paid||0));
  const [note_, setNote] = useState(r.note||"");

  const save = () => {
    const newAmt   = parseFloat(amt);
    const newTotal = parseFloat(total)||0;
    const newPaid  = parseFloat(paid_)||0;
    if(isNaN(newAmt)||newAmt<0) return;
    dispatch({ type:"UPDATE_RECEIVABLE", id:r.id,
      amount:newAmt, total:newTotal||newAmt, paid:newPaid, note:note_ });
    onClose();
  };

  return (
    <div style={{ marginTop:10, borderTop:`1px solid #2e2e2e`, paddingTop:12 }}>
      <div style={{ fontSize:12, fontWeight:600, color:"#EF9F27", marginBottom:10 }}>Tahrirlash</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div>
          <div style={{ fontSize:10, color:"#888", letterSpacing:1.2, textTransform:"uppercase", marginBottom:4 }}>Qolgan ($)</div>
          <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" min="0"
            style={{ background:"#252525", border:"1px solid #2e2e2e", borderRadius:10, padding:"9px 12px", color:"#f0f0f0", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#888", letterSpacing:1.2, textTransform:"uppercase", marginBottom:4 }}>Jami qarz ($)</div>
          <input value={total} onChange={e=>setTotal(e.target.value)} type="number" min="0"
            style={{ background:"#252525", border:"1px solid #2e2e2e", borderRadius:10, padding:"9px 12px", color:"#f0f0f0", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#888", letterSpacing:1.2, textTransform:"uppercase", marginBottom:4 }}>To'langan ($)</div>
          <input value={paid_} onChange={e=>setPaid(e.target.value)} type="number" min="0"
            style={{ background:"#252525", border:"1px solid #2e2e2e", borderRadius:10, padding:"9px 12px", color:"#f0f0f0", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#888", letterSpacing:1.2, textTransform:"uppercase", marginBottom:4 }}>Izoh</div>
          <input value={note_} onChange={e=>setNote(e.target.value)}
            style={{ background:"#252525", border:"1px solid #2e2e2e", borderRadius:10, padding:"9px 12px", color:"#f0f0f0", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }}/>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <button onClick={save}
          style={{ background:"#1D9E75", border:"1px solid #1D9E75", borderRadius:10, padding:"10px 0", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
          Saqlash
        </button>
        <button onClick={onClose}
          style={{ background:"transparent", border:"1px solid #E24B4A", borderRadius:10, padding:"10px 0", color:"#E24B4A", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
          Bekor
        </button>
      </div>
    </div>
  );
}

function Debts({ state, dispatch }) {
  const [view, setView] = useState("list"); // list | detail | add | addpay
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("active"); // active | closed | all
  const [catFilter, setCatFilter] = useState("all");
  const [sort, setSort] = useState("remaining"); // remaining | name | total
  const [search, setSearch] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [newC, setNewC] = useState({ name:"", cat:"shaxsiy", currency:"USD", total:"", card:"", cardName:"", telegram:"", note:"" });
  const [recvId, setRecvId] = useState(null); const [recvAmt, setRecvAmt] = useState("");
  const [editRecv, setEditRecv] = useState(null); // {id} for editing receivable details
  const [confirmDelete, setConfirmDelete] = useState(null); // {creditorId, payId}
  const [editPay, setEditPay] = useState(null); // {creditorId, payId, amt, note}

  const allCreditors = state.creditors||[];
  const filtered = allCreditors.filter(c => {
    const rem = getRemaining(c);
    const st = rem<=0?"closed":"active";
    if(filter==="active" && st!=="active") return false;
    if(filter==="closed" && st!=="closed") return false;
    if(catFilter!=="all" && c.cat!==catFilter) return false;
    if(search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if(sort==="remaining") {
      if(a.cat==="bank"&&b.cat!=="bank") return -1;
      if(b.cat==="bank"&&a.cat!=="bank") return 1;
      return getRemaining(b)-getRemaining(a);
    }
    if(sort==="name") return a.name.localeCompare(b.name);
    if(sort==="total") return b.total-a.total;
    return 0;
  });

  const activeAll = allCreditors.filter(c=>getRemaining(c)>0);
  const totalBorrowed = allCreditors.reduce((s,c)=>s+c.total,0);
  const totalPaid = allCreditors.reduce((s,c)=>s+getPaid(c),0);
  const totalRem = allCreditors.reduce((s,c)=>s+getRemaining(c),0);

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if(view==="detail" && selected) {
    const c = allCreditors.find(d=>d.id===selected);
    if(!c) { setView("list"); return null; }
    const rem = getRemaining(c);
    const paid = getPaid(c);
    const pct = c.total>0?Math.round((paid/c.total)*100):0;
    const closed = rem<=0;
    const sortedPayments = [...(c.payments||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const MAX_PAY = Math.max(0,rem);

    return (
      <div style={{ padding:"14px 14px 0" }}>
        <button onClick={()=>setView("list")} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:10, padding:"7px 14px", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit", marginBottom:14 }}>
          ← Orqaga
        </button>

        {/* HEADER */}
        <div style={{ ...card(closed?C.grn+"40":C.goldb+"35") }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:closed?C.grn:C.text, marginBottom:4 }}>{c.name}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={pill(C.pur,true)}>{DEBT_CAT_LABELS[c.cat]||c.cat}</span>
                <span style={pill(c.currency==="USD"?C.goldb:C.grn,true)}>{c.currency}</span>
                <span style={pill(closed?C.grn:C.red,true)}>{closed?"Yopilgan":"Aktiv"}</span>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:900, color:closed?C.grn:C.red }}>
                {closed?"$0":fmt(rem)}
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>qoldi</div>
            </div>
          </div>
          <div style={barBg}><div style={pbar(pct, closed?C.grn:C.goldb)}/></div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginTop:6 }}>
            <span>Jami: {fmt(c.total)}</span>
            <span>To'landi: {fmt(paid)}</span>
            <span style={{ color:closed?C.grn:C.red }}>{pct}%</span>
          </div>
        </div>

        {/* CONTACT INFO */}
        {(c.card||c.cardName||c.telegram||c.note) && (
          <div style={card()}>
            <div style={{ ...lbl, marginBottom:10 }}>Rekvizitlar</div>
            {c.card && <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.muted }}>Karta</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:"monospace" }}>{c.card}</span>
            </div>}
            {c.cardName && <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.muted }}>Karta egasi</span>
              <span style={{ fontSize:13, color:C.text }}>{c.cardName}</span>
            </div>}
            {c.telegram && <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.muted }}>Telegram</span>
              <span style={{ fontSize:13, color:C.goldb }}>{c.telegram}</span>
            </div>}
            {c.note && <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.muted }}>Izoh</span>
              <span style={{ fontSize:13, color:C.text }}>{c.note}</span>
            </div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0" }}>
              <span style={{ fontSize:12, color:C.muted }}>To'lash muddati</span>
              <DeadlineEdit value={c.dueDate||""} onSave={v=>dispatch({type:"UPDATE_CREDITOR",id:c.id,updates:{dueDate:v}})}/>
            </div>
          </div>
        )}

        {/* ADD PAYMENT */}
        {!closed && (
          <div style={card(C.goldb+"35")}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>To'lov qo'shish</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              <div>
                <div style={{ ...lbl, marginBottom:4 }}>Summa ($)</div>
                <input value={payAmt} onChange={e=>setPayAmt(e.target.value)} type="number" max={MAX_PAY} placeholder={`max ${fmt(rem)}`} style={inp}/>
              </div>
              <div>
                <div style={{ ...lbl, marginBottom:4 }}>Izoh</div>
                <input value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="ixtiyoriy" style={inp}/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:12 }}>
              {["card","cash","bank"].map(m=>(
                <button key={m} onClick={()=>setPayMethod(m)} style={{ ...btn(C.goldb, payMethod!==m), padding:"8px 0", fontSize:12 }}>
                  {m==="card"?"💳 Karta":m==="cash"?"💵 Naqd":"🏦 Bank"}
                </button>
              ))}
            </div>
            <button onClick={()=>{
              const a=parseFloat(payAmt);
              if(!a||isNaN(a)||a<=0) return;
              if(a>MAX_PAY+0.01) { alert(`Maksimal to'lov: $${MAX_PAY.toFixed(2)}`); return; }
              dispatch({type:"PAY_DEBT", id:c.id, amount:a, method:payMethod, note:payNote, updateBalance:true});
              setPayAmt(""); setPayNote("");
            }} style={{ ...btn(C.grn), padding:"12px 0" }}>
              To'lovni saqlash
            </button>
          </div>
        )}

        {/* PAYMENT HISTORY */}
        <div style={card()}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>
            To'lovlar tarixi ({sortedPayments.length})
          </div>
          {sortedPayments.length===0
            ? <div style={{ fontSize:13, color:C.muted, textAlign:"center", padding:"20px 0" }}>Hali to'lov yo'q</div>
            : sortedPayments.map((p,i)=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<sortedPayments.length-1?`1px solid ${C.border}`:"none" }}>
                <div>
                  <div style={{ fontSize:13, color:C.text }}>{p.note||"To'lov"}</div>
                  {editPay?.payId===p.id && (
                    <div style={{ marginTop:8, display:"flex", gap:6 }}>
                      <input value={editPay.amt} onChange={e=>setEditPay(prev=>({...prev,amt:e.target.value}))}
                        type="number" placeholder="Summa ($)"
                        style={{ ...inp, width:90, padding:"6px 8px", fontSize:12 }}/>
                      <input value={editPay.note} onChange={e=>setEditPay(prev=>({...prev,note:e.target.value}))}
                        placeholder="Izoh" style={{ ...inp, flex:1, padding:"6px 8px", fontSize:12 }}/>
                      <button onClick={()=>{
                        const a=parseFloat(editPay.amt);
                        if(!isNaN(a)&&a>0) {
                          dispatch({type:"EDIT_PAYMENT",creditorId:c.id,payId:p.id,amount:a,note:editPay.note});
                        }
                        setEditPay(null);
                      }} style={{ ...btn(C.grn),width:"auto",padding:"6px 12px",fontSize:12 }}>✓</button>
                      <button onClick={()=>setEditPay(null)} style={{ ...btn(C.red,true),width:"auto",padding:"6px 10px",fontSize:12 }}>✕</button>
                    </div>
                  )}
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{p.date} · {p.method==="card"?"💳 Karta":p.method==="cash"?"💵 Naqd":"🏦 Bank"}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:16, fontWeight:700, color:C.grn }}>{fmt(p.amount)}</span>
                  <button onClick={()=>setEditPay(editPay?.payId===p.id?null:{creditorId:c.id,payId:p.id,amt:String(p.amount),note:p.note||""})}
                    style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", color:C.muted, fontSize:12, cursor:"pointer" }}>✏</button>
                  {confirmDelete?.payId===p.id ? (
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>{ dispatch({type:"DELETE_PAYMENT",creditorId:c.id,payId:p.id}); setConfirmDelete(null); }}
                        style={{ background:C.red+"20", border:`1px solid ${C.red}50`, borderRadius:6, padding:"3px 10px", color:C.red, fontSize:11, cursor:"pointer", fontWeight:700 }}>
                        ha, o'chir
                      </button>
                      <button onClick={()=>setConfirmDelete(null)}
                        style={{ background:"#252525", border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 8px", color:C.muted, fontSize:11, cursor:"pointer" }}>
                        bekor
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDelete({creditorId:c.id,payId:p.id})}
                      style={{ background:"none", border:`1px solid ${C.red}30`, borderRadius:6, padding:"4px 10px", color:C.red, fontSize:12, cursor:"pointer", fontWeight:600 }}>✕</button>
                  )}
                </div>
              </div>
            ))
          }
          {sortedPayments.length>0 && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 0", marginTop:4, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Jami to'landi</span>
              <span style={{ fontSize:16, fontWeight:800, color:C.grn }}>{fmt(paid)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ADD CREDITOR VIEW ────────────────────────────────────────────────────────
  if(view==="add") {
    const norm = s => s.trim().toLowerCase();
    const potential_dupe = allCreditors.find(d=>norm(d.name)===norm(newC.name)&&d.cat===newC.cat);

    return (
      <div style={{ padding:"14px 14px 0" }}>
        <button onClick={()=>setView("list")} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:10, padding:"7px 14px", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit", marginBottom:14 }}>
          ← Orqaga
        </button>
        <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:16 }}>Yangi qarzdor qo'shish</div>

        {potential_dupe && (
          <div style={{ background:C.red+"10", border:`1px solid ${C.red}30`, borderRadius:10, padding:"11px 14px", fontSize:13, color:C.text, marginBottom:12 }}>
            ⚠️ Ogohlantirish: "{potential_dupe.name}" ({DEBT_CAT_LABELS[potential_dupe.cat]}) allaqachon mavjud!
          </div>
        )}

        {[
          {l:"Ism",k:"name",t:"text",ph:"Masalan: Komolxon Sobirov"},
          {l:"Jami qarz ($)",k:"total",t:"number",ph:"0.00"},
          {l:"Karta raqami",k:"card",t:"text",ph:"ixtiyoriy"},
          {l:"Karta egasi",k:"cardName",t:"text",ph:"ixtiyoriy"},
          {l:"Telegram",k:"telegram",t:"text",ph:"@username"},
          {l:"Izoh",k:"note",t:"text",ph:"ixtiyoriy"},
        ].map(f=>(
          <div key={f.k} style={{ marginBottom:12 }}>
            <div style={{ ...lbl, marginBottom:4 }}>{f.l}</div>
            <input value={newC[f.k]} onChange={e=>setNewC(p=>({...p,[f.k]:e.target.value}))} type={f.t} placeholder={f.ph} style={inp}/>
          </div>
        ))}

        <div style={{ marginBottom:12 }}>
          <div style={{ ...lbl, marginBottom:4 }}>Kategoriya</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {DEBT_CATS.map(cat=>(
              <button key={cat} onClick={()=>setNewC(p=>({...p,cat}))} style={{ ...btn(C.goldb, newC.cat!==cat), padding:"7px 12px", fontSize:12, width:"auto" }}>
                {DEBT_CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ ...lbl, marginBottom:4 }}>Valyuta</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {["USD","UZS"].map(cur=>(
              <button key={cur} onClick={()=>setNewC(p=>({...p,currency:cur}))} style={{ ...btn(C.goldb, newC.currency!==cur), padding:"9px 0" }}>
                {cur}
              </button>
            ))}
          </div>
        </div>

        <button onClick={()=>{
          if(!newC.name.trim()||!newC.total) return;
          const t=parseFloat(newC.total);
          if(isNaN(t)||t<=0) return;
          const id = "c_"+Date.now();
          dispatch({type:"ADD_CREDITOR", creditor:{...newC, id, total:t, payments:[]}});
          setNewC({name:"",cat:"shaxsiy",currency:"USD",total:"",card:"",cardName:"",telegram:"",note:""});
          setView("list");
        }} style={{ ...btn(C.grn), padding:"13px 0", fontSize:15 }}>
          Saqlash
        </button>
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"14px 14px 0" }}>

      {/* DASHBOARD SUMMARY */}
      <div style={{ ...card(C.red+"40") }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>Umumiy qarz holati</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            {l:"Jami olingan",v:fmt(totalBorrowed),c:"#888"},
            {l:"Jami to'landi",v:fmt(totalPaid),c:C.grn},
            {l:"Jami qoldi",v:fmt(totalRem),c:C.red},
          ].map((x,i)=>(
            <div key={i} style={{ background:"#1a1a1a", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:800, color:x.c }}>{x.v}</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{x.l}</div>
            </div>
          ))}
        </div>
        <div style={barBg}><div style={pbar(totalBorrowed>0?Math.round((totalPaid/totalBorrowed)*100):0, C.grn)}/></div>
        <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
          {totalBorrowed>0?Math.round((totalPaid/totalBorrowed)*100):0}% to'landi · {activeAll.length} aktiv · {allCreditors.filter(c=>getRemaining(c)<=0).length} yopilgan
        </div>
      </div>

      {/* FILTERS + SEARCH */}
      <div style={card()}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom bo'yicha qidirish..." style={{ ...inp, marginBottom:10 }}/>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {[{k:"active",l:"Aktiv"},{k:"closed",l:"Yopilgan"},{k:"all",l:"Hammasi"}].map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{ ...btn(C.goldb,filter!==f.k), padding:"6px 12px", fontSize:12, width:"auto" }}>{f.l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          <button onClick={()=>setCatFilter("all")} style={{ ...btn(C.pur,catFilter!=="all"), padding:"5px 10px", fontSize:11, width:"auto" }}>Barchasi</button>
          {DEBT_CATS.map(cat=>(
            <button key={cat} onClick={()=>setCatFilter(cat)} style={{ ...btn(C.pur,catFilter!==cat), padding:"5px 10px", fontSize:11, width:"auto" }}>
              {DEBT_CAT_LABELS[cat]}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, color:C.muted }}>Sort:</span>
          {[{k:"remaining",l:"Qoldiq"},{k:"total",l:"Jami qarz"},{k:"name",l:"Nom A-Z"}].map(s=>(
            <button key={s.k} onClick={()=>setSort(s.k)} style={{ ...btn(C.goldb,sort!==s.k), padding:"5px 10px", fontSize:11, width:"auto" }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* ADD NEW BUTTON */}
      <button onClick={()=>setView("add")} style={{ ...btn(C.grn,true), padding:"11px 0", marginBottom:12 }}>
        + Yangi qarzdor qo'shish
      </button>

      {/* DEBT PRIORITY NOTE */}
      {filter==="active" && (
        <div style={{ background:C.red+"10", border:`1px solid ${C.red}25`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.text, marginBottom:12 }}>
          <span style={{ color:C.red, fontWeight:700 }}>Strategiya: </span>
          Foizli qarzlar birinchi (bank): Uzum + Anorbank → keyin eng kattadan kichikka
        </div>
      )}

      {/* CREDITOR LIST */}
      {filtered.length===0
        ? <div style={{ ...card(), textAlign:"center", color:C.muted, fontSize:14, padding:"30px 0" }}>
            {search ? "Qidiruv natijasi topilmadi" : filter==="closed" ? "Yopilgan qarzlar yo'q" : "Aktiv qarzlar yo'q 🎉"}
          </div>
        : filtered.map((c)=>{
            const rem = getRemaining(c);
            const paid2 = getPaid(c);
            const pct = c.total>0?Math.round((paid2/c.total)*100):0;
            const closed = rem<=0;
            const isBankDebt = c.cat==="bank";
            const lastPay = [...(c.payments||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];

            return (
              <div key={c.id} style={{ ...card(closed?C.grn+"30":isBankDebt?C.red+"45":C.border), cursor:"pointer" }}
                onClick={()=>{ setSelected(c.id); setView("detail"); setPayAmt(""); setPayNote(""); setPayMethod("card"); }}>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:15, fontWeight:700, color:closed?C.grn:C.text }}>{c.name}</span>
                      <span style={pill(C.pur,true)}>{DEBT_CAT_LABELS[c.cat]||c.cat}</span>
                      {isBankDebt && !closed && <span style={pill(C.red,true)}>foizli</span>}
                      {closed && <span style={pill(C.grn,true)}>yopilgan ✓</span>}
                    </div>
                    <div style={{ display:"flex", gap:16, fontSize:12 }}>
                      <span style={{ color:C.muted }}>Jami: <span style={{ color:C.text, fontWeight:600 }}>{fmt(c.total)}</span></span>
                      <span style={{ color:C.muted }}>To'landi: <span style={{ color:C.grn, fontWeight:600 }}>{fmt(paid2)}</span></span>
                    </div>
                    {lastPay && <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>
                      Oxirgi to'lov: {fmt(lastPay.amount)} · {lastPay.date}
                    </div>}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:22, fontWeight:900, color:closed?C.grn:C.red }}>
                      {closed?"$0":fmt(rem)}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>qoldi</div>
                  </div>
                </div>

                <div style={barBg}><div style={pbar(pct, closed?C.grn:isBankDebt?C.red:C.goldb)}/></div>
                <div style={{ fontSize:10, color:C.muted, marginTop:5 }}>
                  {pct}% to'landi · {(c.payments||[]).length} ta to'lov ·
                  <span style={{ color:"#555" }}> bosib tafsilot ko'ring →</span>
                </div>
              </div>
            );
          })
      }

      {/* RECEIVABLES */}
      <div style={{ ...lbl, paddingLeft:2, marginBottom:8, marginTop:8 }}>Menga qaytarish kerak</div>
      {(state.receivables||[]).map((r,i)=>{
        const isKeldi = recvId===r.id;
        const isEditing = editRecv===r.id;
        
        return (
          <div key={r.id} style={{ ...card(r.amount<=0?C.border:C.grn+"35") }}>
            {/* Main row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", flex:1 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:C.grn+"18",display:"flex",alignItems:"center",justifyContent:"center",color:C.grn,fontSize:14,fontWeight:700,flexShrink:0 }}>
                  {r.name[0]}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{r.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.note}</div>
                  {r.total && (
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                      Jami: <span style={{ color:C.text, fontWeight:600 }}>{fmt(r.total)}</span>
                      {" · "}To'lindi: <span style={{ color:C.grn, fontWeight:600 }}>{fmt(r.paid||0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ fontSize:20, fontWeight:800, color:r.amount>0?C.grn:C.muted }}>
                  +{fmt(r.amount)}
                </div>
                {r.amount>0 && (
                  <button onClick={(e)=>{e.stopPropagation();setRecvId(isKeldi?null:r.id);setRecvAmt("");setEditRecv(null);}}
                    style={{ background:C.grn+"15", border:`1px solid ${C.grn}30`, borderRadius:8, padding:"5px 10px", color:C.grn, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                    Keldi
                  </button>
                )}
                <button onClick={(e)=>{e.stopPropagation();setEditRecv(isEditing?null:r.id);setRecvId(null);}}
                  style={{ background:"#252525", border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 9px", color:C.muted, fontSize:12, cursor:"pointer" }}>
                  ✏
                </button>
              </div>
            </div>

            {/* KELDI — received payment panel */}
            {isKeldi && (
              <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Qancha qaytardi?</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={recvAmt} onChange={e=>setRecvAmt(e.target.value)}
                    placeholder={`max $${r.amount}`} type="number"
                    style={{ ...inp, flex:1, width:"auto", padding:"9px 12px" }}/>
                  <button onClick={()=>{
                    const a=parseFloat(recvAmt)||r.amount;
                    dispatch({type:"RECEIVE_DEBT",id:r.id,amount:Math.min(a,r.amount)});
                    setRecvId(null); setRecvAmt("");
                  }} style={{ ...btn(C.grn),width:"auto",padding:"9px 18px" }}>✓</button>
                  <button onClick={()=>setRecvId(null)} style={{ ...btn(C.red,true),width:"auto",padding:"9px 12px" }}>✕</button>
                </div>
              </div>
            )}

            {/* EDIT — update amount/note/total */}
            {isEditing && (
              <EditReceivable key={r.id} r={r} dispatch={dispatch} onClose={()=>setEditRecv(null)}/>
            )}
          </div>
        );
      })}

      {/* CLOSED DEBTS TABLE */}
      {(() => {
        const closed = allCreditors.filter(c => getRemaining(c) <= 0);
        if(closed.length === 0) return null;
        return (
          <div style={{ marginTop:8, marginBottom:16 }}>
            <div style={{ ...lbl, paddingLeft:2, marginBottom:10 }}>
              To'liq to'langan ({closed.length}) ✓
            </div>
            <div style={{ background:"#1e1e1e", border:`1px solid ${C.grn}30`, borderRadius:14, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 76px 76px", background:"#1a1a1a", padding:"9px 14px", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:1.2, textTransform:"uppercase" }}>Ism / Kategoriya</span>
                <span style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", textAlign:"right" }}>Jami qarz</span>
                <span style={{ fontSize:9, fontWeight:700, color:C.grn, letterSpacing:1.2, textTransform:"uppercase", textAlign:"right" }}>To'landi</span>
              </div>
              {closed.map((c, i) => {
                const paid = getPaid(c);
                const lastPay = [...(c.payments||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
                return (
                  <div key={c.id}
                    onClick={()=>{ setSelected(c.id); setView("detail"); setPayAmt(""); setPayNote(""); setPayMethod("card"); }}
                    style={{ display:"grid", gridTemplateColumns:"1fr 76px 76px", padding:"10px 14px", borderBottom: i < closed.length-1 ? `1px solid ${C.border}` : "none", cursor:"pointer" }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ width:18, height:18, borderRadius:5, background:C.grn+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:C.grn, fontWeight:900, flexShrink:0 }}>✓</span>
                        <span style={{ fontSize:13, fontWeight:600, color:C.grn }}>{c.name}</span>
                      </div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2, marginLeft:25 }}>
                        {DEBT_CAT_LABELS[c.cat]||c.cat}{lastPay ? ` · ${lastPay.date}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                      <span style={{ fontSize:12, color:C.dim }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ textAlign:"right", display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.grn }}>{fmt(paid)}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 76px 76px", padding:"10px 14px", background:"#1a1a1a", borderTop:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.text }}>Jami yopildi</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.muted, textAlign:"right" }}>{fmt(closed.reduce((s,c)=>s+c.total,0))}</span>
                <span style={{ fontSize:13, fontWeight:800, color:C.grn, textAlign:"right" }}>{fmt(closed.reduce((s,c)=>s+getPaid(c),0))}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// WEDDING
// ═══════════════════════════════════════════════════════════════════════════
function Goals({ state, dispatch }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState(null); // full edit panel open
  const [editFields, setEditFields] = useState({});
  const [aiAsked, setAiAsked] = useState(false);
  const [newG, setNewG] = useState({ name:"", icon:"◈", color:C.goldb, target:"", saved:"", deadline:"" });

  const goals = state.userGoals || [];
  const active = goals.filter(g=>!g.done);
  const done = goals.filter(g=>g.done);
  const mainGoal = goals.find(g=>g.id===state.mainGoalId) || active[0];

  const daysLeft = (deadline) => {
    if(!deadline) return null;
    return Math.max(0, Math.ceil((new Date(deadline)-new Date())/86400000));
  };

  const openEdit = (g) => {
    setEditGoalId(g.id);
    setEditFields({ name:g.name, icon:g.icon, color:g.color, target:String(g.target), saved:String(g.saved), deadline:g.deadline||"" });
  };
  const saveEdit = (id) => {
    const t=parseFloat(editFields.target), sv=parseFloat(editFields.saved)||0;
    if(!editFields.name.trim()||isNaN(t)) return;
    dispatch({ type:"UPDATE_GOAL", id, updates:{ name:editFields.name.trim(), icon:editFields.icon, color:editFields.color, target:t, saved:Math.min(sv,t), deadline:editFields.deadline } });
    setEditGoalId(null);
  };

  const ICONS = ["♡","◎","⊙","◈","▦","✈","★","⊞","◇","✦"];
  const COLORS = [C.pink,C.pur,C.grn,C.goldb,"#5DCAA5",C.red,"#378ADD","#D4537E"];

  return (
    <div style={{ padding:"14px 14px 0" }}>

      {/* MAIN GOAL HERO */}
      {mainGoal && (
        <div style={{ ...card(mainGoal.color+"45"), padding:0, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, color:mainGoal.color }}>{mainGoal.icon}</span>
              <span style={{ fontSize:11, color:mainGoal.color, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>Asosiy maqsad</span>
            </div>
            <button onClick={()=>{ const next=active.find(g=>g.id!==mainGoal.id); if(next) dispatch({type:"SET_MAIN_GOAL",id:next.id}); }}
              style={{ background:"none", border:`1px solid ${mainGoal.color}30`, borderRadius:20, padding:"3px 10px", color:mainGoal.color, fontSize:10, cursor:"pointer" }}>
              o'zgartirish
            </button>
          </div>
          <div style={{ textAlign:"center", padding:"20px 16px 10px" }}>
            {mainGoal.deadline && daysLeft(mainGoal.deadline) !== null ? (
              <>
                <div style={{ fontSize:72, fontWeight:900, color:mainGoal.color, letterSpacing:-4, lineHeight:1 }}>{daysLeft(mainGoal.deadline)}</div>
                <div style={{ fontSize:16, color:"#ccc", marginTop:6 }}>kun qoldi</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                  {mainGoal.deadline.split("-").reverse().join(".")} · {Math.ceil(daysLeft(mainGoal.deadline)/7)} hafta
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:52, fontWeight:900, color:mainGoal.color, letterSpacing:-2, lineHeight:1 }}>{fmt(mainGoal.target-mainGoal.saved)}</div>
                <div style={{ fontSize:14, color:"#ccc", marginTop:6 }}>qoldi</div>
              </>
            )}
          </div>
          <div style={{ padding:"0 16px 16px" }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, textAlign:"center", marginBottom:12 }}>{mainGoal.name}</div>
            <div style={{ ...barBg, height:8 }}>
              <div style={pbar(mainGoal.target>0?Math.round((mainGoal.saved/mainGoal.target)*100):0, mainGoal.color)}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:12 }}>
              <span style={{ color:C.muted }}>Jamg'arildi: <span style={{ color:mainGoal.color, fontWeight:700 }}>{fmt(mainGoal.saved)}</span></span>
              <span style={{ color:C.muted }}>Maqsad: <span style={{ color:C.text, fontWeight:700 }}>{fmt(mainGoal.target)}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* AI PROMPT */}
      {!aiAsked && active.length>1 && (
        <div style={{ background:C.pur+"15", border:`1px solid ${C.pur}30`, borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.pur, marginBottom:8 }}>✦ AI: Qaysi maqsad eng muhim?</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {active.map(g=>(
              <button key={g.id} onClick={()=>{ dispatch({type:"SET_MAIN_GOAL",id:g.id}); setAiAsked(true); }}
                style={{ background:state.mainGoalId===g.id?g.color+"20":"#252525", border:`1px solid ${state.mainGoalId===g.id?g.color+"60":C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:g.color, fontSize:16 }}>{g.icon}</span>{g.name}
                </span>
                <span style={{ fontSize:12, color:g.color, fontWeight:700 }}>{fmt(g.target)}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setAiAsked(true)} style={{ background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",marginTop:8 }}>keyinroq →</button>
        </div>
      )}

      {/* ACTIVE GOALS LIST */}
      <div style={{ ...lbl, paddingLeft:2, marginBottom:8, marginTop:4 }}>Faol maqsadlar ({active.length})</div>
      {active.map(g=>{
        const pct = g.target>0?Math.round((g.saved/g.target)*100):0;
        const dl = g.deadline ? daysLeft(g.deadline) : null;
        const isMain = g.id===state.mainGoalId;
        const isEditing = editGoalId===g.id;
        return (
          <div key={g.id} style={{ ...card(isMain?g.color+"40":C.border) }}>
            {/* DISPLAY ROW */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
              <div style={{ width:46,height:46,borderRadius:14,background:g.color+"18",border:`1px solid ${g.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:g.color,flexShrink:0 }}>
                {g.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{g.name}</span>
                  {isMain && <span style={pill(g.color,true)}>asosiy</span>}
                </div>
                {g.deadline && (
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>
                    {dl !== null ? `${dl} kun qoldi · ` : ""}{g.deadline.split("-").reverse().join(".")}
                  </div>
                )}
                <div style={barBg}><div style={pbar(pct,g.color)}/></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:12 }}>
                  <span style={{ color:C.muted }}>{fmt(g.saved)} / {fmt(g.target)}</span>
                  <span style={{ color:g.color, fontWeight:700 }}>{pct}% · {fmt(g.target-g.saved)} qoldi</span>
                </div>
              </div>
              {/* ACTION BUTTONS */}
              <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
                {!isMain && (
                  <button onClick={()=>dispatch({type:"SET_MAIN_GOAL",id:g.id})}
                    style={{ background:g.color+"12",border:`1px solid ${g.color}25`,borderRadius:8,padding:"4px 8px",color:g.color,fontSize:10,cursor:"pointer",whiteSpace:"nowrap" }}>
                    asosiy ↑
                  </button>
                )}
                <button onClick={()=>isEditing ? setEditGoalId(null) : openEdit(g)}
                  style={{ background:"#252525",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",color:C.muted,fontSize:10,cursor:"pointer" }}>
                  {isEditing?"yopish":"✏ tahrir"}
                </button>
                <button onClick={()=>dispatch({type:"UPDATE_GOAL",id:g.id,updates:{done:true}})}
                  style={{ background:C.grn+"12",border:`1px solid ${C.grn}25`,borderRadius:8,padding:"4px 8px",color:C.grn,fontSize:10,cursor:"pointer" }}>
                  ✓ bajarildi
                </button>
                <button onClick={()=>{ if(editGoalId===g.id) setEditGoalId(null); dispatch({type:"DELETE_GOAL",id:g.id}); }}
                  style={{ background:"none",border:`1px solid ${C.red}25`,borderRadius:8,padding:"4px 8px",color:C.red,fontSize:10,cursor:"pointer" }}>
                  🗑 o'chir
                </button>
              </div>
            </div>

            {/* EDIT PANEL */}
            {isEditing && (
              <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ ...lbl, marginBottom:4 }}>Nomi</div>
                    <input value={editFields.name||""} onChange={e=>setEditFields(p=>({...p,name:e.target.value}))}
                      style={inp} placeholder="Maqsad nomi"/>
                  </div>
                  <div>
                    <div style={{ ...lbl, marginBottom:4 }}>Maqsad summa ($)</div>
                    <input value={editFields.target||""} onChange={e=>setEditFields(p=>({...p,target:e.target.value}))}
                      type="number" style={inp}/>
                  </div>
                  <div>
                    <div style={{ ...lbl, marginBottom:4 }}>Jamg'arilgan ($)</div>
                    <input value={editFields.saved||""} onChange={e=>setEditFields(p=>({...p,saved:e.target.value}))}
                      type="number" style={inp}/>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <div style={{ ...lbl, marginBottom:4 }}>Muddat</div>
                    <input value={editFields.deadline||""} onChange={e=>setEditFields(p=>({...p,deadline:e.target.value}))}
                      type="date" style={inp}/>
                  </div>
                </div>

                {/* Icon picker */}
                <div style={{ ...lbl, marginBottom:6 }}>Belgi</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                  {ICONS.map(ic=>(
                    <button key={ic} onClick={()=>setEditFields(p=>({...p,icon:ic}))}
                      style={{ width:34,height:34,background:editFields.icon===ic?g.color+"25":"#252525",border:`1px solid ${editFields.icon===ic?g.color:C.border}`,borderRadius:9,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:editFields.icon===ic?g.color:C.muted }}>
                      {ic}
                    </button>
                  ))}
                </div>

                {/* Color picker */}
                <div style={{ ...lbl, marginBottom:6 }}>Rang</div>
                <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                  {COLORS.map(co=>(
                    <button key={co} onClick={()=>setEditFields(p=>({...p,color:co}))}
                      style={{ width:26,height:26,background:co,border:editFields.color===co?"3px solid white":"2px solid transparent",borderRadius:7,cursor:"pointer" }}/>
                  ))}
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={()=>saveEdit(g.id)} style={{ ...btn(C.grn), padding:"11px 0" }}>Saqlash</button>
                  <button onClick={()=>setEditGoalId(null)} style={{ ...btn(C.red,true), padding:"11px 0" }}>Bekor</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ADD NEW GOAL */}
      {!addOpen ? (
        <button onClick={()=>setAddOpen(true)} style={{ ...btn(C.goldb,true), padding:"11px 0", marginBottom:12 }}>
          + Yangi maqsad qo'shish
        </button>
      ) : (
        <div style={{ ...card(C.goldb+"35"), marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>Yangi maqsad</div>
          {[{l:"Nomi",k:"name",t:"text",ph:"Masalan: Uy sotib olish"},{l:"Maqsad summa ($)",k:"target",t:"number",ph:"0"},{l:"Boshlang'ich ($)",k:"saved",t:"number",ph:"0"}].map(f=>(
            <div key={f.k} style={{ marginBottom:10 }}>
              <div style={{ ...lbl, marginBottom:4 }}>{f.l}</div>
              <input value={newG[f.k]} onChange={e=>setNewG(p=>({...p,[f.k]:e.target.value}))} type={f.t} placeholder={f.ph} style={inp}/>
            </div>
          ))}
          <div style={{ marginBottom:10 }}>
            <div style={{ ...lbl, marginBottom:4 }}>Muddat</div>
            <input value={newG.deadline} onChange={e=>setNewG(p=>({...p,deadline:e.target.value}))} type="date" style={inp}/>
          </div>
          <div style={{ ...lbl, marginBottom:6 }}>Belgi</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {ICONS.map(ic=>(
              <button key={ic} onClick={()=>setNewG(p=>({...p,icon:ic}))}
                style={{ width:34,height:34,background:newG.icon===ic?C.goldb+"25":"#252525",border:`1px solid ${newG.icon===ic?C.goldb:C.border}`,borderRadius:9,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:newG.icon===ic?C.goldb:C.muted }}>
                {ic}
              </button>
            ))}
          </div>
          <div style={{ ...lbl, marginBottom:6 }}>Rang</div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {COLORS.map(co=>(
              <button key={co} onClick={()=>setNewG(p=>({...p,color:co}))}
                style={{ width:26,height:26,background:co,border:newG.color===co?"3px solid white":"2px solid transparent",borderRadius:7,cursor:"pointer" }}/>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>{
              if(!newG.name.trim()||!newG.target) return;
              dispatch({type:"ADD_GOAL",goal:{id:"goal_"+Date.now(),name:newG.name.trim(),icon:newG.icon,color:newG.color,target:parseFloat(newG.target)||0,saved:parseFloat(newG.saved)||0,deadline:newG.deadline,done:false}});
              setNewG({name:"",icon:"◈",color:C.goldb,target:"",saved:"",deadline:""});
              setAddOpen(false);
            }} style={{ ...btn(C.grn), padding:"11px 0" }}>Saqlash</button>
            <button onClick={()=>setAddOpen(false)} style={{ ...btn(C.red,true), padding:"11px 0" }}>Bekor</button>
          </div>
        </div>
      )}

      {/* DONE GOALS */}
      {done.length>0 && (
        <>
          <div style={{ ...lbl, paddingLeft:2, marginBottom:8, marginTop:8 }}>Bajarilgan maqsadlar ({done.length}) 🎉</div>
          {done.map(g=>(
            <div key={g.id} style={{ ...card(C.grn+"30"), display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:40,height:40,borderRadius:12,background:C.grn+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>✓</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.grn }}>{g.name}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{fmt(g.target)} · {g.deadline||"—"}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>dispatch({type:"UPDATE_GOAL",id:g.id,updates:{done:false}})}
                  style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.muted,fontSize:11,cursor:"pointer" }}>
                  qaytarish
                </button>
                <button onClick={()=>dispatch({type:"DELETE_GOAL",id:g.id})}
                  style={{ background:"none",border:`1px solid ${C.red}25`,borderRadius:8,padding:"5px 8px",color:C.red,fontSize:11,cursor:"pointer" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// SP INVEST TRACKER
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// KIRIM & REJA (MERGED)
// ═══════════════════════════════════════════════════════════════════════════

function KirimReja({ state, dispatch }) {
  const [sub, setSub] = useState("kirim");

  // ── Kirimlar state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editNameId, setEditNameId] = useState(null);
  const [nameVal, setNameVal] = useState("");

  // ── Forecast state ──────────────────────────────────────────────────────
  const [open, setOpen] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editFcVal, setEditFcVal] = useState("");

  // ── Shared ──────────────────────────────────────────────────────────────
  const sources = state.incomeSources || [];
  const months = ["mar26","apr26","may26","iyn26","iyl26","avg26","sen26","okt26","noy26","dek26","yan27","fev27"];
  const monthLabels = { mar26:"Mar",apr26:"Apr",may26:"May",iyn26:"Iyn",iyl26:"Iyl",avg26:"Avg",sen26:"Sen",okt26:"Okt",noy26:"Noy",dek26:"Dek",yan27:"Yan'27",fev27:"Fev'27" };
  const monthFull = { mar26:"Mart 2026",apr26:"Aprel 2026",may26:"May 2026",iyn26:"Iyun 2026",iyl26:"Iyul 2026",avg26:"Avgust 2026",sen26:"Sentabr 2026",okt26:"Oktabr 2026",noy26:"Noyabr 2026",dek26:"Dekabr 2026",yan27:"Yanvar 2027",fev27:"Fevral 2027" };
  const getVal = (src, mId) => (src.monthly||{})[mId]||0;
  const monthTotal = (mId) => sources.reduce((s,src)=>s+getVal(src,mId),0);
  const sourceTotal = (src) => months.reduce((s,m)=>s+getVal(src,m),0);
  const grandTotal = months.reduce((s,m)=>s+monthTotal(m),0);
  const curMonthId = state.currentMonth;
  const curMonthInc = monthTotal(curMonthId);
  
  // ── Forecast logic ───────────────────────────────────────────────────────
  const weddingRem = state.wedding.reduce((s,i)=>s+(i.budget-i.paid),0);
  const debtRem = state.creditors.reduce((s,d)=>s+getRemaining(d),0);

  const computeMonthAllocation = (m) => {
    const idx = MONTHS_PLAN.findIndex(x=>x.id===m.id);
    const living = idx<2 ? 1000 : 1450;
    const goals = [];
    if(m.id==="mar26" && weddingRem>0) goals.push({l:"To'y depozit",v:1800,c:"#D4537E",icon:"♡"});
    if(m.id==="apr26" && weddingRem>0) goals.push({l:"To'y (yostiqcha+toyxona)",v:Math.min(weddingRem,13000),c:"#D4537E",icon:"♡"});
    if(m.id==="may26") goals.push({l:"To'y qolgan",v:Math.min(2000,weddingRem),c:"#D4537E",icon:"♡"});
    const debtMap = {may26:1000,iyn26:3000,iyl26:3000,avg26:3000,sen26:3034};
    if(debtMap[m.id]) goals.push({l:"Qarz to'lov",v:debtMap[m.id],c:C.pur,icon:"◎"});
    if(m.id==="avg26") goals.push({l:"Mashina avans",v:5000,c:C.grn,icon:"⊙"});
    if(["okt26","noy26","dek26","yan27","fev27"].includes(m.id)) goals.push({l:"Tejash/Investitsiya",v:3000,c:C.goldb,icon:"◈"});
    return {living, goals, total: living + goals.reduce((s,g)=>s+g.v,0)};
  };

  const getIncTarget = (m) => {
    const override = state.monthPlans[m.id]?.incTarget;
    if(override) return override;
    return computeMonthAllocation(m).total;
  };

  const GOAL_MILESTONES = [
    {id:"toy",    label:"To'y 2026",       target:19000, saved:19000-weddingRem,    date:"May 2026",    c:C.pink},
    {id:"debt",   label:"Qarzdan ozodlik",  target:state.creditors.reduce((s,d)=>s+d.total,0), saved:state.creditors.reduce((s,d)=>s+getPaid(d),0), date:"Sentabr 2026",c:C.pur},
    {id:"car",    label:"Mashina",          target:15000, saved:state.carGoal.saved, date:"Avgust 2026", c:C.grn},
    {id:"emerg",  label:"Zaxira fond",      target:15000, saved:0,                  date:"2027 yil",    c:C.goldb},
    {id:"invest", label:"Investitsiya",     target:10000, saved:0,                  date:"2027 yil",    c:C.pur},
  ];


  return (
    <div style={{ paddingTop:14 }}>
      {/* SUB-TAB BAR */}

    <div style={{ display:"flex", gap:6, padding:"0 14px 12px" }}>
      {[{id:"kirim",label:"💰 Kirimlar"},{id:"reja",label:"📊 Reja"}].map(t=>(
        <button key={t.id} onClick={()=>setSub(t.id)}
          style={{ flex:1, padding:"9px 0", borderRadius:20, border:`1px solid ${sub===t.id?C.goldb:C.border}`,
            background:sub===t.id?C.goldb+"20":"transparent", color:sub===t.id?C.goldb:C.muted,
            fontSize:13, fontWeight:sub===t.id?700:400, cursor:"pointer", fontFamily:"inherit" }}>
          {t.label}
        </button>
      ))}
    </div>
  

      {/* KIRIMLAR VIEW */}
      {sub==="kirim" && (

    <div style={{ padding:"0 14px" }}>

      {/* CURRENT MONTH SUMMARY */}
      <div style={{ ...card(C.goldb+"40") }}>
        <div style={lbl}>{monthFull[curMonthId]||curMonthId} — umumiy kirim</div>
        <div style={{ ...bignum(C.goldb), marginBottom:4 }}>{fmt(curMonthInc)}</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{fmtUZS(curMonthInc*(state.uzsRate||12750))}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {sources.map(src=>(
            <div key={src.id} style={{ background:"#1a1a1a", borderRadius:10, padding:"8px 12px", flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:src.color }}>{fmt(getVal(src,curMonthId))}</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{src.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INCOME SOURCE CARDS */}
      <div style={{ ...lbl, paddingLeft:2, marginBottom:8, marginTop:4 }}>Daromad manbalari</div>
      {sources.map(src=>{
        const isEditingName = editNameId===src.id;
        const srcTotal = sourceTotal(src);
        const srcAvg = Math.round(srcTotal/months.length);
        return (
          <div key={src.id} style={card(src.color+"35")}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                {isEditingName ? (
                  <div style={{ display:"flex", gap:6, flex:1 }}>
                    <input value={nameVal} onChange={e=>setNameVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"){ dispatch({type:"UPDATE_SOURCE_NAME",id:src.id,name:nameVal}); setEditNameId(null); } if(e.key==="Escape") setEditNameId(null); }}
                      autoFocus style={{ ...inp, flex:1, padding:"7px 10px", fontSize:13 }}/>
                    <button onClick={()=>{ dispatch({type:"UPDATE_SOURCE_NAME",id:src.id,name:nameVal}); setEditNameId(null); }}
                      style={{ ...btn(C.grn),width:"auto",padding:"7px 14px",fontSize:12 }}>✓</button>
                    <button onClick={()=>setEditNameId(null)}
                      style={{ ...btn(C.red,true),width:"auto",padding:"7px 10px",fontSize:12 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ width:12,height:12,borderRadius:"50%",background:src.color,flexShrink:0 }}/>
                    <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{src.name}</span>
                    <button onClick={()=>{ setEditNameId(src.id); setNameVal(src.name); }}
                      style={{ background:"none", border:"none", color:C.muted, fontSize:13, cursor:"pointer", padding:"2px 6px" }}>✏</button>
                  </>
                )}
              </div>
              {!isEditingName && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:src.color }}>{fmt(srcAvg)}/oy</div>
                  <div style={{ fontSize:10, color:C.muted }}>o'rtacha</div>
                </div>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5 }}>
              {months.map(mId=>{
                const val = getVal(src,mId);
                const isEd = editing?.sourceId===src.id && editing?.monthId===mId;
                const isCur = mId===curMonthId;
                return (
                  <div key={mId} onClick={()=>{ if(!isEd){setEditing({sourceId:src.id,monthId:mId});setEditVal(String(val));} }}
                    style={{ background:isCur?src.color+"20":isEd?"#2a2a2a":"#1a1a1a", border:`1px solid ${isCur?src.color+"50":isEd?src.color+"40":C.border}`, borderRadius:8, padding:"6px 4px", cursor:"pointer", textAlign:"center", minHeight:42 }}>
                    {isEd ? (
                      <div onClick={e=>e.stopPropagation()}>
                        <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                          onBlur={()=>{ const v=parseFloat(editVal); if(!isNaN(v)&&v>=0) dispatch({type:"UPDATE_INCOME_SOURCE",id:src.id,monthId:mId,value:v}); setEditing(null); }}
                          onKeyDown={e=>{ if(e.key==="Enter"){ const v=parseFloat(editVal); if(!isNaN(v)&&v>=0) dispatch({type:"UPDATE_INCOME_SOURCE",id:src.id,monthId:mId,value:v}); setEditing(null); } if(e.key==="Escape") setEditing(null); }}
                          autoFocus type="number"
                          style={{ width:"100%",background:"transparent",border:"none",outline:"none",color:src.color,fontSize:11,fontWeight:700,textAlign:"center",fontFamily:"inherit" }}/>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:11,fontWeight:700,color:val>0?src.color:C.dim }}>{val>0?("$"+(val>=1000?Math.round(val/1000)+"K":val)):"-"}</div>
                        <div style={{ fontSize:8,color:C.muted,marginTop:1 }}>{monthLabels[mId]}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:12 }}>
              <span style={{ color:C.muted }}>12 oylik jami</span>
              <span style={{ fontWeight:700, color:src.color }}>{fmt(srcTotal)}</span>
            </div>
          </div>
        );
      })}

      {/* SUMMARY TABLE */}
      <div style={card()}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Oylik daromad jadvali</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ textAlign:"left", color:C.muted, fontWeight:600, padding:"4px 6px", borderBottom:`1px solid ${C.border}` }}>Oy</th>
                {sources.map(src=>(
                  <th key={src.id} style={{ textAlign:"right", color:src.color, fontWeight:600, padding:"4px 6px", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>
                    {src.name.split(" ")[0]}
                  </th>
                ))}
                <th style={{ textAlign:"right", color:C.goldb, fontWeight:700, padding:"4px 6px", borderBottom:`1px solid ${C.border}` }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {months.map((mId)=>{
                const total = monthTotal(mId);
                const isCur = mId===curMonthId;
                return (
                  <tr key={mId} style={{ background:isCur?C.goldb+"08":"transparent" }}>
                    <td style={{ padding:"7px 6px", color:isCur?C.goldb:C.muted, fontWeight:isCur?700:400, borderBottom:`1px solid ${C.border}` }}>
                      {monthLabels[mId]}{isCur&&<span style={{ fontSize:8,marginLeft:3,color:C.goldb }}>●</span>}
                    </td>
                    {sources.map(src=>(
                      <td key={src.id} style={{ textAlign:"right",padding:"7px 6px",color:getVal(src,mId)>0?src.color:C.dim,borderBottom:`1px solid ${C.border}` }}>
                        {getVal(src,mId)>0?fmt(getVal(src,mId)):"-"}
                      </td>
                    ))}
                    <td style={{ textAlign:"right",padding:"7px 6px",fontWeight:700,color:total>0?C.goldb:C.dim,borderBottom:`1px solid ${C.border}` }}>
                      {total>0?fmt(total):"-"}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background:"#1a1a1a" }}>
                <td style={{ padding:"8px 6px",color:C.text,fontWeight:700 }}>JAMI</td>
                {sources.map(src=>(
                  <td key={src.id} style={{ textAlign:"right",padding:"8px 6px",fontWeight:700,color:src.color }}>{fmt(sourceTotal(src))}</td>
                ))}
                <td style={{ textAlign:"right",padding:"8px 6px",fontWeight:800,color:C.goldb,fontSize:13 }}>{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:11,color:C.muted,marginTop:8,textAlign:"center" }}>Yacheykani bosib tahrirlang · ● joriy oy</div>
      </div>
    </div>
  
      )}

      {/* REJA VIEW */}
      {sub==="reja" && (

    <div style={{ padding:"0 14px" }}>

      {/* GOAL MILESTONES */}
      <div style={card(C.pur+"40")}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Maqsadlar yo'l xaritasi</div>
        {GOAL_MILESTONES.map((g,i)=>{
          const pct = Math.min(100,Math.round((g.saved/g.target)*100));
          return (
            <div key={g.id} style={{ marginBottom:i<GOAL_MILESTONES.length-1?14:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{g.label}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:C.muted }}>{g.date}</span>
                  <span style={pill(pct>=100?C.grn:g.c,true)}>{pct}%</span>
                </div>
              </div>
              <div style={barBg}><div style={pbar(pct,pct>=100?C.grn:g.c)}/></div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:11, color:C.muted }}>
                <span>{fmt(g.saved)} to'plandi</span>
                <span style={{ color:g.c }}>{fmt(g.target-g.saved)} qoldi</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* INCOME THRESHOLDS */}
      <div style={card()}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Kerakli daromad darajalari</div>
        {[
          {goal:"Faqat yashash",        inc:5001,  note:"Minimal chegara"},
          {goal:"Yashash + qarz",        inc:8000,  note:"Maqsad daraja"},
          {goal:"Hamma narsa 6 oyda",    inc:12922, note:"Optimal"},
          {goal:"Qulay + tejash",         inc:20000, note:"Ideal"},
        ].map((r,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
            <div>
              <div style={{ fontSize:13, color:"#e0e0e0" }}>{r.goal}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{r.note}</div>
            </div>
            <div style={{ background:C.goldb+"15", border:`1px solid ${C.goldb}30`, borderRadius:20, padding:"5px 14px", color:C.goldb, fontSize:14, fontWeight:800 }}>
              {fmt(r.inc)}/oy
            </div>
          </div>
        ))}
      </div>

      {/* MONTH PLAN CARDS */}
      <div style={{ ...lbl, paddingLeft:2, marginBottom:8 }}>Oyma-oy maqsad rejasi</div>
      {MONTHS_PLAN.map((m)=>{
        const isOpen = open===m.id;
        const alloc = computeMonthAllocation(m);
        const effectiveTarget = getIncTarget(m);
        const isCustom = !!state.monthPlans[m.id]?.incTarget;
        const tc = TAG_COLORS[m.special]||C.goldb;
        const monthTxns2 = state.transactions.filter(t=>t.monthId===m.id);
        const actual = monthTxns2.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
        const hasData = actual>0;
        const isEditing = editTarget===m.id;
        const planInc = monthTotal(m.id);

        return (
          <div key={m.id} style={{ ...card(isOpen?tc+"40":C.border), cursor:"pointer" }}>
            <div onClick={()=>!isEditing&&setOpen(isOpen?null:m.id)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{m.label}</span>
                  {m.special!=="save" && m.special!=="scale" && m.special!=="new_year" && (
                    <span style={pill(tc,true)}>
                      {m.special==="vebinar"?"VEBINAR":m.special==="wedding"?"TO'Y":m.special==="debt_free"?"QARZ YO'Q":m.special==="car"?"MASHINA":m.special==="year_end"?"YIL OXIRI":m.special==="wedding_prep"?"TO'Y HAZIRLIK":""}
                    </span>
                  )}
                  {isCustom && <span style={pill(C.goldb,true)}>tahrirlangan</span>}
                  {hasData && <span style={pill(C.grn,true)}>ma'lumot bor</span>}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{state.monthPlans[m.id]?.notes||m.note}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5 }}>
                  {[
                    {v:planInc,  c:C.goldb, l:"REJA KIR"},
                    {v:alloc.living, c:"#3B6D11", l:"YASHASH"},
                    {v:alloc.goals.reduce((s,g)=>s+g.v,0), c:C.red, l:"MAQSAD"},
                    {v:effectiveTarget, c:tc, l:"KERAK"},
                  ].map((x,xi)=>(
                    <div key={xi} style={{ background:"#1a1a1a", borderRadius:8, padding:"7px 4px", textAlign:"center" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:x.c }}>{x.v>0?fmt(x.v):"-"}</div>
                      <div style={{ fontSize:8, color:C.muted, marginTop:2 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginLeft:8, color:C.dim, fontSize:14 }}>{isOpen?"▲":"▼"}</div>
            </div>

            {isOpen && (
              <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#3B6D11", marginBottom:8 }}>YASHASH XARAJATLARI</div>
                {(m.id==="mar26"||m.id==="apr26"
                  ? [{l:"Ijara",v:250},{l:"Ovqat",v:300},{l:"Transport",v:150},{l:"Shaxsiy",v:300}]
                  : [{l:"Ijara",v:500},{l:"Ovqat",v:400},{l:"Transport",v:150},{l:"Kommunal",v:100},{l:"Shaxsiy",v:300}]
                ).map((r,j)=>(
                  <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #1e1e1e" }}>
                    <span style={{ fontSize:12, color:"#aaa" }}>{r.l}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{fmt(r.v)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", marginBottom:14 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#3B6D11" }}>Jami yashash</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#3B6D11" }}>{fmt(alloc.living)}</span>
                </div>

                {alloc.goals.length>0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:C.red, marginBottom:8 }}>MAQSAD TO'LOVLARI</div>
                    {alloc.goals.map((g,j)=>(
                      <div key={j} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1e1e1e" }}>
                        <span style={{ fontSize:13, color:C.text, display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ color:g.c }}>{g.icon}</span>{g.l}
                        </span>
                        <span style={{ fontSize:14, fontWeight:700, color:g.c }}>{fmt(g.v)}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", marginBottom:14 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.red }}>Jami maqsad</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.red }}>{fmt(alloc.goals.reduce((s,g)=>s+g.v,0))}</span>
                    </div>
                  </>
                )}

                <div style={{ background:tc+"10", border:`1px solid ${tc}30`, borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text }}>Bu oyda topish kerak:</span>
                    <span style={{ fontSize:22, fontWeight:900, color:tc }}>{fmt(effectiveTarget)}</span>
                  </div>
                  {hasData && (
                    <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>
                      Haqiqiy: {fmt(actual)} ({actual>=effectiveTarget?"✓ Maqsad bajarildi!":"yetishmaydi: "+fmt(effectiveTarget-actual)})
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input value={editFcVal} onChange={e=>setEditFcVal(e.target.value)} type="number" placeholder="Yangi maqsad ($)"
                      style={{ ...inp, flex:1, width:"auto", padding:"9px 12px" }}/>
                    <button onClick={()=>{ const v=parseFloat(editFcVal); if(!isNaN(v)&&v>0) dispatch({type:"SET_MONTH_TARGET",monthId:m.id,incTarget:v}); setEditTarget(null); }}
                      style={{ ...btn(C.grn),width:"auto",padding:"9px 18px" }}>✓</button>
                    <button onClick={()=>setEditTarget(null)} style={{ ...btn(C.red,true),width:"auto",padding:"9px 12px" }}>✕</button>
                  </div>
                ) : (
                  <button onClick={(e)=>{e.stopPropagation();setEditTarget(m.id);setEditFcVal(String(effectiveTarget));}}
                    style={{ ...btn(C.goldb,true), padding:"9px 0", fontSize:12 }}>
                    Daromad maqsadini tahrirlash →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  
      )}
    </div>
  );
}


function AIChat({ state, dispatch }) {
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:"Salom Ahmadxon!\n\nHozirgi holat:\n• Balans: $"+(state.cardBal+state.cashBal)+"\n• Qarz: $"+Math.round(state.creditors.reduce((s,d)=>s+getRemaining(d),0))+"\n• To'yga: "+daysTill(WEDDING_DATE)+" kun\n\nIstalgan savol bering yoki ilovani boshqaring — masalan: \"balans 5000 so'm\" yoki \"Uzumga $50 to'ladim\"",
    actions: null
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const parseAndExecute = (rawText) => {
    const actionMatch = rawText.match(/<ACTIONS>\s*([\s\S]*?)\s*<\/ACTIONS>/);
    let actions = null;
    let cleanText = rawText.replace(/<ACTIONS>[\s\S]*?<\/ACTIONS>/g, "").trim();
    if (actionMatch) {
      try {
        const parsed = JSON.parse(actionMatch[1].trim());
        actions = Array.isArray(parsed) ? parsed : [parsed];
        actions.forEach(a => {
          try { dispatch(a); } catch(e) { console.warn("Action failed:", a, e); }
        });
      } catch(e) {
        console.warn("Action parse error:", e, actionMatch[1]);
      }
    }
    return { cleanText, actions };
  };

  const send = async(text) => {
    const msg=(text||input).trim(); if(!msg||loading) return;
    setInput("");
    const apiMessages = messages.map(m => ({ role:m.role, content: m.rawContent||m.content }));
    const updated = [...apiMessages, {role:"user", content:msg}];
    setMessages(p=>[...p,{role:"user",content:msg}]);
    setLoading(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:buildSysPrompt(state),messages:updated})
      });
      const data=await res.json();
      const rawText = data.content?.[0]?.text || "Xatolik.";
      const { cleanText, actions } = parseAndExecute(rawText);
      setMessages(p=>[...p,{ role:"assistant", content:cleanText, rawContent:rawText, actions }]);
    } catch(e) {
      setMessages(p=>[...p,{role:"assistant",content:"Ulanishda xatolik. Qayta urinib ko'ring."}]);
    }
    setLoading(false);
  };

  const QS=[
    "Qarzni qachon to'layman?","Balansni ko'rsat",
    "Uzumga $50 to'ladim","Bu oy qancha topishim kerak?",
    "Mashinani qachon olsam?","Net worth nimada?"
  ];

  const ActionBadge = ({actions}) => {
    if(!actions||!actions.length) return null;
    const labels = {
      UPDATE_BALANCES:"Balans yangilandi",
      ADD_TXN:"Tranzaksiya qo'shildi",
      PAY_DEBT:"Qarz to'landi",
      WEDDING_PAY:"To'y xarajat belgilandi",
      UPDATE_SP:"SP Invest yangilandi",
      UPDATE_RATE:"Kurs yangilandi",
    };
    return (
      <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:5 }}>
        {actions.map((a,i)=>(
          <span key={i} style={{ background:C.grn+"15", border:`1px solid ${C.grn}30`, borderRadius:20, padding:"3px 10px", color:C.grn, fontSize:11, fontWeight:600 }}>
            ✓ {labels[a.type]||a.type}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      {/* AI CAPABILITY HINT */}
      <div style={{ padding:"8px 14px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ background:C.goldb+"08", border:`1px solid ${C.goldb}20`, borderRadius:10, padding:"8px 12px", fontSize:11, color:C.muted, lineHeight:1.5 }}>
          <span style={{ color:C.goldb, fontWeight:700 }}>AI ilovani boshqaradi: </span>
          "Balans 413,000 so'm", "Uzumga $50 to'ladim", "Bugun $200 topdim" — AI o'zi yangilaydi
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px" }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:14 }}>
            {m.role==="assistant" && (
              <div style={{ width:32,height:32,borderRadius:10,background:C.goldb+"20",display:"flex",alignItems:"center",justifyContent:"center",color:C.goldb,fontSize:11,fontWeight:800,marginRight:8,flexShrink:0,alignSelf:"flex-end" }}>AI</div>
            )}
            <div style={{ maxWidth:"78%" }}>
              <div style={{ background:m.role==="user"?C.goldb:"#252525", border:m.role==="assistant"?`1px solid ${C.border}`:"none", color:m.role==="user"?"#fff":"#e0e0e0", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"12px 14px", fontSize:14, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                {m.content}
              </div>
              {m.role==="assistant" && <ActionBadge actions={m.actions}/>}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
            <div style={{ width:32,height:32,borderRadius:10,background:C.goldb+"20",display:"flex",alignItems:"center",justifyContent:"center",color:C.goldb,fontSize:11,fontWeight:800 }}>AI</div>
            <div style={{ background:"#252525", border:`1px solid ${C.border}`, borderRadius:"16px 16px 16px 4px", padding:"12px 14px", color:C.goldb, fontSize:14 }}>O'ylanmoqda...</div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      <div style={{ padding:"8px 14px", display:"flex", gap:6, flexWrap:"wrap", borderTop:`1px solid ${C.border}` }}>
        {QS.map((q,i)=>(
          <button key={i} onClick={()=>send(q)} style={{ background:C.goldb+"10", border:`1px solid ${C.goldb}25`, borderRadius:20, padding:"5px 11px", color:C.goldb, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>
        ))}
      </div>

      <div style={{ padding:"10px 14px 16px" }}>
        <div style={{ display:"flex", gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder='Savol yozing yoki buyruq bering...' style={{ flex:1, background:"#252525", border:`1px solid ${C.goldb}35`, borderRadius:12, padding:"12px 14px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit" }}/>
          <button onClick={()=>send()} disabled={loading} style={{ width:48,height:48,background:loading?"#333":C.goldb,border:"none",borderRadius:12,cursor:loading?"not-allowed":"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS / NET WORTH
// ═══════════════════════════════════════════════════════════════════════════
function Settings({ state, dispatch }) {
  const rate = state.uzsRate || 12750;
  const accounts = state.accounts || [];
  const [rateVal, setRateVal] = useState(String(rate));
  const [accEdits, setAccEdits] = useState({});

  const totalDebt = state.creditors.reduce((s,d)=>s+getRemaining(d),0);
  const receivables = state.receivables.reduce((s,r)=>s+r.amount,0);
  const totalUZS = getTotalUZS(state);
  const totalUSD = getTotalUSD(state);
  const netWorthUZS = totalUZS - totalDebt*rate;

  const getEditVal = (id, field) => accEdits[id]?.[field] ?? "";

  const syncUZS = (id, uzs) => {
    const usdVal = Math.round(parseFloat(uzs||"0") / rate * 100) / 100;
    setAccEdits(p=>({...p, [id]:{...p[id], uzs, usd:String(usdVal)}}));
  };
  const syncUSD = (id, usd) => {
    const uzsVal = Math.round(parseFloat(usd||"0") * rate);
    setAccEdits(p=>({...p, [id]:{...p[id], usd, uzs:String(uzsVal)}}));
  };

  const initEdit = (acc) => {
    const isUZS = acc.currency==="UZS";
    setAccEdits(p=>({...p, [acc.id]:{
      uzs: isUZS ? String(acc.balance) : String(Math.round(acc.balance*rate)),
      usd: !isUZS ? String(acc.balance) : String(Math.round(acc.balance/rate*100)/100),
      name: acc.name
    }}));
  };

  const saveAcc = (acc) => {
    const edit = accEdits[acc.id];
    if(!edit) return;
    const bal = acc.currency==="UZS"
      ? parseFloat(edit.uzs)||0
      : parseFloat(edit.usd)||0;
    dispatch({type:"UPDATE_ACCOUNT", id:acc.id, updates:{balance:bal, name:edit.name||acc.name}});
    setAccEdits(p=>{const n={...p}; delete n[acc.id]; return n;});
  };

  return (
    <div style={{ padding:"14px 14px 0" }}>

      {/* NET WORTH */}
      <div style={card(netWorthUZS>=0?C.grn+"40":C.red+"40")}>
        <div style={lbl}>Net Worth (sof boylik)</div>
        <div style={{ fontSize:28, fontWeight:900, color:netWorthUZS>=0?C.grn:C.red, letterSpacing:-1 }}>
          {netWorthUZS>=0?"+":""}{Math.round(Math.abs(netWorthUZS)).toLocaleString("uz-UZ")} so'm
        </div>
        <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
          ≈ {netWorthUZS>=0?"":"-"}${Math.round(Math.abs(netWorthUZS)/rate).toLocaleString()}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
          {[
            {l:"Aktivlar", v:Math.round(totalUZS+receivables*rate), c:C.grn},
            {l:"Majburiyatlar", v:Math.round(totalDebt*rate), c:C.red},
          ].map((x,i)=>(
            <div key={i} style={{ background:"#1a1a1a", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{x.l}</div>
              <div style={{ fontSize:14, fontWeight:700, color:x.c }}>{x.v.toLocaleString("uz-UZ")} so'm</div>
              <div style={{ fontSize:10, color:C.muted }}>${Math.round(x.v/rate).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ACCOUNTS */}
      <div style={{ ...lbl, paddingLeft:2, marginBottom:8 }}>Hisoblar</div>
      {accounts.map(acc=>{
        const isEditing = !!accEdits[acc.id];
        const edit = accEdits[acc.id];
        const dispUZS = acc.currency==="UZS" ? acc.balance : Math.round(acc.balance*rate);
        const dispUSD = acc.currency==="USD" ? acc.balance : Math.round(acc.balance/rate*100)/100;

        return (
          <div key={acc.id} style={card(acc.color+"30")}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:isEditing?12:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>{acc.icon}</span>
                <div>
                  {isEditing ? (
                    <input value={edit.name||acc.name} onChange={e=>setAccEdits(p=>({...p,[acc.id]:{...p[acc.id],name:e.target.value}}))}
                      style={{ ...inp, padding:"5px 8px", fontSize:13, width:120 }}/>
                  ) : (
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{acc.name}</div>
                  )}
                  <div style={{ fontSize:10, color:acc.color, marginTop:1 }}>{acc.currency}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {!isEditing && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>
                      {acc.currency==="UZS" ? dispUZS.toLocaleString("uz-UZ")+" so'm" : "$"+dispUSD.toLocaleString()}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>
                      {acc.currency==="UZS" ? "≈ $"+dispUSD.toLocaleString() : "≈ "+dispUZS.toLocaleString("uz-UZ")+" so'm"}
                    </div>
                  </div>
                )}
                <button onClick={()=>isEditing?saveAcc(acc):initEdit(acc)}
                  style={{ background:isEditing?C.grn+"20":"#252525", border:`1px solid ${isEditing?C.grn:C.border}`, borderRadius:8, padding:"5px 10px", color:isEditing?C.grn:C.muted, fontSize:11, cursor:"pointer" }}>
                  {isEditing?"✓ Saqlash":"✏"}
                </button>
                {isEditing && <button onClick={()=>setAccEdits(p=>{const n={...p};delete n[acc.id];return n;})}
                  style={{ background:"none", border:`1px solid ${C.red}30`, borderRadius:8, padding:"5px 8px", color:C.red, fontSize:11, cursor:"pointer" }}>✕</button>}
              </div>
            </div>

            {isEditing && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <div style={{ fontSize:10, color:"#5DCAA5", marginBottom:4 }}>so'm (UZS)</div>
                  <input value={edit.uzs||""} onChange={e=>syncUZS(acc.id,e.target.value)}
                    type="number" style={{ ...inp, borderColor:"#5DCAA520" }}/>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.goldb, marginBottom:4 }}>$ Dollar (USD)</div>
                  <input value={edit.usd||""} onChange={e=>syncUSD(acc.id,e.target.value)}
                    type="number" style={inp}/>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* RATE */}
      <div style={card()}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>USD/UZS kurs</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>$1 = ? so'm</div>
            <input value={rateVal} onChange={e=>setRateVal(e.target.value)} type="number" style={inp}/>
          </div>
          <button onClick={()=>dispatch({type:"UPDATE_RATE",rate:parseFloat(rateVal)||12750})}
            style={{ ...btn(C.pur,true), padding:"11px 18px", width:"auto" }}>Yangilash</button>
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>Bugungi bozor: ~12,750–13,000 so'm/$1</div>
      </div>

      {/* MONTH SELECT */}
      <div style={card()}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Joriy oy</div>
        <select value={state.currentMonth} onChange={e=>dispatch({type:"SET_MONTH",id:e.target.value})} style={inp}>
          {MONTHS_PLAN.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      <button onClick={()=>dispatch({type:"RESET"})} style={{ ...btn(C.red,true), padding:"12px 0", marginBottom:20 }}>
        Ma'lumotlarni tozalash
      </button>
    </div>
  );
}




// ═══════════════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════════════
function reducer(state, action) {
  let next;
  switch(action.type) {
    case "ADD_TXN": {
      const txn = action.txn;
      const rate = state.uzsRate || 12750;
      // Normalize amounts — new modal sends amountUZS + amount(USD)
      const usdAmt = txn.amount || (txn.amountUZS ? txn.amountUZS/rate : 0);
      const uzsAmt = txn.amountUZS || Math.round(usdAmt * rate);
      // Update correct account — accId (new) or accountId (legacy)
      const targetAccId = txn.accId || txn.accountId;
      const updAccounts = (state.accounts||[]).map(a => {
        if(a.id !== targetAccId) return a;
        const delta = txn.type==="income" ? (a.currency==="UZS" ? uzsAmt : usdAmt) : -(a.currency==="UZS" ? uzsAmt : usdAmt);
        return { ...a, balance: Math.max(0, a.balance + delta) };
      });
      // Also update legacy cardBal/cashBal for other tabs
      const balUpdate = txn.type==="income"
        ? { cardBal: state.cardBal + (txn.via==="card"?usdAmt:0), cashBal: state.cashBal + (txn.via==="cash"?usdAmt:0) }
        : { cardBal: state.cardBal - (txn.via==="card"?usdAmt:0), cashBal: state.cashBal - (txn.via==="cash"?usdAmt:0) };
      next = { ...state, ...balUpdate, accounts: updAccounts,
        transactions:[...state.transactions, {...txn, amount:usdAmt, amountUZS:uzsAmt}] };
      break;
    }
    case "PAY_DEBT": {
      const payDate2 = new Date().toLocaleDateString("uz");
      const newPmt = {id:"pay_"+Date.now(), date:payDate2, amount:action.amount, method:action.method||"card", note:action.note||""};
      const deductBal = action.updateBalance !== false; // only deduct if explicitly true (new payment from UI)
      next = { ...state,
        creditors: state.creditors.map(d=>d.id===action.id ? {...d, payments:[...(d.payments||[]), newPmt]} : d),
        cardBal: deductBal && action.method!=="cash" ? state.cardBal - action.amount : state.cardBal,
        cashBal: deductBal && action.method==="cash"  ? state.cashBal - action.amount : state.cashBal,
        transactions: deductBal ? [...state.transactions, { type:"expense", amount:action.amount, cat:"Qarz to'lov", note:(state.creditors.find(d=>d.id===action.id)?.name||"")+" ga to'lov", via:action.method||"card", date:payDate2, monthId:state.currentMonth }] : state.transactions
      };
      break;
    }
    case "ADD_CREDITOR": {
      const normName = (s) => s.trim().toLowerCase();
      const dupe2 = state.creditors.find(d=>normName(d.name)===normName(action.creditor.name)&&d.cat===action.creditor.cat);
      if(dupe2) { next = {...state, debtError:"Dublikat: "+dupe2.name}; break; }
      next = { ...state, creditors:[...state.creditors, {...action.creditor, payments:[]}], debtError:null };
      break;
    }
    case "UPDATE_CREDITOR":
      next = { ...state, creditors: state.creditors.map(d=>d.id===action.id ? {...d, ...action.updates} : d) };
      break;
    case "DELETE_PAYMENT":
      next = { ...state, creditors: state.creditors.map(d=>d.id===action.creditorId ? {...d, payments:(d.payments||[]).filter(p=>p.id!==action.payId)} : d) };
      break;
    case "EDIT_PAYMENT":
      next = { ...state, creditors: state.creditors.map(d=>d.id===action.creditorId ? {...d, payments:(d.payments||[]).map(p=>p.id===action.payId ? {...p, amount:action.amount, note:action.note} : p)} : d) };
      break;
    case "ADD_DEBT_FLOW":
      next = { ...state, debtFlows: [...(state.debtFlows||[]), action.flow] };
      break;
    case "REMOVE_DEBT_FLOW":
      next = { ...state, debtFlows: (state.debtFlows||[]).filter(d=>d.id!==action.id) };
      break;
    case "UPDATE_RECEIVABLE":
      next = { ...state, receivables: state.receivables.map(r=>r.id===action.id ? {...r, amount:action.amount, total:action.total, paid:action.paid, note:action.note} : r) };
      break;
    case "RECEIVE_DEBT": {
      next = { ...state,
        receivables: state.receivables.map(r=>r.id===action.id ? {...r, amount:Math.max(0,r.amount-action.amount), paid:(r.paid||0)+action.amount} : r),
        cashBal: state.cashBal + action.amount,
        transactions: [...state.transactions, { type:"income", amount:action.amount, cat:"Boshqa daromad", note:state.receivables.find(r=>r.id===action.id)?.name+" qaytardi", via:"cash", date:new Date().toLocaleDateString("uz"), monthId:state.currentMonth }]
      };
      break;
    }
    case "WEDDING_PAY":
      next = { ...state, wedding: state.wedding.map(i=>i.id===action.id ? {...i, paid:Math.min(i.budget, action.amount)} : i) };
      break;
    case "WEDDING_RESET":
      next = { ...state, wedding: state.wedding.map(i=>i.id===action.id ? {...i, paid:0} : i) };
      break;
    case "UPDATE_SP":
      next = { ...state, spInvest: { ...state.spInvest, students:action.students, avgPrice:action.avgPrice } };
      break;
    case "UPDATE_BALANCES":
      next = { ...state, cardBal:action.cardBal, cashBal:action.cashBal, carGoal:{...state.carGoal, saved:action.carSaved} };
      break;
    case "UPDATE_RATE":
      next = { ...state, uzsRate:action.rate };
      break;
    case "SET_MONTH":
      next = { ...state, currentMonth:action.id };
      break;
    case "SET_MONTH_TARGET":
      next = { ...state, monthPlans: { ...state.monthPlans, [action.monthId]: { ...(state.monthPlans[action.monthId]||{}), incTarget:action.incTarget } } };
      break;
    case "SET_MONTH_NOTES":
      next = { ...state, monthPlans: { ...state.monthPlans, [action.monthId]: { ...(state.monthPlans[action.monthId]||{}), notes:action.notes } } };
      break;
    case "OPEN_ADD_INCOME":
      next = { ...state, modal:"income" };
      break;
    case "OPEN_ADD_EXP":
      next = { ...state, modal:"expense" };
      break;
    case "CLOSE_MODAL":
      next = { ...state, modal:null };
      break;
    case "UPDATE_ACCOUNT":
      next = { ...state, accounts: (state.accounts||[]).map(a=>a.id===action.id ? {...a, ...action.updates} : a) };
      break;
    case "UPDATE_ACCOUNT_BAL":
      next = { ...state, accounts: (state.accounts||[]).map(a=>a.id===action.id ? {...a, balance:action.balance} : a) };
      // keep cardBal/cashBal synced for backward compat
      const kartaAcc = (next.accounts||[]).find(a=>a.id==="karta_uzs");
      const naqdAcc  = (next.accounts||[]).find(a=>a.id==="naqd_uzs");
      const visaAcc  = (next.accounts||[]).find(a=>a.id==="visa_usd");
      if(kartaAcc) next = {...next, cardBal: Math.round(kartaAcc.balance / (next.uzsRate||12750) * 100)/100};
      if(naqdAcc)  next = {...next, cashBal: Math.round(naqdAcc.balance  / (next.uzsRate||12750) * 100)/100};
      break;
    case "ADD_ACCOUNT":
      next = { ...state, accounts: [...(state.accounts||[]), action.account] };
      break;
    case "REMOVE_ACCOUNT":
      next = { ...state, accounts: (state.accounts||[]).filter(a=>a.id!==action.id) };
      break;
    case "ADD_GOAL":
      next = { ...state, userGoals: [...(state.userGoals||[]), action.goal] };
      break;
    case "UPDATE_GOAL":
      next = { ...state, userGoals: (state.userGoals||[]).map(g=>g.id===action.id ? {...g, ...action.updates} : g) };
      break;
    case "DELETE_GOAL":
      next = { ...state, userGoals: (state.userGoals||[]).filter(g=>g.id!==action.id) };
      break;
    case "SET_MAIN_GOAL":
      next = { ...state, mainGoalId: action.id };
      break;
    case "UPDATE_INCOME_SOURCE":
      next = { ...state, incomeSources: (state.incomeSources||[]).map(s=>s.id===action.id ? {...s, monthly:{...s.monthly,[action.monthId]:action.value}} : s) };
      break;
    case "UPDATE_SOURCE_NAME":
      next = { ...state, incomeSources: (state.incomeSources||[]).map(s=>s.id===action.id ? {...s, name:action.name} : s) };
      break;
    case "RESET":
      next = { ...getInitState(), modal:null };
      break;
    default:
      return state;
  }
  try { localStorage.setItem("finOS_v15", JSON.stringify({...next, modal:undefined})); } catch {}
  return next;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS & APP ROOT
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"home",     label:"Asosiy",    icon:"⊞" },
  { id:"debts",    label:"Qarzlar",   icon:"◎" },
  { id:"goals",    label:"Maqsadlar", icon:"♡" },
  { id:"kirimreja",label:"Moliya",    icon:"◈" },
  { id:"ai",       label:"AI",        icon:"✦" },
  { id:"settings", label:"Sozlama",   icon:"⚙" },
];

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        onAuth(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
        if (error) throw error;
        setMsg("Email yuborildi! Tasdiqlang va qayta kiring.");
        setMode("login");
      }
    } catch(e) {
      setErr(e.message || "Xato yuz berdi");
    }
    setLoading(false);
  };

  return (
    <div style={{ background:C.dark, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", padding:24 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>💰</div>
          <div style={{ fontSize:24, fontWeight:800, color:C.goldb, letterSpacing:-1 }}>Finance OS</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Shaxsiy moliya boshqaruv tizimi</div>
        </div>

        <div style={{ ...card(), padding:24 }}>
          {/* Mode toggle */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:24 }}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");setMsg("");}}
                style={{ ...btn(C.goldb, mode!==m), padding:"10px 0", fontSize:13 }}>
                {m==="login" ? "Kirish" : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>

          {mode==="register" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ ...lbl, marginBottom:6 }}>Ismingiz</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ahmadxon" style={inp}/>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <div style={{ ...lbl, marginBottom:6 }}>Email</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@gmail.com"
              type="email" style={inp} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ ...lbl, marginBottom:6 }}>Parol</div>
            <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
              type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>

          {err && <div style={{ background:C.red+"20", border:`1px solid ${C.red}40`, borderRadius:8, padding:"10px 12px", color:C.red, fontSize:12, marginBottom:14 }}>{err}</div>}
          {msg && <div style={{ background:C.grn+"20", border:`1px solid ${C.grn}40`, borderRadius:8, padding:"10px 12px", color:C.grn, fontSize:12, marginBottom:14 }}>{msg}</div>}

          <button onClick={submit} disabled={loading}
            style={{ ...btn(C.goldb), padding:"13px 0", fontSize:15, fontWeight:700, opacity:loading?0.6:1 }}>
            {loading ? "⏳ Kuting..." : mode==="login" ? "Kirish →" : "Ro'yxatdan o'tish →"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [st, setSt] = useState(() => getInitState());

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load user data from Supabase on login
  useEffect(() => {
    if (!user) return;
    supabase.from("user_data").select("data").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.data) setSt({ ...getInitState(), ...data.data });
      });
  }, [user]);

  // Save to Supabase (debounced 1.5s)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(async () => {
      setSyncing(true);
      await supabase.from("user_data").upsert({ user_id: user.id, data: st, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      setSyncing(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [st, user]);

  const disp = useCallback((action) => {
    setSt(prev => reducer(prev, action));
  }, []);

  const daysLeft = daysTill(WEDDING_DATE);

  if (authLoading) return (
    <div style={{ background:C.dark, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontFamily:"system-ui,sans-serif" }}>
      Yuklanmoqda...
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser}/>;

  if (!st) return null;

  return (
    <div style={{ background:C.dark, minHeight:"100vh", color:C.text, fontFamily:"system-ui,sans-serif", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10, background:C.dark }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 14px", borderBottom:`1px solid ${C.border}`, fontSize:10 }}>
          <span style={{ color:C.muted, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {syncing && <span style={{ color:C.goldb }}>⟳</span>}
            <span style={{ color:C.goldb, fontWeight:700 }}>Finance OS</span>
            <button onClick={()=>supabase.auth.signOut()} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, color:C.muted, cursor:"pointer", fontSize:10, fontFamily:"inherit", padding:"2px 7px" }}>Chiqish</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:1.4, textTransform:"uppercase" }}>Finance OS</div>
          <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:1 }}>Ahmadxon</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ fontSize:12, color:C.muted }}>{fmt(st.cardBal+st.cashBal)}</div>
          <div style={{ background:C.goldb+"15", border:`1px solid ${C.goldb}40`, borderRadius:20, padding:"5px 12px", display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:C.grn }}/>
            <span style={{ color:C.goldb, fontSize:11, fontWeight:700 }}>JONLI</span>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:80 }}>
        {tab==="home"     && <Dashboard state={st} dispatch={disp}/>}
        {tab==="debts"    && <Debts state={st} dispatch={disp}/>}
        {tab==="goals"    && <Goals state={st} dispatch={disp}/>}
        {tab==="kirimreja" && <KirimReja state={st} dispatch={disp}/>}
        {tab==="ai"       && <AIChat state={st} dispatch={disp}/>}
        {tab==="settings" && <Settings state={st} dispatch={disp}/>}
      </div>

      {st.modal && (
        <AddTxn type={st.modal} state={st}
          onSave={(txn)=>disp({type:"ADD_TXN", txn})}
          onClose={()=>disp({type:"CLOSE_MODAL"})}
        />
      )}

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.dark, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"6px 0 10px", zIndex:100, overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"5px 8px", fontFamily:"inherit", position:"relative", flexShrink:0 }}>
            {tab===t.id && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:C.goldb, borderRadius:"0 0 3px 3px" }}/>}
            <span style={{ fontSize:15, color:tab===t.id?C.goldb:C.dim }}>{t.icon}</span>
            <span style={{ fontSize:9, color:tab===t.id?C.goldb:C.dim, fontWeight:tab===t.id?700:400, whiteSpace:"nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
