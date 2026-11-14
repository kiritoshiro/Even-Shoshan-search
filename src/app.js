const PAGES = window.ES_PAGES;   // [pdfIndex, printedPage, firstHead, lastHead]
const LEX = window.ES_LEX;       // [strong, hebrew, translit, pos, gloss, def]
const EXPECTED_PAGES = 1316;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

// ---------- Hebrew collation ----------
const FIN = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
// consonants only; maqaf/space kept as one space so multi-word names sort word by word, as in the book
const cons = s => (s||'').replace(/־/g,' ').replace(/[^א-ת ]/g,'').replace(/\s+/g,' ').trim();
const key = s => cons(s).replace(/[ךםןףץ]/g,c=>FIN[c]);
const cmp = (a,b) => a<b?-1:a>b?1:0;   // space < letters; base letters are in Unicode alphabetical order

// body pages sorted by printed page, with '?' heads filled from neighbours
const BODY = PAGES.filter(p=>p[1]>0).sort((a,b)=>a[1]-b[1]).map(p=>({idx:p[0],page:p[1],first:p[2],last:p[3]}));
for (let i=0;i<BODY.length;i++){
  const b=BODY[i];
  if (!key(b.first)) b.first = (BODY[i-1]&&BODY[i-1].last)||'';
}
for (let i=BODY.length-1;i>=0;i--){
  const b=BODY[i];
  if (!key(b.last)) b.last = (BODY[i+1]&&BODY[i+1].first)||b.first;
}
const BYPAGE = new Map(BODY.map(b=>[b.page,b]));
const MINPAGE = BODY.length?BODY[0].page:1, MAXPAGE = BODY.length?BODY[BODY.length-1].page:1;

// first page whose last head >= query (where entries for the query begin)
function pageFor(heb){
  const k=key(heb); if(!k||!BODY.length) return null;
  let lo=0,hi=BODY.length-1,ans=BODY.length-1;
  while(lo<=hi){const m=(lo+hi)>>1; if(cmp(key(BODY[m].last),k)>=0){ans=m;hi=m-1}else lo=m+1}
  return BODY[ans];
}

