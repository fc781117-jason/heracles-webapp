"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import styles from "./food.module.css";

type Mode="spin"|"nearby"|"compare"|"lookup";
type R={id:string;name:string;category:string;price:number;google:number;heart?:number;walk:number;open:boolean;close:string;flags:string[];dishes:string[]};
const DATA:R[]=[
{id:"1",name:"山海小館",category:"台式",price:280,google:4.4,heart:4.2,walk:6,open:true,close:"21:30",flags:[],dishes:["滷肉飯","炸排骨","燙青菜"]},
{id:"2",name:"町屋食堂",category:"日式",price:420,google:4.6,heart:4.4,walk:11,open:true,close:"22:00",flags:[],dishes:["唐揚雞","鮭魚丼","玉子燒"]},
{id:"3",name:"沸點鍋物",category:"火鍋",price:520,google:4.3,heart:4.0,walk:14,open:true,close:"23:00",flags:["可取得評論曾提及桌面油膩"],dishes:["昆布鍋","梅花豬","綜合菜盤"]},
{id:"4",name:"巷口牛肉麵",category:"麵食",price:220,google:4.2,walk:8,open:true,close:"20:45",flags:[],dishes:["紅燒牛肉麵","牛三寶","小菜"]},
{id:"5",name:"夜航居酒屋",category:"居酒屋",price:850,google:4.5,heart:4.3,walk:13,open:true,close:"01:00",flags:[],dishes:["雞肉串燒","烤鯖魚","生啤酒"]},
{id:"6",name:"晨光早午餐",category:"早午餐",price:320,google:4.1,walk:18,open:false,close:"15:00",flags:[],dishes:["班尼迪克蛋","法式吐司","拿鐵"]},
];

