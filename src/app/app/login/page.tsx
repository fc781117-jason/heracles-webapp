"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  async function signIn() {
    const origin = window.location.origin;
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/app` },
    });
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-yellow-500/10 bg-slate-900/40 p-6">
        <h1 className="text-xl font-bold text-yellow-300">登入</h1>
        <p className="mt-2 text-sm text-slate-200">
          使用 Google 登入後會回到 /app。若跳轉失敗，請先部署後再更新 Supabase 的 Site URL 與 Redirect
          URLs。
        </p>
        <button
          onClick={signIn}
          className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-slate-900 hover:bg-yellow-300"
        >
          使用 Google 登入
        </button>
      </div>
    </main>
  );
}
