# Heracles 自主進化系統（Web App）— GitHub + Vercel + Supabase

> 你目前只能使用「網頁版」操作（無法安裝工具 / 無法本機跑）。
>
> 這個專案設計成：**你只要把檔案上傳到 GitHub → Vercel 連上 repo → 填環境變數 → 部署**，就能直接跑起來。

---

## 你會得到什麼

- Google 登入（Supabase Auth）
- 儀表板（今日熱量/蛋白/步數、AI 按鈕、PDF 週報）
- 飲食拍照：**硬幣比例尺必填**（50/10/5/1）
  - 上傳照片到 Supabase Storage（私有 bucket）→ signed URL 給 OpenAI Vision
  - 辨識後提供「手部估重」滑桿（拳頭/掌心/雙手捧/拇指/指尖）
  - 儲存時會自動查 USDA（每 100g）推算熱量與三大營養素
  - 寫入 meal_logs + coin_ledger + audit_logs
- 今天吃什麼（Delphi Oracle）：
  - Places API (New) nearby search（低成本 FieldMask）
  - Place reviews（獨立請求；通常最多 5 則）
- 管理員後台（精簡版）：
  - 匯出全資料 JSON（手動備份）
  - 審核使用者改資料申請（edit_requests）
  - 以 Email 發放 VIP/admin 權限


> Stripe（押金付款）目前未包含（你已決定先不做）。

---

# A. 你要做的事（完全網頁操作版）

## A1) 下載此專案檔案包並解壓縮

1. 下載 `heracles-webapp.zip`
2. **解壓縮（不需安裝任何軟體）**
   - Windows：右鍵 →「全部解壓縮」
   - macOS：雙擊 zip 直接解壓

解壓後，你會看到一個資料夾 `heracles-webapp/`，裡面包含 `package.json`, `src/`, `supabase/` 等。

---

## A2) 用 GitHub 網頁上傳整個專案

1. 打開 GitHub → 右上角 **New repository**
2. Repository name：建議 `heracles-webapp`
3. 建立後進入 repo
4. 點 **Add file** → **Upload files**
5. 把你解壓縮後 `heracles-webapp` 資料夾**裡面的所有檔案與資料夾**（例如 `src`, `supabase`, `package.json`…）
   直接整批拖曳進 GitHub 上傳區。
   - ✅ 正確：看到資料夾結構被保留（`src/app/...`）
   - ❌ 錯誤：只上傳一個 zip 檔（Vercel 不會自動解壓）
6. 下方填寫 commit message：`init`
7. 點 **Commit changes**

---

## A3) 用 Vercel 網頁部署（不用本機 build）

1. 打開 Vercel Dashboard
2. **Add New** → **Project**
3. Import Git Repository：選你剛建立的 GitHub repo
4. Framework 會自動偵測 Next.js
5. 先不要急著 Deploy，先去設定環境變數（Environment Variables）

### A3-1) 設定 Vercel 環境變數（最重要）

在 Vercel 專案頁：**Settings** → **Environment Variables**

新增以下（至少 Production + Preview 都加）：

- `NEXT_PUBLIC_SUPABASE_URL` = `https://xqadtpyvdlgnlmyhbdlv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 anon key（你已提供）
- `SUPABASE_SERVICE_ROLE_KEY` = 你已放到 Vercel env 的那串（機密）
- `ADMIN_EMAIL` = `fc781117@gmail.com`
- `OPENAI_API_KEY` = 你已放的（機密）
- `OPENAI_MODEL` = `gpt-4o-mini`（可不填，預設就是）
- `USDA_API_KEY` = 你已放的（機密）
- `GOOGLE_MAPS_API_KEY` = **請使用「Server key」**（見下一段）

#### 重要：Google Places Key 你需要「Server Key」

你原本做了「HTTP referrer 限制」的 Places key，**那種 key 只適合前端瀏覽器呼叫**。

本專案的 Places 呼叫是在 Vercel Server（API routes）進行，server request 不會帶瀏覽器 referer，
所以 **如果 key 設成 HTTP referrer 限制，server 呼叫會被 Google 拒絕**。

✅ 正確做法：
- 在 Google Cloud 再建立一把新的 key（建議命名：`places-server-key`）
- **Application restrictions：選 None（不限制）**
- **API restrictions：Restrict key → 只勾 Places API (New)**
- 把這把 key 放到 Vercel env：`GOOGLE_MAPS_API_KEY`

---

### A3-2) 部署

回到 Vercel 專案頁 → 點 **Deploy**。

部署成功後你會拿到一個網址：
- `https://你的專案.vercel.app`

