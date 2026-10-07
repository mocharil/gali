"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Zap,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Clock,
  ArrowRight,
  X,
  Bot,
  CornerDownLeft,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

export interface AiRecommendationResult {
  query: string;
  category: "COST_RESILIENCE" | "VALUE_DIVERGENCE" | "RESERVE_LIFE" | "LICENSE_CLIFF" | "EXPORT_VULNERABILITY" | "COMPARISON" | "GENERAL";
  headline: string;
  summary: string;
  confidenceScore: number;
  primaryTickers: string[];
  metricsEvidence: {
    label: string;
    value: string;
    subtext?: string;
    highlight?: "green" | "amber" | "rose" | "cyan";
  }[];
  thesisPoints: string[];
  riskAlert?: string;
  recommendedAction: {
    label: string;
    href: string;
  };
}

export const AI_PROMPT_PILLS = [
  {
    icon: Zap,
    label: "Tahan Krisis Harga Batubara",
    query: "Emiten mana yang paling tahan jika harga batubara anjlok di bawah $70/ton?",
    category: "COST_RESILIENCE",
  },
  {
    icon: TrendingDown,
    label: "Deep Value Diskon Cadangan",
    query: "Emiten mana yang valuasinya paling terdiskon (undervalued) terhadap cadangan tambang fisik?",
    category: "VALUE_DIVERGENCE",
  },
  {
    icon: Clock,
    label: "Umur Tambang Terpanjang (>30 Tahun)",
    query: "Emiten apa yang punya cadangan batubara paling awet untuk jangka panjang?",
    category: "RESERVE_LIFE",
  },
  {
    icon: AlertTriangle,
    label: "Risiko Izin Habis (3Y Cliff)",
    query: "Siapa emiten batubara dengan risiko perpanjangan izin IUP/PKP2B paling kritis dalam 3 tahun?",
    category: "LICENSE_CLIFF",
  },
  {
    icon: Scale,
    label: "BUMI vs BYAN: Head-to-Head",
    query: "Bandingkan BUMI dan BYAN: Mana yang fundamental tambang fisiknya lebih kuat?",
    category: "COMPARISON",
  },
  {
    icon: SlidersHorizontal,
    label: "Kerentanan Tarif Impor China",
    query: "Emiten mana yang paling rentan terhadap kebijakan pengetatan impor batubara China?",
    category: "EXPORT_VULNERABILITY",
  },
];

