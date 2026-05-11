"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Tab = "dashboard" | "log" | "oracle" | "settings" | "admin";

const HAND_UNITS = {
  fist: { label: "拳頭", grams: 150, desc: "碳水（飯/麵/地瓜）" },
  palm: { label: "掌心", grams: 100, desc: "蛋白質（肉/魚/豆腐）" },
  cupped: { label: "雙手捧", grams: 100, desc: "蔬菜（青菜/沙拉）" },
  thumb: { label: "拇指", grams: 15, desc: "油脂（堅果/醬料）" },
  fingertip: { label: "指尖", grams: 5, desc: "糖/鹽/抹醬" },
} as const;

type HandUnitKey = keyof typeof HAND_UNITS;

type AnalyzedItem = {
  name: string;
  confidence: number;
  kind: "carb" | "protein" | "veg" | "fat" | "drink" | "unknown";
  notes?: string;
};

type PortionItem = AnalyzedItem & {
  unit: HandUnitKey;
  multiplier: number;
  grams: number;
};

const COIN_OPTIONS = ["50", "10", "5", "1"] as const;

type Coin = (typeof COIN_OPTIONS)[number];

function defaultUnitForKind(kind: AnalyzedItem["kind"]): HandUnitKey {
  if (kind === "carb") return "fist";
  if (kind === "protein") return "palm";
  if (kind === "veg") return "cupped";
  if (kind === "fat") return "thumb";
  if (kind === "drink") return "fist";
  return "fist";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const Icons = {
  User: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Utensils: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  Zap: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Trophy: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  Lock: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Camera: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  Target: (p: any) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((j) => setProfile(j.profile || null));
  }, [session?.access_token]);

  const isAdmin = useMemo(() => {
    const adminEmail = "fc781117@gmail.com";
    return (session?.user?.email || "").toLowerCase() === adminEmail || profile?.role === "admin";
  }, [session?.user?.email, profile?.role]);

  if (!session) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold text-yellow-300">需要登入</h2>
          <p className="mt-2 text-sm text-slate-200">請先用 Google 登入。</p>
          <Link
            className="mt-4 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-900 hover:bg-yellow-300"
            href="/app/login"
          >
            前往登入
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-yellow-500/10 bg-[#0f172a]/80 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.3em] text-yellow-400">HERACLES</div>
            <div className="text-sm text-slate-200">
              {profile?.nickname || session.user?.email}
              {profile?.role === "vip" ? " · VIP" : ""}
              {isAdmin ? " · ADMIN" : ""}
            </div>
          </div>
          <button
            onClick={() => supabaseBrowser.auth.signOut()}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            登出
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {tab === "dashboard" && <Dashboard accessToken={session.access_token} profile={profile} />}
        {tab === "log" && <MealLog accessToken={session.access_token} userId={session.user.id} />}
        {tab === "oracle" && <Oracle accessToken={session.access_token} />}
        {tab === "settings" && <Settings accessToken={session.access_token} profile={profile} />}
        {tab === "admin" && isAdmin && <AdminPanel accessToken={session.access_token} />}
        {tab === "admin" && !isAdmin && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm">你不是管理員。</div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-yellow-500/10 bg-[#0f172a]/90 backdrop-blur pb-safe">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          <TabBtn label="概況" icon={Icons.User} active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <TabBtn label="紀錄" icon={Icons.Utensils} active={tab === "log"} onClick={() => setTab("log")} />
          <TabBtn label="拉霸" icon={Icons.Zap} active={tab === "oracle"} onClick={() => setTab("oracle")} />
          <TabBtn label="設定" icon={Icons.Trophy} active={tab === "settings"} onClick={() => setTab("settings")} />
          <TabBtn label="後台" icon={Icons.Lock} active={tab === "admin"} onClick={() => setTab("admin")} />
        </div>
      </nav>
    </main>
  );
}