export default function Page(){
 const [mode,setMode]=useState<Mode>("spin");
 const [budget,setBudget]=useState("");
 const [walk,setWalk]=useState(15);
 const [rating,setRating]=useState("");
 const [openOnly,setOpenOnly]=useState(true);
 const [category,setCategory]=useState("不限");
 const [spin,setSpin]=useState(false);
 const [slot,setSlot]=useState("準備好了嗎？");
 const [winner,setWinner]=useState<R|null>(null);
 const [fav,setFav]=useState<string[]>([]);
 const [blocked,setBlocked]=useState<string[]>([]);
 const [compare,setCompare]=useState<string[]>([]);
 const [cloud,setCloud]=useState(false);
 const timer=useRef<number|null>(null);

 useEffect(()=>{try{setFav(JSON.parse(localStorage.getItem("food:fav")||"[]"));setBlocked(JSON.parse(localStorage.getItem("food:block")||"[]"));}catch{};return()=>{if(timer.current)clearInterval(timer.current)}},[]);
 useEffect(()=>{localStorage.setItem("food:fav",JSON.stringify(fav))},[fav]);
 useEffect(()=>{localStorage.setItem("food:block",JSON.stringify(blocked))},[blocked]);

 const cats=useMemo(()=>["不限"].concat(Array.from(new Set(DATA.map(x=>x.category)))),[]);
 const pool=useMemo(()=>DATA.filter(r=>!blocked.includes(r.id)&&(!openOnly||r.open)&&r.walk<=walk&&(!budget||r.price<=Number(budget))&&(!rating||r.google>=Number(rating))&&(category==="不限"||r.category===category)),[blocked,openOnly,walk,budget,rating,category]);

 function doSpin(){
  if(!pool.length)return;
  setSpin(true);setWinner(null);
  const chosen=pool[Math.floor(Math.random()*pool.length)];
  let t=0;
  if(timer.current)clearInterval(timer.current);
  timer.current=window.setInterval(()=>{t++;setSlot(pool[Math.floor(Math.random()*pool.length)].name);if(t>=24){if(timer.current)clearInterval(timer.current);setSlot(chosen.name);setWinner(chosen);setSpin(false);navigator.vibrate?.([35,45,60]);}},80);
 }
 function toggleCompare(id:string){setCompare(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=5?p:p.concat(id))}
 const compared=compare.map(id=>DATA.find(x=>x.id===id)).filter(Boolean) as R[];

 return <main className={styles.app}>
  <header className={styles.header}><div><small>FOOD PICKER · PREVIEW V0.1</small><h1>今天吃什麼？</h1><p>先排除不合適，再交給命運。</p></div><button onClick={()=>setCloud(v=>!v)}>☁️</button></header>
  {cloud&&<section className={styles.panel}><b>資料同步</b><p>Preview 先存在本機。正式版：訪客可 JSON 匯出／匯入；Google 登入後可雲端同步。</p><button disabled>Google 登入 · 待後端接線</button></section>}
  <section className={styles.modes}>
   <M icon="🎰" title="完全沒想法" sub="幫我抽" active={mode==="spin"} on={()=>setMode("spin")}/>
   <M icon="📍" title="看附近" sub="我自己先挑" active={mode==="nearby"} on={()=>setMode("nearby")}/>
   <M icon="⚖️" title="比較幾家" sub="最多 5 家" active={mode==="compare"} on={()=>setMode("compare")}/>
   <M icon="🔎" title="查一家" sub="看看值不值得" active={mode==="lookup"} on={()=>setMode("lookup")}/>
  </section>

  {(mode==="spin"||mode==="nearby")&&<>
   <section className={styles.filters}><div className={styles.title}><b>先決條件</b><span>{pool.length} 家符合</span></div>
    <label><strong>每人預算</strong><select value={budget} onChange={e=>setBudget(e.target.value)}><option value="">不限</option><option value="200">NT$200 內</option><option value="300">NT$300 內</option><option value="500">NT$500 內</option><option value="800">NT$800 內</option><option value="1000">NT$1,000 內</option></select></label>
    <label>步行範圍<select value={walk} onChange={e=>setWalk(Number(e.target.value))}><option value="5">約 5 分鐘</option><option value="10">約 10 分鐘</option><option value="15">約 15 分鐘</option><option value="20">約 20 分鐘</option><option value="99">不限</option></select></label>
    <label>最低 Google 評分<select value={rating} onChange={e=>setRating(e.target.value)}><option value="">不限制</option><option value="4">4.0+</option><option value="4.3">4.3+</option><option value="4.5">4.5+</option></select></label>
    <label>餐飲類型<select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className={styles.check}><span>只看現在營業</span><input type="checkbox" checked={openOnly} onChange={e=>setOpenOnly(e.target.checked)}/></label>
   </section>
   {mode==="spin"&&<section className={styles.slot}><small>命運滾筒</small><div className={spin?[styles.reel,styles.spinning].join(" "):styles.reel}>{slot}</div><button onClick={doSpin} disabled={spin||!pool.length}>{spin?"轉動中…":"開始拉霸"}</button>{!pool.length&&<p>沒有符合條件的店，請放寬一個條件。</p>}</section>}
   {winner&&mode==="spin"&&<Card r={winner} fav={fav.includes(winner.id)} onFav={()=>setFav(p=>p.includes(winner.id)?p.filter(x=>x!==winner.id):p.concat(winner.id))} onBlock={()=>setBlocked(p=>Array.from(new Set(p.concat(winner.id))))} onCompare={()=>toggleCompare(winner.id)} compared={compare.includes(winner.id)}/>}
   {mode==="nearby"&&<section className={styles.list}>{pool.map(r=><Card key={r.id} r={r} fav={fav.includes(r.id)} onFav={()=>setFav(p=>p.includes(r.id)?p.filter(x=>x!==r.id):p.concat(r.id))} onBlock={()=>setBlocked(p=>Array.from(new Set(p.concat(r.id))))} onCompare={()=>toggleCompare(r.id)} compared={compare.includes(r.id)} compact/>)}</section>}
  </>}

  {mode==="compare"&&<section className={styles.panel}><div className={styles.title}><b>挑最多 5 家</b><span>{compare.length}/5</span></div><div className={styles.chips}>{DATA.map(r=><button key={r.id} onClick={()=>toggleCompare(r.id)} className={compare.includes(r.id)?styles.selected:""}>{compare.includes(r.id)?"✓ ":""}{r.name}</button>)}</div><div className={styles.rail}>{compared.map(r=><Card key={r.id} r={r} fav={fav.includes(r.id)} onFav={()=>{}} onBlock={()=>{}} onCompare={()=>toggleCompare(r.id)} compared/>)}</div></section>}
  {mode==="lookup"&&<section className={styles.panel}><h2>查一家餐廳</h2><p>正式版支援店名與 Google Maps 網址。</p><input className={styles.search} placeholder="輸入店名或貼上 Google Maps 網址"/><button className={styles.go}>搜尋 · 待 Google Places 接線</button><p className={styles.tip}>結果會整合：Google 評分、❤️ 綜合評估、每人預算、營業資訊、推薦菜、評論提醒與導航。</p></section>}
  <section className={styles.install}><b>📱 放到 iPhone 桌面</b><span>Safari → 分享 → 加入主畫面。正式版會以 PWA（可安裝網頁 App）開啟。</span></section>
  <footer>目前使用示範餐廳資料；正式版才接 Google Places 即時資料。</footer>
 </main>
}

function M({icon,title,sub,active,on}:{icon:string;title:string;sub:string;active:boolean;on:()=>void}){return <button className={active?styles.active:""} onClick={on}><span>{icon}</span><b>{title}</b><small>{sub}</small></button>}
function Card({r,fav,onFav,onBlock,onCompare,compared,compact}:{r:R;fav:boolean;onFav:()=>void;onBlock:()=>void;onCompare:()=>void;compared:boolean;compact?:boolean}){return <article className={styles.card}><div className={styles.cardTop}><div><em>{r.category}</em><h3>{r.name}</h3></div><button onClick={onFav}>{fav?"♥":"♡"}</button></div><div className={styles.meta}><span>⭐ {r.google.toFixed(1)}</span>{r.heart&&<span>❤️ {r.heart.toFixed(1)}</span>}<span>🚶 {r.walk} 分</span><span>{"💰 約 NT$"+r.price+"/人"}</span></div><div className={styles.open}>{r.open?"🟢 營業中":"⚪ 未營業"} · 至 {r.close}</div>{!compact&&<><div className={styles.dishes}><b>推薦候選</b><span>{r.dishes.join(" · ")}</span></div>{r.flags.length>0&&<div className={styles.warn}>🧼 評論訊號：{r.flags.join("；")}<small>僅代表可取得評論，不等於衛生稽查結果。</small></div>}</>}<div className={styles.actions}><button onClick={onCompare}>{compared?"移出比較":"加入比較"}</button><button onClick={onBlock}>這次不要</button><button>導航</button></div></article>}