// ---------- search ----------
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.'’ʼʾʿ`\-\s]/g,'');
const LEXI = LEX.map((r,i)=>({i,s:r[0],h:r[1],t:r[2],p:r[3],g:r[4],d:r[5],k:key(r[1]),tn:norm(r[2]),gl:r[4].toLowerCase(),dl:r[5].toLowerCase()}));
function search(q){
  q=q.trim(); if(!q) return {lex:[],direct:null};
  let m;
  if ((m=q.match(/^(?:p|#|page\s*)\s*(\d{1,4})$/i))) return {lex:[],direct:{page:+m[1]}};
  if ((m=q.match(/^h\s*0*(\d{1,4})([a-z]?)$/i))){
    const s='H'+m[1].padStart(4,'0')+(m[2]?m[2].toUpperCase():'');
    return {lex:LEXI.filter(r=>r.s===s||r.s.startsWith(s)&&!m[2]).slice(0,60),direct:null};
  }
  if (/[֐-׿]/.test(q)){
    const k=key(q);
    const exact=LEXI.filter(r=>r.k===k), pre=LEXI.filter(r=>r.k!==k&&r.k.startsWith(k));
    return {lex:exact.concat(pre).slice(0,60),direct:{heb:q}};
  }
  const ql=q.toLowerCase(), qn=norm(q), words=ql.split(/\s+/);
  const re=new RegExp('(^|[^a-z])'+ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z])');
  const scored=[];
  for(const r of LEXI){
    let s=0;
    if(r.gl===ql||r.gl==='to '+ql) s=100;
    else if(r.tn===qn) s=90;
    else if(re.test(r.gl)) s=70-Math.min(20,r.gl.length/4);
    else if(r.tn.startsWith(qn)&&qn.length>=2) s=50;
    else if(words.every(w=>r.gl.includes(w))) s=40;
    else if(re.test(r.dl)) s=20;
    if(s){ if(r.p.startsWith('N:')) s-=8; scored.push([s,r]); }
  }
  scored.sort((a,b)=>b[0]-a[0]||a[1].s.localeCompare(b[1].s));
  return {lex:scored.slice(0,80).map(x=>x[1]),direct:null};
}

const $=id=>document.getElementById(id);
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function render(q){
  const {lex,direct}=search(q), out=[];
  if(direct){
    let b=direct.page?BYPAGE.get(nearest(direct.page)):pageFor(direct.heb);
    if(b){
      out.push(`<div class="sec">Go to</div><button class="res" data-p="${b.page}"><div class="top"><span class="heb he">${esc(direct.heb||'')}</span><span class="meta">${direct.heb?'alphabetical position':''}</span><span class="pg">p. ${b.page}</span></div><div class="meta">Page runs <span class="he">${esc(b.first)}</span> → <span class="he">${esc(b.last)}</span></div></button>`);
    } else if(direct.page) out.push(`<div class="sec">No page ${direct.page} (pages ${MINPAGE}–${MAXPAGE})</div>`);
  }
  if(lex.length){
    out.push(`<div class="sec">${lex.length} lexicon match${lex.length>1?'es':''}</div>`);
    for(const r of lex){
      const b=pageFor(r.h);
      out.push(`<button class="res" data-p="${b?b.page:''}"><div class="top"><span class="heb he">${esc(r.h)}</span><span class="tr">${esc(r.t)}</span><span class="pg">${b?'p. '+b.page:''}</span></div><div><span class="gl">${esc(r.g)}</span> <span class="meta">· ${esc(r.s)} · ${esc(r.p)}</span></div><div class="df">${esc(r.d)}</div></button>`);
    }
  } else if(q.trim() && !direct) out.push('<div class="sec">No matches</div>');
  $('results').innerHTML=out.join('');
}
$('q').addEventListener('input',e=>render(e.target.value));
$('q').addEventListener('keydown',e=>{ if(e.key==='Enter'){const f=$('results').querySelector('.res[data-p]:not([data-p=""])'); if(f) f.click();} });
$('results').addEventListener('click',e=>{
  const b=e.target.closest('.res'); if(!b||!b.dataset.p) return;
  document.querySelectorAll('.res.on').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  show(+b.dataset.p);
});
// Hebrew keypad
const LET='אבגדהוזחטיכלמנסעפצקרשת'.split('').concat(['⌫']);
$('kbd').innerHTML=LET.map(c=>`<button class="he" type="button">${c}</button>`).join('');
$('kbd').addEventListener('click',e=>{const c=e.target.closest('button'); if(!c) return; const q=$('q');
  q.value = c.textContent==='⌫' ? q.value.slice(0,-1) : q.value+c.textContent; render(q.value); q.focus();});

// ---------- viewer ----------
let pdf=null, cur=null, zoom=0, renderTask=null, lastScale=0;
function setHeads(b){ $('heads').innerHTML = b?`${esc(b.first)} <span style="color:var(--mute)">…</span> ${esc(b.last)}`:''; }
async function show(page){
  page=Math.max(MINPAGE,Math.min(MAXPAGE,page));
  const b=BYPAGE.get(page); cur=page; $('pg').value=page; setHeads(b);
  try{ localStorage.setItem('es-page',page) }catch(e){}
  if(!pdf||!b) return;
  const p=await pdf.getPage(b.idx+1);
  const stage=$('stage'), cv=$('cv');
  const base=p.getViewport({scale:1});
  const fit=(stage.clientWidth-24)/base.width;
  lastScale=zoom?zoom:fit;
  const scale=lastScale*(window.devicePixelRatio||1);
  const vp=p.getViewport({scale});
  if(renderTask) try{renderTask.cancel()}catch(e){}
  cv.width=vp.width; cv.height=vp.height;
  cv.style.width=(vp.width/(window.devicePixelRatio||1))+'px';
  cv.hidden=false; $('empty').hidden=true; cv.classList.add('busy');
  renderTask=p.render({canvasContext:cv.getContext('2d'),viewport:vp});
  try{ await renderTask.promise; cv.classList.remove('busy'); stage.scrollTop=0; }catch(e){}
}
// step over pages that are blank, section dividers or missing from the scan
function step(d){ let p=cur+d; while(p>=MINPAGE&&p<=MAXPAGE&&!BYPAGE.has(p)) p+=d; if(BYPAGE.has(p)) show(p); }
function nearest(p){ for(let d=0;d<30;d++){ if(BYPAGE.has(p+d)) return p+d; if(BYPAGE.has(p-d)) return p-d; } return MINPAGE; }
$('prev').onclick=()=>cur&&step(-1);
$('next').onclick=()=>cur&&step(1);
$('pg').onchange=e=>show(nearest(+e.target.value));
$('zin').onclick=()=>{zoom=(zoom||curFit())*1.25;show(cur)};
$('zout').onclick=()=>{zoom=(zoom||curFit())/1.25;show(cur)};
$('zfit').onclick=()=>{zoom=0;show(cur)};
function curFit(){return lastScale||1}
document.addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT') return;
  if(e.key==='ArrowLeft') $('prev').click(); if(e.key==='ArrowRight') $('next').click(); if(e.key==='/'){e.preventDefault();$('q').focus()} });
let rz; window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>!zoom&&cur&&show(cur),200)});

