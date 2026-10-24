import type { Config } from "@netlify/functions";
import { store, getAll, totals } from "../lib/rsvps.mts";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const notFound = () => new Response("Not found", { status: 404 });

export default async (req: Request) => {
  const secret = Netlify.env.get("GUESTS_KEY");
  if (!secret) return notFound();

  // Delete one reply. The key travels in the body.
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    if (body?.key !== secret) return notFound();
    if (body.action === "delete" && typeof body.id === "string" && body.id) {
      await store().delete(body.id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  }

  const url = new URL(req.url);
  if (url.searchParams.get("key") !== secret) return notFound();

  const all = await getAll();
  const t = totals(all);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const rows = [...all]
    .reverse()
    .map((r) => {
      const party = r.attending
        ? `<span class="chip">${pl(r.adults, "adult", "adults")}</span>${r.kids ? `<span class="chip">${pl(r.kids, "child", "children")}</span>` : ""}`
        : "";
      return `<article class="g ${r.attending ? "in" : "out"}" data-state="${r.attending ? "in" : "out"}">
  <div class="gh">
    <div class="who"><h3>${esc(r.name)}</h3><time>${fmt.format(new Date(r.at))}</time></div>
    <span class="pill">${r.attending ? "Attending" : "Declined"}</span>
  </div>
  ${party ? `<div class="chips">${party}</div>` : ""}
  ${r.note ? `<p class="note">“${esc(r.note)}”</p>` : ""}
  <div class="gf"><button type="button" class="del" data-id="${esc(r.id)}" data-name="${esc(r.name)}">Delete reply</button></div>
</article>`;
    })
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#FBF8F2">
<title>Guest List · Julie &amp; Fernando</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400&family=Pinyon+Script&family=Marcellus&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
:root{--linen:#FBF8F2;--paper:#fff;--sand:#E9DFCC;--sand-deep:#CDBB9A;--ink:#3B342A;--muted:#6B6150;--gold:#B08D57;--gold-hi:#D9BC82;--gold-lo:#8C6B3A;
--display:"Bodoni Moda",Didot,Georgia,serif;--script:"Pinyon Script","Snell Roundhand",cursive;--label:"Marcellus",Georgia,serif;--body:"EB Garamond",Garamond,Georgia,serif}
*{box-sizing:border-box}
html,body{margin:0;background:var(--linen)}
body{color:var(--ink);font-family:var(--body);font-size:18px;line-height:1.5;
 padding:calc(28px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(48px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
main{max-width:640px;margin:0 auto;display:grid;gap:22px}
.label{font-family:var(--label);text-transform:uppercase;letter-spacing:.26em;font-size:.7rem;color:var(--muted)}
header{text-align:center;display:grid;gap:6px;justify-items:center}
.mono{font-family:var(--script);font-size:2.6rem;line-height:1.3;padding:0 .4em;color:var(--gold)}
h1{font-family:var(--display);font-weight:400;font-size:2.2rem;margin:0;line-height:1.1}
.rule{display:flex;align-items:center;gap:12px;color:var(--gold);margin-top:6px}
.rule::before,.rule::after{content:"";height:1px;width:56px;background:linear-gradient(90deg,transparent,var(--gold))}
.rule::after{transform:scaleX(-1)}
.rule i{width:6px;height:6px;transform:rotate(45deg);border:1px solid var(--gold)}
.card{background:var(--paper);position:relative;padding:26px 22px;box-shadow:0 1px 0 var(--sand),0 24px 48px -28px rgba(80,60,30,.28)}
.card::before{content:"";position:absolute;inset:8px;border:1px solid var(--sand);pointer-events:none}
.hero{text-align:center;display:grid;gap:4px}
.hero b{font-family:var(--display);font-weight:400;font-size:clamp(4rem,20vw,5.6rem);line-height:1;color:var(--gold-lo);font-variant-numeric:tabular-nums}
.hero small{font-style:italic;color:var(--muted);font-size:1.05rem}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.stat{background:var(--paper);border:1px solid var(--sand);padding:14px 6px;text-align:center;display:grid;gap:2px}
.stat b{font-family:var(--display);font-weight:400;font-size:2rem;line-height:1.1;font-variant-numeric:tabular-nums}
.stat .label{font-size:.6rem;letter-spacing:.18em}
.tools{display:grid;gap:10px}
.tools h2,.bar h2{font-family:var(--display);font-weight:400;font-size:1.35rem;margin:0}
.linkrow{display:flex;gap:8px;flex-wrap:wrap}
.linkrow input{flex:1 1 200px;min-width:0;font:inherit;font-size:1rem;color:var(--ink);border:0;border-bottom:1px solid var(--sand-deep);background:transparent;padding:8px 2px;border-radius:0}
.linkrow input:focus{outline:none;border-bottom-color:var(--gold)}
.langpick{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.langpick .label{margin-right:4px}
.langpick button{padding:8px 11px;border-color:var(--sand-deep);color:var(--muted)}
.langpick button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-lo);background:#FBF4E6}
.out{font-size:.92rem;color:var(--muted);overflow-wrap:anywhere;user-select:all;min-height:1.4em}
button{font-family:var(--label);letter-spacing:.2em;text-transform:uppercase;font-size:.7rem;cursor:pointer;padding:11px 14px;border:1px solid var(--gold);background:var(--paper);color:var(--gold-lo);-webkit-tap-highlight-color:transparent}
button:hover{background:#FBF4E6}
button:focus-visible,input:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.primary{background:linear-gradient(100deg,var(--gold-lo),var(--gold) 45%,var(--gold-hi));color:#FFF9EC;border-color:transparent}
.primary:hover{background:linear-gradient(100deg,var(--gold-lo),var(--gold))}
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.tabs{display:flex;gap:6px}
.tabs button{padding:8px 11px;border-color:var(--sand-deep);color:var(--muted)}
.tabs button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-lo);background:#FBF4E6}
.list{display:grid;gap:10px}
.g{background:var(--paper);border:1px solid var(--sand);padding:14px 16px}
.g.out{background:#FCFAF6}
.gh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.who{min-width:0}
.who h3{font-family:var(--display);font-weight:400;font-size:1.3rem;margin:0;line-height:1.2;overflow-wrap:anywhere}
time{font-size:.85rem;color:var(--muted);font-style:italic}
.pill{flex:none;font-family:var(--label);letter-spacing:.16em;text-transform:uppercase;font-size:.6rem;padding:5px 9px;border:1px solid var(--gold);color:var(--gold-lo)}
.g.out .pill{border-color:var(--sand-deep);color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{border:1px solid var(--sand);background:var(--linen);padding:3px 10px;font-size:.95rem}
.note{margin:10px 0 0;font-style:italic;color:var(--muted);overflow-wrap:anywhere}
.gf{display:flex;justify-content:flex-end;margin-top:10px}
.del{border-color:var(--sand-deep);color:var(--muted);padding:7px 11px;font-size:.62rem}
.del.armed{border-color:#9A3B2E;color:#9A3B2E}
.empty{text-align:center;color:var(--muted);font-style:italic;padding:28px 12px;border:1px dashed var(--sand-deep)}
footer{text-align:center}
@media (max-width:520px){.stats{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main>
<header>
  <div class="mono">J &amp; F</div>
  <div class="label">Guest list · Private</div>
  <h1>Julie &amp; Fernando</h1>
  <div class="label">Wednesday · 15 December 2027 · Brasil</div>
  <div class="rule"><i></i></div>
</header>

<section class="card hero" aria-label="Total guests">
  <div class="label">Total guests attending</div>
  <b>${t.people}</b>
  <small>${pl(t.adults, "adult", "adults")} · ${pl(t.kids, "child", "children")}</small>
</section>

<section class="stats" aria-label="Totals">
  <div class="stat"><b>${t.adults}</b><span class="label">Adults</span></div>
  <div class="stat"><b>${t.kids}</b><span class="label">Children</span></div>
  <div class="stat"><b>${t.yes}</b><span class="label">Coming</span></div>
  <div class="stat"><b>${t.no}</b><span class="label">Declined</span></div>
</section>

<section class="card tools" aria-label="Personal invitation link">
  <h2>Personal invitation link</h2>
  <div class="label">Type a guest’s name to get their link</div>
  <div class="linkrow"><input id="gname" type="text" placeholder="e.g. Ana &amp; Pedro" autocomplete="off"><button type="button" class="primary" id="copy">Copy link</button></div>
  <div class="langpick" role="group" aria-label="Invitation language"><span class="label">Language</span><button type="button" data-l="en" aria-pressed="true">English</button><button type="button" data-l="pt" aria-pressed="false">Português</button></div>
  <div class="out" id="glink"></div>
</section>

<div class="bar">
  <h2>Replies <span style="color:var(--gold)">${all.length}</span></h2>
  <div class="tabs" role="group" aria-label="Filter replies">
    <button type="button" data-f="all" aria-pressed="true">All</button>
    <button type="button" data-f="in" aria-pressed="false">Attending</button>
    <button type="button" data-f="out" aria-pressed="false">Declined</button>
  </div>
</div>
<div class="list" id="list">
${rows || '<div class="empty">No replies yet. They will appear here as guests respond.</div>'}
</div>
<footer><button type="button" id="refresh">Refresh</button></footer>
</main>
<script>
var key=new URLSearchParams(location.search).get('key');
var $=function(id){return document.getElementById(id)};
$('refresh').onclick=function(){location.reload()};
document.querySelectorAll('.tabs button').forEach(function(b){
  b.onclick=function(){
    document.querySelectorAll('.tabs button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
    var f=b.dataset.f;
    document.querySelectorAll('.g').forEach(function(g){g.hidden=!(f==='all'||g.dataset.state===f)});
  };
});
var glang='en';
function linkFor(n){return location.origin+'/?to='+encodeURIComponent(n.trim())+(glang==='pt'?'&lang=pt':'')}
document.querySelectorAll('.langpick button').forEach(function(b){b.onclick=function(){glang=b.dataset.l;
  document.querySelectorAll('.langpick button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
  var n=$('gname').value.trim();$('glink').textContent=n?linkFor(n):''}});
$('gname').addEventListener('input',function(){var n=this.value.trim();$('glink').textContent=n?linkFor(n):''});
$('copy').onclick=function(){
  var n=$('gname').value.trim(); if(!n){$('gname').focus();return}
  var l=linkFor(n); $('glink').textContent=l; var btn=this;
  (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(function(){btn.textContent='Copied';setTimeout(function(){btn.textContent='Copy link'},1600)})
  .catch(function(){var r=document.createRange();r.selectNodeContents($('glink'));var s=getSelection();s.removeAllRanges();s.addRange(r)});
};
document.addEventListener('click',function(e){
  var b=e.target.closest('.del'); if(!b) return;
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Tap again to delete';setTimeout(function(){b.classList.remove('armed');b.textContent='Delete reply'},3000);return}
  b.disabled=true;b.textContent='Deleting…';
  fetch('/guests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:key,action:'delete',id:b.dataset.id})})
    .then(function(r){if(!r.ok)throw 0;location.reload()})
    .catch(function(){b.disabled=false;b.textContent='Try again'});
});
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config: Config = { path: "/guests", method: ["GET", "POST"] };