function TabBtn({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full px-2 py-2 text-[10px] font-bold ${active ? "text-yellow-300" : "text-slate-400 hover:text-slate-200"}`}>
      <div className="mx-auto mb-1 w-5 h-5">
        <Icon width={20} height={20} />
      </div>
      <div className={active ? "opacity-100" : "opacity-60"}>{label}</div>
    </button>
  );
}

/* =====================
   Dashboard (hero + stats + tasks)
===================== */
function Dashboard({ accessToken, profile }: { accessToken: string; profile: any }) {
  const [summary, setSummary] = useState<any>(null);
  const [aiOut, setAiOut] = useState<string>("");

  const stepsTarget = Number(profile?.steps_target || 8000);

  useEffect(() => {
    fetch("/api/summary/today", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then(setSummary);
  }, [accessToken]);

  const tasks = useMemo(() => {
    const mc = summary?.mealCounts || {};
    const steps = Number(summary?.steps || 0);

    return [
      { key: "breakfast", title: "紀錄早餐", done: (mc.breakfast || 0) > 0, reward: 10 },
      { key: "lunch", title: "紀錄午餐", done: (mc.lunch || 0) > 0, reward: 10 },
      { key: "dinner", title: "紀錄晚餐", done: (mc.dinner || 0) > 0, reward: 10 },
      { key: "snack", title: "紀錄加餐", done: (mc.snack || 0) > 0, reward: 10 },
      { key: "steps", title: `步數達標 ${stepsTarget}`, done: steps >= stepsTarget, reward: 30 },
    ];
  }, [summary?.mealCounts, summary?.steps, stepsTarget]);

  const doneCount = tasks.filter((t) => t.done).length;

  async function runAI(kind: "daily" | "weekly") {
    setAiOut("生成中…");
    const r = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ kind }),
    });
    const j = await r.json();
    setAiOut(j.text || JSON.stringify(j));
  }

  async function downloadPDF() {
    const r = await fetch("/api/report/weekly", { headers: { Authorization: `Bearer ${accessToken}` } });
    const j = await r.json();

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Heracles Weekly Report", 10, 14);
    doc.setFontSize(10);
    doc.text(JSON.stringify(j, null, 2).slice(0, 3500), 10, 22);
    doc.save(`heracles_weekly_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="glass-panel rounded-2xl overflow-hidden border border-yellow-500/15">
        <div className="relative h-44">
          <img
            src="https://images.unsplash.com/photo-1544365558-35aa4afcf11f?q=80&w=1200&auto=format&fit=crop"
            alt="warrior"
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent" />
          <div className="absolute bottom-3 left-4">
            <div className="text-yellow-300 font-serif text-xl">今日戰況</div>
            <div className="text-xs text-slate-200">今日金幣：{summary?.coinsToday ?? 0} 🪙</div>
          </div>
          <div className="absolute bottom-3 right-4 rounded-full bg-slate-900/60 px-3 py-1 text-xs border border-yellow-500/20">
            任務 {doneCount}/{tasks.length}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4">
          <StatCard title="熱量" value={`${summary?.kcal ?? 0}`} sub="kcal" />
          <StatCard title="蛋白" value={`${summary?.protein ?? 0}`} sub="g" />
          <StatCard title="步數" value={`${summary?.steps ?? 0}`} sub="steps" />
        </div>
      </div>

      {/* Tasks list inspired by your prototypes */}
      <div className="space-y-2">
        <div className="text-xs tracking-[0.3em] text-yellow-400 font-serif">DAILY LABORS</div>
        {tasks.map((t) => (
          <div
            key={t.key}
            className={`flex items-center justify-between rounded-xl border p-3 ${
              t.done ? "bg-yellow-400/10 border-yellow-500/25" : "bg-slate-900/30 border-slate-700/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded flex items-center justify-center text-xs font-black ${
                  t.done ? "bg-yellow-400 text-slate-900" : "border border-slate-600 text-transparent"
                }`}
              >
                ✓
              </div>
              <div className={`text-sm ${t.done ? "text-yellow-200 line-through" : "text-slate-100"}`}>{t.title}</div>
            </div>
            <div className="text-xs text-yellow-300">+{t.reward} 🪙</div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">AI 輕量建議（按了才呼叫）</div>
        <p className="mt-1 text-xs text-slate-300">只在你按按鈕時才呼叫 OpenAI，避免成本失控。</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => runAI("daily")}
            className="flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300"
          >
            今日 3 點建議
          </button>
          <button
            onClick={() => runAI("weekly")}
            className="flex-1 rounded-xl border border-yellow-500/30 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-slate-800"
          >
            本週神話報告
          </button>
        </div>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-xs text-slate-200">
          {aiOut || "尚未生成"}
        </pre>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">PDF 週報</div>
        <p className="mt-1 text-xs text-slate-300">一鍵下載本週趨勢（可作為你提到的報告輸出）。</p>
        <button
          onClick={downloadPDF}
          className="mt-3 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
        >
          下載 PDF
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
      <div className="text-[10px] font-bold tracking-widest text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-50">{value}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}

/* =====================
   Meal Log (photo + coin scale + portions + USDA)
===================== */
function MealLog({ accessToken, userId }: { accessToken: string; userId: string }) {
  const [coin, setCoin] = useState<Coin | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [coinPx, setCoinPx] = useState<number>(0);
  const [coinSlider, setCoinSlider] = useState<number>(180); // visual calibration helper

  const [uploading, setUploading] = useState(false);
  const [analyzed, setAnalyzed] = useState<{ parsed: { items: AnalyzedItem[]; meal_guess: string } } | null>(null);
  const [imagePath, setImagePath] = useState<string>("");
  const [portionItems, setPortionItems] = useState<PortionItem[]>([]);
  const [saveResult, setSaveResult] = useState<any>(null);

  // When analysis arrives, initialize portion controls
  useEffect(() => {
    if (!analyzed?.parsed?.items?.length) return;
    const items: PortionItem[] = analyzed.parsed.items.map((it) => {
      const unit = defaultUnitForKind(it.kind);
      const multiplier = 1;
      const grams = HAND_UNITS[unit].grams * multiplier;
      return { ...it, unit, multiplier, grams };
    });
    setPortionItems(items);
  }, [analyzed]);

  async function analyze() {
    if (!file || !coin) return alert("硬幣面額與照片都是必填（你要求強制）");

    // coinPx can be derived from slider (simple, no drag): user adjusts circle to match coin
    const derivedPx = coinPx > 0 ? coinPx : coinSlider;
    if (!derivedPx || derivedPx < 20) return alert("請校正硬幣直徑（px）。可用滑桿對齊硬幣後再送出。");

    setUploading(true);

    // Upload to Supabase Storage (own folder)
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseBrowser.storage.from("meal-images").upload(path, file, {
      upsert: false,
      contentType: file.type,
    });

    if (upErr) {
      setUploading(false);
      return alert(`上傳失敗：${upErr.message}`);
    }

    const { data: signed, error: signErr } = await supabaseBrowser.storage.from("meal-images").createSignedUrl(path, 60 * 10);

    if (signErr || !signed?.signedUrl) {
      setUploading(false);
      return alert(`取得簽名連結失敗：${signErr?.message || "unknown"}`);
    }

    const r = await fetch("/api/openai/analyze-meal", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ imageUrl: signed.signedUrl }),
    });

    const j = await r.json();
    if (!r.ok) {
      setUploading(false);
      return alert(`AI 辨識失敗：${JSON.stringify(j).slice(0, 400)}`);
    }

    setImagePath(path);
    setAnalyzed(j);
    setCoinPx(derivedPx);
    setUploading(false);
  }

  function updatePortion(idx: number, patch: Partial<PortionItem>) {
    setPortionItems((prev) => {
      const next = [...prev];
      const cur = next[idx];
      const unit = (patch.unit || cur.unit) as HandUnitKey;
      const multiplier = patch.multiplier !== undefined ? patch.multiplier : cur.multiplier;
      const grams = Math.round(HAND_UNITS[unit].grams * multiplier);
      next[idx] = { ...cur, ...patch, unit, multiplier, grams };
      return next;
    });
  }

  const totalsPreview = useMemo(() => {
    const grams = portionItems.reduce((s, x) => s + (Number(x.grams) || 0), 0);
    return { grams };
  }, [portionItems]);

  async function saveLog() {
    if (!analyzed?.parsed?.items?.length) return alert("尚未辨識");
    if (!imagePath) return alert("缺少 imagePath");

    const payload = {
      coin,
      coinPx,
      image_path: imagePath,
      meal_type: analyzed.parsed.meal_guess || "unknown",
      items: portionItems.map((x) => ({
        name: x.name,
        confidence: x.confidence,
        kind: x.kind,
        unit: x.unit,
        multiplier: x.multiplier,
        grams: x.grams,
      })),
    };

    const r = await fetch("/api/meals/create", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });

    const j = await r.json();
    if (!j.ok) return alert(`儲存失敗：${j.error}`);
    setSaveResult(j);
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-yellow-200">飲食獻祭（拍照＋硬幣比例尺）</div>
            <div className="mt-1 text-xs text-slate-300">
              你指定硬幣強制：請將硬幣平放在食物旁，不要用紙鈔。
            </div>
          </div>
          <div className="text-yellow-300">
            <Icons.Camera width={22} height={22} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {COIN_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCoin(c)}
              className={`rounded-xl px-2 py-2 text-sm font-bold ${
                coin === c ? "bg-yellow-400 text-slate-900" : "border border-slate-700 text-slate-200"
              }`}
            >
              {c} 元
            </button>
          ))}
        </div>

        <div className="mt-3">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setAnalyzed(null);
              setSaveResult(null);
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
          />
          <div className="mt-2 text-xs text-slate-400">拍照提示：硬幣平放、避免反光、食物與硬幣都要清楚。</div>
        </div>

        {/* Simple calibration helper (slider circle) */}
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
          <div className="text-xs font-bold text-slate-200">硬幣直徑校正（px）</div>
          <div className="mt-1 text-xs text-slate-400">
            v1 先用「滑桿對齊硬幣大小」的方式（不用量尺、也不用拖曳）。你也可以直接輸入 px。
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={60}
              max={360}
              step={2}
              value={coinSlider}
              onChange={(e) => setCoinSlider(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="w-16 text-right text-xs text-slate-200 font-bold">{coinSlider}px</div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={coinPx || ""}
              onChange={(e) => setCoinPx(parseInt(e.target.value || "0", 10))}
              placeholder="可手動輸入"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-sm"
            />
            <button
              onClick={() => setCoinPx(coinSlider)}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-700"
            >
              用滑桿值
            </button>
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={uploading}
          className="mt-4 w-full rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
        >
          {uploading ? "上傳/辨識中…" : "開始辨識"}
        </button>
      </div>

      {/* Analysis results + portion UI */}
      {analyzed && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-yellow-200">辨識結果與估重</div>
            <div className="text-xs text-slate-300">餐別：{analyzed.parsed.meal_guess}</div>
          </div>

          <div className="mt-3 space-y-3">
            {portionItems.map((it, idx) => (
              <div key={`${it.name}-${idx}`} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{it.name}</div>
                    <div className="text-[10px] text-slate-400">confidence {Math.round((it.confidence || 0) * 100)}% · {it.kind}</div>
                  </div>
                  <div className="text-xs text-yellow-300">{it.grams}g</div>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  {(Object.keys(HAND_UNITS) as HandUnitKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => updatePortion(idx, { unit: k })}
                      className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold border ${
                        it.unit === k ? "bg-yellow-400 text-slate-900 border-yellow-400" : "border-slate-600 text-slate-200"
                      }`}
                    >
                      {HAND_UNITS[k].label}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div>{HAND_UNITS[it.unit].desc}</div>
                    <div>x {it.multiplier.toFixed(1)}</div>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.5}
                    value={it.multiplier}
                    onChange={(e) => updatePortion(idx, { multiplier: parseFloat(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-200">
              <div className="font-bold text-slate-100">總份量預估</div>
              <div className="mt-1">總重量：約 {totalsPreview.grams} g（USDA 以每 100g 推算）</div>
            </div>

            <button
              onClick={saveLog}
              className="w-full rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300"
            >
              儲存飲食紀錄（自動查 USDA）
            </button>

            {saveResult && (
              <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-3 text-xs">
                <div className="font-bold text-green-300">已儲存 ✅</div>
                <div className="mt-1 text-slate-200">總熱量：約 {saveResult.totals?.kcal} kcal</div>
                <div className="mt-1 text-slate-200">蛋白 {saveResult.totals?.protein?.toFixed?.(1)} g · 碳水 {saveResult.totals?.carbs?.toFixed?.(1)} g · 脂肪 {saveResult.totals?.fat?.toFixed?.(1)} g</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================
   Oracle (WhatToEat slot)
===================== */
function Oracle({ accessToken }: { accessToken: string }) {
  const [mode, setMode] = useState<"gps" | "store" | "home">("gps");
  const [status, setStatus] = useState<string>("");
  const [places, setPlaces] = useState<any[]>([]);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [slots, setSlots] = useState({
    cuisine: { val: "點擊開始", locked: false },
    shop: { val: "今日建議", locked: false },
    meal: { val: "神諭", locked: false },
  });
  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null);

  async function loadNearby() {
    setStatus("定位中…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLoc({ lat, lng });
        setStatus("搜尋附近餐廳…");
        const r = await fetch("/api/places/nearby", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ lat, lng, radius: 1200 }),
        });
        const j = await r.json();
        if (!r.ok) {
          setStatus(`搜尋失敗：${JSON.stringify(j).slice(0, 200)}`);
          return;
        }
        setPlaces(j.places || []);
        setStatus("");
      },
      () => setStatus("定位失敗（請允許定位權限）")
    );
  }

  function cuisineOfPlace(p: any): string {
    const name = String(p?.displayName?.text || p?.name || "");
    const lower = name.toLowerCase();
    if (/[牛肉麵|麵線|魯肉|滷肉|便當|小吃|熱炒]/.test(name)) return "台式";
    if (/[拉麵|壽司|丼|居酒屋]/.test(name)) return "日式";
    if (/[韓|炸雞|部隊鍋]/.test(name)) return "韓式";
    if (/[火鍋|鍋]/.test(name)) return "火鍋";
    if (/[burger|漢堡|麥當勞|肯德基|速食]/i.test(name)) return "速食";
    if (/[cafe|咖啡|茶]/i.test(lower)) return "咖啡/飲料";
    return "綜合";
  }

  function pickMealForCuisine(cuisine: string) {
    const map: Record<string, string[]> = {
      台式: ["便當（菜多肉少）", "滷肉飯＋燙青菜", "雞肉飯＋無糖茶"],
      日式: ["烤魚定食", "親子丼（少醬）", "壽司（搭味噌湯）"],
      韓式: ["石鍋拌飯（少醬）", "韓式烤肉（加菜）", "豆腐鍋"],
      火鍋: ["蔬菜＋瘦肉＋少加工丸", "湯底清淡版", "主食半份"],
      速食: ["烤雞腿堡（不加醬）", "沙拉＋雞胸", "無糖飲"],
      "咖啡/飲料": ["美式咖啡", "無糖茶", "拿鐵（少糖）"],
      綜合: ["高蛋白主餐", "少油少炸", "蔬菜補足"],
    };
    const arr = map[cuisine] || map["綜合"];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function spin() {
    setSpinning(true);
    setReviews(null);

    const maxTicks = 18;
    let tick = 0;

    const interval = setInterval(() => {
      tick++;

      setSlots((prev) => {
        const next = { ...prev };

        if (!prev.cuisine.locked) {
          const cands = mode === "gps" && places.length ? Array.from(new Set(places.map(cuisineOfPlace))) : ["台式", "日式", "韓式", "火鍋", "速食", "咖啡/飲料", "綜合"];
          next.cuisine.val = cands[Math.floor(Math.random() * cands.length)];
        }

        if (!prev.shop.locked) {
          if (mode === "gps" && places.length) {
            const cuisine = String(next.cuisine.val);
            const filtered = places.filter((p) => cuisineOfPlace(p) === cuisine) || places;
            const chosen = filtered[Math.floor(Math.random() * filtered.length)] || places[Math.floor(Math.random() * places.length)];
            next.shop.val = chosen?.displayName?.text || chosen?.name || "餐廳";
          } else if (mode === "store") {
            const stores = ["7-11", "全家", "萊爾富", "OK"];
            next.shop.val = stores[Math.floor(Math.random() * stores.length)];
          } else {
            const home = ["自助餐", "自炊", "便當店"]; 
            next.shop.val = home[Math.floor(Math.random() * home.length)];
          }
        }

        if (!prev.meal.locked) {
          next.meal.val = pickMealForCuisine(String(next.cuisine.val));
        }

        return next;
      });

      if (tick >= maxTicks) {
        clearInterval(interval);
        setSpinning(false);

        // set pick for gps mode
        if (mode === "gps" && places.length) {
          const cuisine = String(slots.cuisine.val);
          const filtered = places.filter((p) => cuisineOfPlace(p) === cuisine) || places;
          const chosen = filtered[Math.floor(Math.random() * filtered.length)] || places[Math.floor(Math.random() * places.length)];
          setPick(chosen);
        } else {
          setPick(null);
        }
      }
    }, 80);
  }

  function toggleLock(key: keyof typeof slots) {
    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], locked: !prev[key].locked } }));
  }

  async function loadReviews() {
    if (!pick?.id) return;
    const r = await fetch("/api/places/reviews", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ placeId: pick.id, languageCode: "zh-TW" }),
    });
    const j = await r.json();
    setReviews(j);
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-center">
          <div className="text-yellow-300 font-serif text-xl tracking-[0.3em]">DELPHI ORACLE</div>
          <div className="mx-auto mt-2 h-[2px] w-14 bg-yellow-400/60" />
          <div className="mt-2 text-xs text-slate-400">今天吃什麼 · 拉霸決策</div>
        </div>

        <div className="mt-4 flex justify-center rounded-xl border border-slate-700 bg-slate-900/30 p-1">
          {(["gps", "store", "home"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                mode === m ? "bg-yellow-400 text-slate-900" : "text-slate-300 hover:text-white"
              }`}
            >
              {m === "gps" ? "在地覓食" : m === "store" ? "超商補給" : "自煮/自助"}
            </button>
          ))}
        </div>

        {mode === "gps" && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={loadNearby}
              className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
            >
              取得附近餐廳
            </button>
            <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
              候選：{places.length}
            </div>
          </div>
        )}
        {status && <div className="mt-2 text-xs text-slate-300">{status}</div>}

        <div className="mt-4 rounded-2xl border-2 border-yellow-500/40 bg-slate-900/40 p-4">
          <div className="grid grid-cols-3 gap-3">
            {([
              ["cuisine", "菜系"],
              ["shop", "店家"],
              ["meal", "餐點"],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex flex-col items-center">
                <div className="w-full rounded-xl bg-white text-slate-900 p-3 text-center font-bold min-h-[92px] flex items-center justify-center">
                  {slots[k].val}
                </div>
                <button
                  onClick={() => toggleLock(k)}
                  className={`mt-2 rounded-full border p-2 ${slots[k].locked ? "bg-red-700/80 border-red-700 text-white" : "border-slate-600 text-slate-300"}`}
                  title="鎖定/解除"
                >
                  <Icons.Lock width={18} height={18} />
                </button>
                <div className="mt-1 text-[10px] text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={spin}
            disabled={spinning || (mode === "gps" && !places.length)}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-3 py-3 text-base font-black text-slate-900 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-50"
          >
            {spinning ? "解讀中…" : "啟動命運 (SPIN)"}
          </button>

          {mode === "gps" && pick && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
              <div className="text-sm font-bold text-slate-100">{pick.displayName?.text || pick.name}</div>
              <div className="mt-1 text-xs text-slate-400">{pick.formattedAddress || ""}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={loadReviews}
                  className="flex-1 rounded-xl border border-yellow-500/30 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-slate-800"
                >
                  看評論（最多 5）
                </button>
                <button
                  onClick={() => setSlots({ cuisine: slots.cuisine, shop: { ...slots.shop, locked: false }, meal: { ...slots.meal, locked: false } })}
                  className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
                >
                  解鎖店/餐
                </button>
              </div>
              {reviews && (
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-xs">
                  {JSON.stringify(reviews, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================
   Settings (nickname + steps + weight + edit request)
===================== */
function Settings({ accessToken, profile }: { accessToken: string; profile: any }) {
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [steps, setSteps] = useState<string>("");
  const [weight, setWeight] = useState<string>("");

  // edit request form
  const [reqTable, setReqTable] = useState<"meal_logs" | "step_logs" | "profiles">("profiles");
  const [reqId, setReqId] = useState<string>(profile?.id || "");
  const [reqPatch, setReqPatch] = useState<string>("{\n  \"weight_kg\": 70\n}");
  const [reqReason, setReqReason] = useState<string>("");

  async function saveNickname() {
    const r = await fetch("/api/me/update", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ nickname }),
    });
    const j = await r.json();
    alert(j.ok ? "已更新" : `失敗：${j.error}`);
  }

  async function saveSteps() {
    const n = Number(steps);
    const r = await fetch("/api/steps/upsert", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ date: isoDate(), steps: n }),
    });
    const j = await r.json();
    alert(j.ok ? "已更新今日步數" : `失敗：${j.error}`);
  }

  async function saveWeight() {
    const n = Number(weight);
    const r = await fetch("/api/body-metrics/upsert", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ date: isoDate(), weight_kg: n }),
    });
    const j = await r.json();
    alert(j.ok ? "已更新今日體重" : `失敗：${j.error}`);
  }

  async function createEditRequest() {
    let patchObj: any = null;
    try {
      patchObj = JSON.parse(reqPatch);
    } catch {
      return alert("Patch JSON 格式錯誤");
    }

    const r = await fetch("/api/edit-requests/create", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ target_table: reqTable, target_id: reqId || null, patch: patchObj, reason: reqReason }),
    });
    const j = await r.json();
    alert(j.ok ? "已送出申請（待管理員審核）" : `失敗：${j.error}`);
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">個人資料</div>
        <label className="mt-3 block text-xs font-bold text-slate-200">暱稱</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
        />
        <button
          onClick={saveNickname}
          className="mt-3 w-full rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300"
        >
          儲存暱稱
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">健康資料（Web 版先手動）</div>
        <p className="mt-1 text-xs text-slate-300">Web 無法直接同步 HealthKit/Health Connect；先用手動輸入或匯入檔案（後續再升級）。</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-200">今日步數</label>
            <input value={steps} onChange={(e) => setSteps(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm" placeholder="例如 8000" />
            <button onClick={saveSteps} className="mt-2 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">更新步數</button>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-200">今日體重 (kg)</label>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm" placeholder="例如 70.2" />
            <button onClick={saveWeight} className="mt-2 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">更新體重</button>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">修改資料申請（需要管理員審核）</div>
        <p className="mt-1 text-xs text-slate-300">你提到客戶要補填/修正資料：這裡就是正式流程（送出→後台審核→套用）。</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["profiles", "meal_logs", "step_logs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setReqTable(t)}
              className={`rounded-lg px-2 py-2 text-xs font-bold ${
                reqTable === t ? "bg-yellow-400 text-slate-900" : "border border-slate-700 text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-bold text-slate-200">target_id（UUID；profiles 可留空或填自己的 id）</label>
        <input
          value={reqId}
          onChange={(e) => setReqId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
        />

        <label className="mt-3 block text-xs font-bold text-slate-200">patch（JSON）</label>
        <textarea
          value={reqPatch}
          onChange={(e) => setReqPatch(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm font-mono"
        />

        <label className="mt-3 block text-xs font-bold text-slate-200">原因</label>
        <input
          value={reqReason}
          onChange={(e) => setReqReason(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
          placeholder="例如：我填錯體重，想修正"
        />

        <button
          onClick={createEditRequest}
          className="mt-3 w-full rounded-xl border border-yellow-500/30 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-slate-800"
        >
          送出申請
        </button>
      </div>
    </div>
  );
}

/* =====================
   Admin Panel (export + approve edit + grant VIP)
===================== */
function AdminPanel({ accessToken }: { accessToken: string }) {
  const [out, setOut] = useState<string>("");
  const [reqs, setReqs] = useState<any[]>([]);
  const [vipEmail, setVipEmail] = useState<string>("");
  const [vipDays, setVipDays] = useState<string>("30");
  const [vipRole, setVipRole] = useState<"vip" | "user" | "admin">("vip");

  async function exportAll() {
    setOut("匯出中…");
    const r = await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setOut(`失敗：${j.error || r.statusText}`);
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heracles_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOut("已下載匯出檔（JSON）");
  }

  async function loadEditRequests() {
    const r = await fetch("/api/admin/edit-requests", { headers: { Authorization: `Bearer ${accessToken}` } });
    const j = await r.json();
    setReqs(j.items || []);
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    const admin_note = decision === "rejected" ? prompt("拒絕原因（可空）") || "" : "";
    const r = await fetch("/api/admin/edit-requests/decide", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, decision, admin_note }),
    });
    const j = await r.json();
    if (!j.ok) alert(`失敗：${j.error}`);
    await loadEditRequests();
  }

  async function setRole() {
    const r = await fetch("/api/admin/users/set-role", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email: vipEmail, role: vipRole, vipDays: Number(vipDays) }),
    });
    const j = await r.json();
    alert(j.ok ? `已設定：${j.role}` : `失敗：${j.error}`);
  }

  useEffect(() => {
    loadEditRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 fade-in">
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">管理員後台</div>
        <p className="mt-1 text-xs text-slate-300">你要求：可修改所有資料、可審核使用者修改申請、可發 VIP。</p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={exportAll}
            className="flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300"
          >
            手動匯出全資料
          </button>
          <button
            onClick={loadEditRequests}
            className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
          >
            重新載入申請
          </button>
        </div>

        {out && (
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-200">{out}</pre>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">VIP / 權限發放</div>
        <div className="mt-3 space-y-2">
          <input
            value={vipEmail}
            onChange={(e) => setVipEmail(e.target.value)}
            placeholder="使用者 Email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={vipRole}
              onChange={(e) => setVipRole(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
            >
              <option value="vip">vip</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <input
              value={vipDays}
              onChange={(e) => setVipDays(e.target.value)}
              placeholder="vip 天數（role=vip 時生效）"
              className="rounded-xl border border-slate-700 bg-slate-950/40 p-2 text-sm"
            />
          </div>
          <button
            onClick={setRole}
            className="w-full rounded-xl border border-yellow-500/30 px-3 py-2 text-sm font-bold text-yellow-200 hover:bg-slate-800"
          >
            套用
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-bold text-yellow-200">待審核修改申請</div>
        {reqs.length === 0 ? (
          <div className="mt-2 text-xs text-slate-400">目前沒有待審核。</div>
        ) : (
          <div className="mt-3 space-y-3">
            {reqs.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300">{r.target_table}:{r.target_id}</div>
                  <div className="text-[10px] text-slate-500">{r.status}</div>
                </div>
                <div className="mt-2 text-xs text-slate-200">原因：{r.reason || "（未填）"}</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-[10px] text-slate-200">{JSON.stringify(r.patch, null, 2)}</pre>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => decide(r.id, "approved")}
                    className="flex-1 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-yellow-300"
                  >
                    同意
                  </button>
                  <button
                    onClick={() => decide(r.id, "rejected")}
                    className="flex-1 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-950/20"
                  >
                    拒絕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
