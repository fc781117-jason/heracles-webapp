import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-yellow-500/20 bg-slate-900/40 p-6 backdrop-blur">
        <h1 className="font-semibold text-2xl text-yellow-300">HERACLES</h1>
        <p className="mt-2 text-sm text-slate-200">英雄試煉式健康管理 × 今天吃什麼拉霸機</p>

        <div className="mt-6 space-y-3">
          <Link
            href="/app"
            className="block rounded-xl bg-yellow-400 px-4 py-3 text-center font-bold text-slate-900 hover:bg-yellow-300"
          >
            進入系統
          </Link>
          <p className="text-xs text-slate-400">
            第一次部署後：請到 Supabase → Authentication → URL Configuration 設定 Site URL（填入你的
            Vercel 網域），避免登入跳轉失敗。
          </p>
        </div>
      </div>
    </main>
  );
}