// ---------- opening the PDF ----------
// Desktop app (Tauri): native file dialog, the path is remembered and the PDF is streamed from disk.
// Plain browser: file picker; Chrome/Edge remember the file handle in IndexedDB.
const TAURI = window.__TAURI__;
const BTN = $('openBtn');
function opened(){ BTN.textContent='Change PDF…'; BTN.classList.remove('primary'); show(cur||MINPAGE); }
async function load(src, label){
  BTN.textContent='Loading…';
  try{
    pdf=await pdfjsLib.getDocument(src).promise;
    if(EXPECTED_PAGES && pdf.numPages!==EXPECTED_PAGES) alert(`This PDF has ${pdf.numPages} pages; the index was made for the ${EXPECTED_PAGES}-page scan. Pages may not line up.`);
    opened(); return true;
  }catch(e){
    BTN.textContent='Open concordance PDF…'; BTN.classList.add('primary');
    alert('Could not open '+(label||'the PDF')+': '+e.message); return false;
  }
}
const openFile = file => file.arrayBuffer().then(data=>load({data},file.name));

async function openPath(path){
  const ok = await load({url:TAURI.core.convertFileSrc(path), rangeChunkSize:1<<20}, path);
  try{ ok ? localStorage.setItem('es-pdf-path',path) : localStorage.removeItem('es-pdf-path') }catch(e){}
}

const DB='es-finder';
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function saveHandle(h){try{const db=await idb();db.transaction('h','readwrite').objectStore('h').put(h,'pdf')}catch(e){}}
async function loadHandle(){try{const db=await idb();return await new Promise(r=>{const q=db.transaction('h').objectStore('h').get('pdf');q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)})}catch(e){return null}}

const pick=async()=>{
  if(TAURI){
    const path=await TAURI.dialog.open({multiple:false,directory:false,filters:[{name:'PDF',extensions:['pdf']}]});
    if(path) openPath(path);
    return;
  }
  if(window.showOpenFilePicker){
    try{const [h]=await showOpenFilePicker({types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]}); saveHandle(h); openFile(await h.getFile()); return;}
    catch(e){ if(e.name==='AbortError') return; }
  }
  $('file').click();
};
BTN.onclick=pick;
$('file').onchange=e=>{const f=e.target.files[0]; if(f) openFile(f)};
(async()=>{
  let start=MINPAGE; try{start=+localStorage.getItem('es-page')||MINPAGE}catch(e){}
  cur=start; $('pg').value=start; setHeads(BYPAGE.get(start));
  if(TAURI){
    $('empty').querySelector('p').innerHTML='Click <b>Open concordance PDF…</b> and choose the Even-Shoshan scan (the 1,316-page file). The app remembers where it is, so you only do this once.';
    let path=null; try{path=localStorage.getItem('es-pdf-path')}catch(e){}
    if(path) openPath(path);
    return;
  }
  const h=await loadHandle();
  if(h&&h.queryPermission){
    BTN.textContent='Reopen '+(h.name.length>24?h.name.slice(0,22)+'…':h.name);
    BTN.onclick=async()=>{ try{ if(await h.requestPermission({mode:'read'})==='granted'){ BTN.onclick=pick; return openFile(await h.getFile()); } }catch(e){} $('file').click(); };
  }
})();
$('q').focus();