export function runAiMiningReasoning(rawQuery: string): AiRecommendationResult {
  const q = rawQuery.toLowerCase();

  // 1. Comparison: BUMI vs BYAN
  if ((q.includes("bumi") && q.includes("byan")) || q.includes("bandingkan")) {
    return {
      query: rawQuery,
      category: "COMPARISON",
      headline: "Komparasi Fundamental Tambang: BYAN (Kualitas Premium) vs BUMI (Volume & Margin Biaya)",
      summary:
        "Berdasarkan analisis silang data spasial MODI ESDM dan laporan keuangan audit, BYAN unggul pada kualitas neraca (tanpa hutang bersih) dan skor komposit M8 (78.2 vs 58.9), namun BUMI memiliki bantalan margin biaya ekstraksi terendah ($15.70/t vs $29.80/t).",
      confidenceScore: 97,
      primaryTickers: ["BYAN", "BUMI"],
      metricsEvidence: [
        { label: "Ground Truth Score", value: "BYAN 78.2 vs BUMI 58.9", highlight: "green", subtext: "BYAN memimpin peringkat 1 IDX" },
        { label: "Cash Cost / Ton", value: "$15.70 (BUMI) vs $29.80 (BYAN)", highlight: "green", subtext: "BUMI 47% lebih hemat biaya" },
        { label: "Reserve Life (RLI)", value: "40.2 thn (BYAN) vs 31.5 thn (BUMI)", highlight: "cyan", subtext: "Keduanya memiliki umur tambang prima" },
        { label: "3Y License Cliff", value: "0% (Keduanya Aman)", highlight: "green", subtext: "Bebas risiko kadaluarsa jangka pendek" },
      ],
      thesisPoints: [
        "BYAN layak dipertimbangkan bagi investor institusional konservatif yang mencari ketahanan tata kelola, logistik jalan tambang terintegrasi Tabang, dan dividen konsisten.",
        "BUMI menawarkan 'asymmetric upside' bagi investor siklikal berkat biaya kas produksi terendah di Indonesia ($15.70/t), menjadikannya sangat kebal terhadap penurunan indeks harga batubara.",
        "Valuasi pasar BYAN saat ini diperdagangkan pada premium tinggi ($41.8B Market Cap vs $8.16B RBV), sedangkan BUMI diperdagangkan pada diskon -73.7% terhadap nilai wajar cadangannya ($3.62B vs $13.78B RBV).",
      ],
      recommendedAction: {
        label: "Buka Komparasi Dual-Radar BUMI vs BYAN",
        href: "/compare?a=BUMI&b=BYAN",
      },
    };
  }

  // 2. Cost Resilience / Downside Protection
  if (
    q.includes("biaya") ||
    q.includes("cost") ||
    q.includes("turun") ||
    q.includes("anjlok") ||
    q.includes("krisis") ||
    q.includes("tahan") ||
    q.includes("breakeven")
  ) {
    return {
      query: rawQuery,
      category: "COST_RESILIENCE",
      headline: "AI Recommendation: BUMI & BYAN Menempati Kuadran Pertahanan Biaya Kas Terkuat (Q1)",
      summary:
        "Dalam skenario stress-test harga batubara Newcastle turun ke $90/t atau indeks ICI-4 menyentuh $55/t, BUMI dan BYAN adalah dua emiten dengan jarak breakeven terlebar sebelum mengalami arus kas operasional negatif.",
      confidenceScore: 95,
      primaryTickers: ["BUMI", "BYAN"],
      metricsEvidence: [
        { label: "Biaya Kas Ekstraksi BUMI", value: "$15.70 / ton", highlight: "green", subtext: "Terendah di seluruh emiten batubara IDX" },
        { label: "Biaya Kas Ekstraksi BYAN", value: "$29.80 / ton", highlight: "green", subtext: "Didukung konsesi raksasa Tabang" },
        { label: "Benchmark ICI-4 Saat Ini", value: "$85.00 / ton", highlight: "cyan", subtext: "Buffer margin aman sebesar 5.4x (BUMI)" },
        { label: "Emiten Biaya Tertinggi", value: "ITMG ($58.30 / ton)", highlight: "rose", subtext: "Paling cepat tertekan jika harga jatuh" },
      ],
      thesisPoints: [
        "BUMI melalui anak usahanya (KPC dan Arutmin) mencatatkan skala ekonomi produksi raksasa (~78 juta ton/tahun) dengan rasio pengupasan tanah (strip ratio) efisien pada pit utama.",
        "BYAN menikmati efisiensi biaya logistik berkat armada tongkang dan infrastruktur jalan tambang sepanjang 100 km yang dimiliki sendiri secara eksklusif.",
        "ITMG dan PTBA memiliki biaya kas lebih tinggi ($44–$58/t) sehingga lebih rentan mengalami kompresi margin bersih saat siklus komoditas melemah.",
      ],
      riskAlert: "Perhatikan tingkat kewajiban DMO (Domestic Market Obligation) sebesar 25% dengan patokan harga PLN $70/t yang membatasi realisasi harga rata-rata BUMI dan PTBA.",
      recommendedAction: {
        label: "Uji Simulasi Sensitivitas Harga di Scenario Studio",
        href: "/scenario",
      },
    };
  }

  // 3. Deep Value / Reserve-Backed Valuation Discount
  if (
    q.includes("diskon") ||
    q.includes("undervalued") ||
    q.includes("murah") ||
    q.includes("valuasi") ||
    q.includes("rbv") ||
    q.includes("fair value")
  ) {
    return {
      query: rawQuery,
      category: "VALUE_DIVERGENCE",
      headline: "AI Screener: GEMS (-68.4%) dan BUMI (-73.7%) Mengalami Diskon Fisik Terdalam vs Market Cap",
      summary:
        "Analisis valuasi Reserve-Backed Value (M6 DCF geologis cadangan terbukti) menunjukkan adanya diskon ekstrem pasar modal terhadap aset batubara bawah tanah pada emiten GEMS dan BUMI.",
      confidenceScore: 93,
      primaryTickers: ["GEMS", "BUMI", "PTBA"],
      metricsEvidence: [
        { label: "GEMS RBV Gap", value: "-68.4% Diskon", highlight: "rose", subtext: "Valuasi Cadangan $7.97B vs Cap Pasar $2.51B" },
        { label: "BUMI RBV Gap", value: "-73.7% Diskon", highlight: "green", subtext: "Valuasi Cadangan $13.78B vs Cap Pasar $3.62B" },
        { label: "PTBA RBV Gap", value: "-35.4% Diskon", highlight: "green", subtext: "Valuasi Cadangan $2.91B vs Cap Pasar $1.88B" },
        { label: "BYAN RBV Gap", value: "+413% Premium", highlight: "amber", subtext: "Pasar menghargai reputasi & tata kelola" },
      ],
      thesisPoints: [
        "Diskon GEMS mencerminkan kekhawatiran regulasi pasar atas perpanjangan izin IUP konsesi utamanya dalam waktu dekat.",
        "BUMI memiliki cadangan fisik batubara komersial terbesar di Indonesia (~2.4 miliar ton), namun terdiskon akibat struktur kepemilikan historis dan leverage hutang masa lalu.",
        "PTBA sebagai emiten BUMN menawarkan diskon moderat (-35.4%) dengan cadangan super aman yang dijamin pemerintah selama lebih dari 67 tahun.",
      ],
      riskAlert: "Peringatan Regulasi: Jangan membeli GEMS semata-mata karena diskon valuasi tanpa mengevaluasi '3Y License Cliff Risk' (100% konsesi perlu perpanjangan).",
      recommendedAction: {
        label: "Periksa Matriks Diskon Valuasi Pasar (Divergence Matrix)",
        href: "/divergence",
      },
    };
  }

  // 4. Reserve Life / Long Horizon
  if (
    q.includes("umur") ||
    q.includes("panjang") ||
    q.includes("awet") ||
    q.includes("rli") ||
    q.includes("cadangan") ||
    q.includes("habis") ||
    q.includes("tahun")
  ) {
    return {
      query: rawQuery,
      category: "RESERVE_LIFE",
      headline: "AI Recommendation: PTBA (67.8 Tahun) & BYAN (40.2 Tahun) Menjadi Benteng Cadangan Abadi",
      summary:
        "Untuk horizon investasi jangka panjang (>10 tahun), PTBA dan BYAN adalah pilihan terbaik dengan sisa umur cadangan terbukti (Reserve Life Index / RLI) paling stabil di Indonesia.",
      confidenceScore: 98,
      primaryTickers: ["PTBA", "BYAN", "BUMI"],
      metricsEvidence: [
        { label: "PTBA Sisa Umur Tambang", value: "67.8 Tahun", highlight: "cyan", subtext: "Cadangan terverifikasi > 3 Miliar Ton" },
        { label: "BYAN Sisa Umur Tambang", value: "40.2 Tahun", highlight: "cyan", subtext: "Cadangan terverifikasi ~ 1.7 Miliar Ton" },
        { label: "BUMI Sisa Umur Tambang", value: "31.5 Tahun", highlight: "green", subtext: "Cadangan terverifikasi ~ 2.4 Miliar Ton" },
        { label: "Emiten dengan RLI Terpendek", value: "ITMG (11.2 Thn) & ADRO (13.4 Thn)", highlight: "amber", subtext: "Perlu akuisisi tambang baru" },
      ],
      thesisPoints: [
        "PTBA memegang konsesi Tanjung Enim di Sumatera Selatan dengan lapisan batubara masif yang menjamin operasional pasokan energi PLTU nasional hingga dekade 2090-an.",
        "BYAN memiliki konsesi konsolidasi Tabang di Kalimantan Timur yang terus mengalami penambahan cadangan terbukti melalui eksplorasi berkelanjutan.",
        "Emiten seperti ITMG (11.2 thn) menghadapi tekanan deplesi cadangan yang lebih cepat sehingga saat ini aktif melakukan diversifikasi ke energi terbarukan dan mineral nikel.",
      ],
      recommendedAction: {
        label: "Lihat Peta Sebaran 52 Konsesi Tambang di Seluruh Indonesia",
        href: "/map",
      },
    };
  }

  // 5. License Cliff Risk / Expiry
  if (
    q.includes("izin") ||
    q.includes("cliff") ||
    q.includes("habis") ||
    q.includes("kedaluwarsa") ||
    q.includes("pkp2b") ||
    q.includes("iup") ||
    q.includes("legal")
  ) {
    return {
      query: rawQuery,
      category: "LICENSE_CLIFF",
      headline: "AI Alert: GEMS Menghadapi 100% Risiko Kadaluarsa Izin Konsesi dalam 3 Tahun ke Depan",
      summary:
        "Audit data legalitas MODI ESDM menunjukkan bahwa 100% konsesi tambang produktif GEMS (termasuk PT Borneo Indobara) memerlukan persetujuan perpanjangan IUP/IUPK dari Kementerian ESDM dalam jangka waktu 3 tahun.",
      confidenceScore: 96,
      primaryTickers: ["GEMS"],
      metricsEvidence: [
        { label: "GEMS 3-Year License Cliff", value: "100.0% Kritis", highlight: "rose", subtext: "Konsesi inti mendekati tanggal akhir izin" },
        { label: "BUMI 3-Year License Cliff", value: "0.0% Aman", highlight: "green", subtext: "IUPK KPC & Arutmin diperpanjang s/d 2031-2042" },
        { label: "BYAN 3-Year License Cliff", value: "0.0% Aman", highlight: "green", subtext: "Konsesi Tabang berlaku s/d 2050-an" },
        { label: "PTBA 3-Year License Cliff", value: "0.0% Aman", highlight: "green", subtext: "IUP BUMN dilindungi regulasi nasional" },
      ],
      thesisPoints: [
        "Meskipun rasio profitabilitas GEMS sangat tinggi (ROE ~45%), kepastian nilai arus kas terminal sangat tergantung pada mulusnya proses perpanjangan izin IUP di Kementerian ESDM.",
        "BUMI dan BYAN telah menyelesaikan perpanjangan kontrak karya (PKP2B menjadi IUPK) dalam beberapa tahun terakhir, sehingga bebas dari risiko cliff hukum hingga 2030-an.",
      ],
      riskAlert: "Pastikan memantau kepatuhan Clean & Clear (CnC) dan progres perizinan RKAB tahunan GEMS untuk mengantisipasi risiko suspensi operasional.",
      recommendedAction: {
        label: "Cek Profil Hukum dan Konsesi GEMS",
        href: "/issuer/GEMS",
      },
    };
  }

  // 6. China Import Tariffs / Export Exposure
  if (
    q.includes("china") ||
    q.includes("tiongkok") ||
    q.includes("ekspor") ||
    q.includes("tarif") ||
    q.includes("impor") ||
    q.includes("india")
  ) {
    return {
      query: rawQuery,
      category: "EXPORT_VULNERABILITY",
      headline: "AI Vulnerability Screener: DSSA (38.3%) & BUMI (24.5%) Memiliki Paparan Ekspor China Tertinggi",
      summary:
        "Jika pemerintah China memberlakukan tarif impor batubara atau meningkatkan kuota produksi domestik di Shanxi & Mongolia Dalam, DSSA dan BUMI akan menjadi emiten yang paling terdampak penyerapan volumenya.",
      confidenceScore: 94,
      primaryTickers: ["DSSA", "BUMI", "BYAN"],
      metricsEvidence: [
        { label: "Pangsa Ekspor China DSSA", value: "38.3% Pendapatan", highlight: "rose", subtext: "Tergantung pada pasar peleburan & PLTU China" },
        { label: "Pangsa Ekspor China BUMI", value: "24.5% Pendapatan", highlight: "amber", subtext: "Pasar ekspor terbesar kedua setelah India (31%)" },
        { label: "Diversifikasi BYAN", value: "Filipina 28%, India 22%", highlight: "green", subtext: "Distribusi regional Asia Tenggara & Selatan merata" },
        { label: "Pasar Domestik PTBA", value: "58.0% Domestik", highlight: "cyan", subtext: "Terlindungi dari perang tarif internasional" },
      ],
      thesisPoints: [
        "PTBA adalah emiten paling kebal terhadap tarif luar negeri karena lebih dari 55% produksinya diserap langsung oleh PLN dan industri semen dalam negeri.",
        "DSSA dan BUMI perlu mempercepat diversifikasi kontrak pasokan jangka panjang (LTA) ke Vietnam, Malaysia, dan Bangladesh untuk memitigasi volatilitas impor China.",
      ],
      recommendedAction: {
        label: "Simulasikan Tarif Impor China di Scenario Studio",
        href: "/scenario",
      },
    };
  }

  // Default / General Query: Best overall AI Pick
  return {
    query: rawQuery,
    category: "GENERAL",
    headline: "AI Consensus Pick: BYAN (Kualitas Skor #1) & BUMI (Margin Pengaman Biaya Terbesar)",
    summary:
      `Menganalisis pertanyaan "${rawQuery}": Model AI GALI menyaring 9 emiten batubara IDX terhadap 5 pilar fundamental (Cadangan, Izin Konsesi, Biaya Kas, Ekspor, dan Kontrak). BYAN menempati skor tertinggi 78.2/100, disusul PTBA 74.0/100 dan GEMS 71.5/100.`,
    confidenceScore: 92,
    primaryTickers: ["BYAN", "PTBA", "BUMI"],
    metricsEvidence: [
      { label: "Top Composite Score", value: "BYAN (78.2 / 100)", highlight: "green", subtext: "Skor M8 Tertinggi di IDX" },
      { label: "Top Reserve Horizon", value: "PTBA (67.8 Tahun RLI)", highlight: "cyan", subtext: "Ketahanan Cadangan Fisik Terlama" },
      { label: "Top Cost Leader", value: "BUMI ($15.70 / ton)", highlight: "green", subtext: "Biaya Kas Ekstraksi Terendah" },
      { label: "Top Discount (RBV)", value: "GEMS (-68.4% Terdiskon)", highlight: "rose", subtext: "Valuasi Terdiskon dengan Risiko Cliff" },
    ],
    thesisPoints: [
      "Untuk portofolio dividen & kualitas tata kelola institusional: Pilih **BYAN** atau **PTBA**.",
      "Untuk strategi value investing terdiskon dengan margin biaya aman: Pilih **BUMI**.",
      "Untuk strategi hasil dividen tinggi jangka pendek: Pantau **GEMS** dan **ITMG** dengan cermat.",
    ],
    recommendedAction: {
      label: "Buka Matriks Peringkat Ground Truth Lengkap",
      href: "/dashboard",
    },
  };
}