---

# B. 部署完成後的 Supabase 收尾設定（登入一定要做）

你現在才有「Vercel 正式網域」，所以 Supabase 的 Site URL 需要在此時更新。

## B1) Supabase Auth → URL Configuration

Supabase Dashboard → Authentication → URL Configuration

- **Site URL**：填入你的 Vercel 網域，例如 `https://your-project.vercel.app`
- **Redirect URLs**：加入
  - `https://your-project.vercel.app/**`
  - `https://*.vercel.app/**`（保留 preview）
  - `http://localhost:3000/**`（可留著）

儲存後再測 Google 登入就會穩。

---

# C. Supabase SQL（建表 + RLS + Storage policies）

> 你已建 buckets：`meal-images`、`step-proofs`。

## C1) 建表 / RLS

Supabase → SQL Editor → New query

把 `supabase/schema.sql` 全部貼上 → Run

## C2) Storage policies（不做會上傳失敗）

Supabase → SQL Editor → New query

把 `supabase/storage_policies.sql` 全部貼上 → Run

---

# D. 管理員設定（你指定 fc781117@gmail.com）

你必須先用管理員信箱登入一次，系統才會在 `profiles` 建出那筆資料。

1) 打開 `https://你的vercel網域/app/login`
2) 用 `fc781117@gmail.com` 登入
3) 回 Supabase → SQL Editor → New query
4) 貼上 `supabase/admin_set.sql` → Run

完成後，管理員登入會在頁首看到 `ADMIN`。

---

# E. 測試清單（建議照順序）

1) `/` → 進入系統 → 轉 `/app`
2) `/app/login` → Google 登入成功
3) Dashboard 顯示今日統計（初始為 0）
4) 紀錄頁：選硬幣面額 → 拍照上傳 → 輸入 coinPx → 開始辨識
5) 看到辨識 JSON → 點「儲存為飲食紀錄」
6) 回 Dashboard → 今日金幣增加（+10）
7) 拉霸頁：允許定位 → 取得附近餐廳 → 拉霸 → 看評論（最多 5）
8) 後台（管理員）：匯出全資料 JSON、查看 edit_requests

---

# F. 常見錯誤排除

## 1) Google 登入後跳回失敗
- Supabase Auth → URL Configuration
  - Site URL 沒改成 Vercel 網域
  - Redirect URLs 沒加 `https://你的網域/**`

## 2) Places API 403 / REQUEST_DENIED
- 你使用了「HTTP referrer 限制」的 key 放在 server env
- 請改用「Server key」（Application restrictions: None；API restrictions: Places API (New)）

## 3) 上傳照片失敗（Storage）
- 你沒有跑 `storage_policies.sql`
- 或你上傳路徑沒有用 `userId/xxx.jpg` 格式

---

# G. 你下一步想加的功能（已預留）

- 匯入中心（MyFitnessPal / Cronometer CSV）
- 進階硬幣校正（拖曳圓圈量直徑，不用手打 px）
- 今日吃什麼：不喜歡/不想吃/黑名單管理、熱量估算 UI、加入飲食紀錄
- 使用者改資料申請：前端歷史頁完整流程 + 管理員一鍵核准套用