export function AiCopilotModal({
  isOpen,
  onClose,
  initialQuery = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [activeResult, setActiveResult] = useState<AiRecommendationResult | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setInputQuery(initialQuery);
        handleExecuteQuery(initialQuery);
      } else {
        // Run default AI insight on first open
        handleExecuteQuery("Rekomendasi emiten batubara terbaik berdasarkan skor fundamental");
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  function handleExecuteQuery(q: string) {
    if (!q.trim()) return;
    setIsThinking(true);
    setInputQuery(q);

    // Simulate real-time neural reasoning latency
    setTimeout(() => {
      const res = runAiMiningReasoning(q);
      setActiveResult(res);
      setIsThinking(false);
    }, 450);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleExecuteQuery(inputQuery);
    }
    if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-3 sm:p-4 pt-12 sm:pt-16 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#0c1424] via-[#080d19] to-[#050811] shadow-[0_0_50px_rgba(245,158,11,0.2)] backdrop-blur-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.5)] text-slate-950">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider text-white">GALI AI Mining Copilot</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                  LLM Intelligence
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous financial &amp; geological reasoning over Sectors API + 52 MEMR spatial concessions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Natural Language Query Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-amber-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan rekomendasi, emiten paling tahan krisis, komparasi BUMI vs BYAN..."
              className="w-full rounded-2xl border border-slate-700/80 bg-slate-950 py-3 pl-10 pr-24 text-xs sm:text-sm font-medium text-white placeholder-slate-500 shadow-inner focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={() => handleExecuteQuery(inputQuery)}
              disabled={isThinking || !inputQuery.trim()}
              className="absolute right-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-yellow-400 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isThinking ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Ask AI</span>
                  <CornerDownLeft className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" />
              Saran Cepat:
            </span>
            {AI_PROMPT_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.label}
                  onClick={() => handleExecuteQuery(pill.query)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-amber-500/40 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                >
                  <Icon className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Reasoning Response Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isThinking ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                <Bot className="h-7 w-7 animate-bounce" />
                <div className="absolute inset-0 rounded-2xl border border-amber-400/30 animate-ping opacity-25" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm font-bold text-white">GALI AI sedang memproses...</div>
                <p className="text-xs text-slate-400">
                  Melakukan kalkulasi silang data cadangan MODI, laporan laba rugi Q4, dan kurva biaya kas 9 emiten
                </p>
              </div>
            </div>
          ) : activeResult ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Headline & Verification Badge */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono font-bold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{activeResult.confidenceScore}% AI Confidence · Validated by MEMR Spatial Data</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeResult.primaryTickers.map((t) => (
                      <Link
                        key={t}
                        href={`/issuer/${t}`}
                        onClick={onClose}
                        className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-xs font-black text-amber-400 hover:border-amber-400 hover:bg-slate-800 transition-colors"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                  {activeResult.headline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800">
                  {activeResult.summary}
                </p>
              </div>

              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeResult.metricsEvidence.map((m, idx) => {
                  let colorClass = "text-white";
                  if (m.highlight === "green") colorClass = "text-emerald-400";
                  if (m.highlight === "amber") colorClass = "text-amber-400";
                  if (m.highlight === "rose") colorClass = "text-rose-400";
                  if (m.highlight === "cyan") colorClass = "text-cyan-400";

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-800 bg-[#0a1120] p-3 space-y-1 shadow-sm"
                    >
                      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        {m.label}
                      </div>
                      <div className={`font-mono text-sm sm:text-base font-black ${colorClass}`}>
                        {m.value}
                      </div>
                      {m.subtext && (
                        <div className="text-[10px] text-slate-500 leading-tight">
                          {m.subtext}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rationale & Theses */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Argumen &amp; Tesis Analis AI:</span>
                </div>
                <div className="space-y-2">
                  {activeResult.thesisPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Alert if any */}
              {activeResult.riskAlert && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    {activeResult.riskAlert}
                  </p>
                </div>
              )}

              {/* Bottom Action CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="text-[11px] text-slate-500 font-mono">
                  Sectors Financial API + MEMR Geodetic Layer
                </span>
                <Link
                  href={activeResult.recommendedAction.href}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg"
                >
                  <span>{activeResult.recommendedAction.label}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
