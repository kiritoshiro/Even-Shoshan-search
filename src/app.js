// interface text in the chosen language (i18n.js)
if(window.I18N){ I18N.applyStatic(); document.getElementById('langBtn').onclick=()=>I18N.setLang(I18N.lang==='lt'?'en':'lt'); }
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
const LT = window.ES_LEX_LT||{}, LANG = window.I18N?I18N.lang:'en';
// Lithuanian matching ignores diacritics, so "seti" finds "sėti"
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const LEXI = LEX.map((r,i)=>({i,s:r[0],h:r[1],t:r[2],p:r[3],g:r[4],d:r[5],k:key(r[1]),tn:norm(r[2]),gl:r[4].toLowerCase(),dl:r[5].toLowerCase(),
  lt:ltFor(r), ltf:fold(ltFor(r))}));
// Lithuanian gloss of a lexicon row: its own Hebrew word first, then the shared English gloss
function ltFor(r){ return LT[r[4]+'|'+r[1].replace(/[^א-ת]/g,'')]||LT[r[4]]||''; }
function search(q){
  q=q.trim(); if(!q) return {lex:[],direct:null};
  let m;
  if ((m=q.match(/^(?:p|#|page\s*)\s*(\d{1,4})$/i))) return {lex:[],direct:{page:+m[1]}};
  if ((m=q.match(/^h\s*0*(\d{1,4})([a-z]?)$/i))){
    const s='H'+m[1].padStart(4,'0')+(m[2]?m[2].toUpperCase():'');
    return {lex:LEXI.filter(r=>r.s===s||r.s.startsWith(s)&&!m[2]).slice(0,60),direct:null};
  }
  const ref=window.ESVerse&&ESVerse.parse(q);
  if (ref) return {lex:[],direct:null,verse:ref};
  if (/[֐-׿]/.test(q)){
    const k=key(q);
    const exact=LEXI.filter(r=>r.k===k), pre=LEXI.filter(r=>r.k!==k&&r.k.startsWith(k));
    // the word as it is written in the Bible (with prefixes and endings) -> its dictionary entries
    const forms=window.ESVerse?ESVerse.forms(q).map(f=>({...f,r:lexById(f.id)})).filter(f=>f.r):[];
    return {lex:exact.concat(pre).slice(0,60),direct:{heb:q},forms};
  }
  const ql=q.toLowerCase(), qn=norm(q), words=ql.split(/\s+/);
  const re=new RegExp('(^|[^a-z])'+ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z])');
  const qf=fold(q), reL=new RegExp('(^|[^a-z])'+qf.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z])'), bonus=LANG==='lt'?5:0;
  const scored=[];
  for(const r of LEXI){
    let s=0;
    if(r.ltf&&r.ltf===qf) s=100+bonus;
    else if(r.gl===ql||r.gl==='to '+ql) s=100;
    else if(r.ltf&&qf.length>=3&&reL.test(r.ltf)) s=70+bonus-Math.min(20,r.ltf.length/4);
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

// lexicon row for an extended Strong's number from data/bible.js ("1254A", "0430" -> first H0430x row)
const BYID=new Map(); for(const r of LEXI){ BYID.has(r.s)||BYID.set(r.s,r); const n=r.s.slice(0,5); BYID.has(n)||BYID.set(n,r); }
const lexById=id=>id?BYID.get('H'+id)||BYID.get('H'+id.slice(0,4)):null;

const $=id=>document.getElementById(id);
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// gloss in the chosen language: Lithuanian first in Lithuanian mode, English in brackets after it
const glossHtml=r=>LANG==='lt'&&r.lt?`<span class="gl">${esc(r.lt)}</span> <span class="meta">(${esc(r.g)})</span>`:`<span class="gl">${esc(r.g)}</span>${r.lt?` <span class="meta">(${esc(r.lt)})</span>`:''}`;
const lemmaOf=r=>r.h.replace(/[\/֑-֯]/g,'');
// one Bible word (or word form) -> its dictionary entry and concordance page
function wordRow(form, r, extra, w){
  const b=pageFor(lemmaOf(r));
  return `<button class="res" data-p="${b?b.page:''}"${w!=null?` data-w="${w}"`:''}><div class="top"><span class="heb he">${esc(form)}</span><span class="meta">→</span><span class="he lem">${esc(lemmaOf(r))}</span><span class="tr">${esc(r.t)}</span><span class="pg">${b?T('pAbbr')+' '+b.page:''}</span></div><div>${glossHtml(r)} <span class="meta">· ${esc(r.s)}${extra?' · '+extra:''}</span></div></button>`;
}
// ---------- where a verse is quoted in the concordance ----------
// An entry runs from the first page whose last running head reaches the word to the last page whose
// first head is not past it. Its lines are read from the scan's OCR text layer (refs.js lineRefs).
function entryPages(heb){
  const k=key(heb), b=pageFor(heb); if(!b) return [];
  let i=BODY.indexOf(b); const out=[b];
  while(++i<BODY.length&&out.length<150&&cmp(key(BODY[i].first),k)<=0) out.push(BODY[i]);
  return out;
}
const BOOKPOS=new Map((window.ESRefs?ESRefs.books:[]).map(([,en],i)=>[en,i]));
const vpos=(b,c,v)=>BOOKPOS.get(b)*1e6+c*1e3+v;
const FOUND=new Map();   // lemma|form|verse -> result
// {page, col, y, y2, exact, pages:[first,last]} for one word of a verse; null without the PDF.
// Even-Shoshan lists each form of a word (ויעש, ויעשו, עשה ...) separately, in biblical order, with
// quotation lines first and, for busy forms, compact reference lists after them.
async function findInEntry(word, ref){
  const r=lexById(word.id), doc=pdf; if(!r||!doc||!window.ESRefs) return null;
  const id=r.s+'|'+word.w+'|'+ref.book+' '+ref.ch+':'+ref.vs; if(FOUND.has(id)) return FOUND.get(id);
  const pages=entryPages(lemmaOf(r)); if(!pages.length) return null;
  const form=ESRefs.ckey(word.w), lines=[];
  for(const p of pages){
    const ls=await ESRefs.lineRefs(doc,p.idx);
    if(doc!==pdf) return null;                 // another PDF was opened meanwhile
    for(const ln of ls) lines.push({...ln,page:p.page});
  }
  const span=[pages[0].page,pages[pages.length-1].page];
  // the word's own form on this line or on the lines before it in the same list; a list ends where
  // biblical order starts again (a reference several books later than the ones after it).
  const pos=ln=>ln.refs.filter(x=>x.ch&&x.vs&&BOOKPOS.has(x.book)).map(x=>vpos(x.book,x.ch,x.vs));
  // A form's quotation lines are followed by a compact list of its other references, which starts again
  // from Genesis; so a restart into a compact list is the same form, a restart into a quotation line is not.
  const near=li=>{
    let low=Infinity, lowQ=true;
    for(let j=li;j>=Math.max(0,li-25);j--){
      const ps=pos(lines[j]);
      if(j<li&&ps.length&&Math.max(...ps)>low+3e6){       // jumps back over 3+ books: a garbled reference does not
        if(lowQ) break;
        low=Infinity;
      }
      if(lines[j].words.includes(form)) return li-j;
      if(ps.length&&Math.min(...ps)<low){ low=Math.min(...ps); lowQ=lines[j].refs.length<2; }   // one reference: a quotation
    }
    return 99;
  };
  // the verse has this word twice in different forms (יְהִי and וַיְהִי in Gen 1:3), so it is quoted in two lists
  const twin=(ESVerse.words(ref)||[]).some(x=>x.id===word.id&&ESRefs.ckey(x.w)!==form);
  const T=vpos(ref.book,ref.ch,ref.vs);
  let res=null;
  // 1. the reference read in full; the one nearest to this word's form wins. It counts as found (✓) when it
  //    is the only one or the form clearly picks it, and, for a twin, only when the form is seen in its list
  const hits=[]; lines.forEach((ln,li)=>{ if(ln.refs.some(x=>x.book===ref.book&&x.ch===ref.ch&&x.vs===ref.vs)) hits.push(li); });
  if(hits.length){
    const s=hits.map(li=>[near(li),li]).sort((a,b)=>a[0]-b[0]);
    const clear=s.length===1||s[0][0]<s[1][0];
    res={li:s[0][1], exact:clear&&(!twin||s[0][0]<99)};
  }
  else {
    // 2. otherwise the tightest pair of readable references around the verse, in the word's own list
    const seq=[]; lines.forEach((ln,li)=>ln.refs.forEach(x=>{ if(x.ch&&x.vs&&BOOKPOS.has(x.book)) seq.push({p:vpos(x.book,x.ch,x.vs),li}); }));
    const cands=[];
    for(let k=0;k+1<seq.length;k++){
      const a=seq[k], b=seq[k+1], gap=b.p-a.p; if(!(a.p<T&&T<b.p)||gap>=4e6||b.li-a.li>12) continue;
      let book=false; for(let j=a.li;j<=b.li;j++) if(lines[j].refs.some(x=>x.book===ref.book&&(!x.ch||x.ch===ref.ch))) book=true;
      const nr=near(a.li)<99;
      if(!nr&&!(book&&gap<1e6)) continue;     // no sign that this is the word's own list
      const score=(nr?0:1e8)+(book?0:5e6)+gap;
      cands.push({score,a,b});
    }
    for(const {a,b} of cands.sort((x,y)=>x.score-y.score)){
      // lines between the two that may hold the verse: unreadable, or this book with the chapter or verse unread
      const fits=ln=>!ln.refs.length||ln.refs.some(x=>x.book===ref.book&&(!x.ch||x.ch===ref.ch)&&(!x.vs||x.vs===ref.vs));
      const gap=lines.slice(a.li+1,b.li).filter(fits);
      if(a.li===b.li) res={li:a.li};                                   // inside one compact list line
      else if(gap.length){                                             // unreadable lines between the two
        res=gap.length===1?{li:lines.indexOf(gap[0])}:{li:lines.indexOf(gap[0]), li2:lines.indexOf(gap[gap.length-1])};
      }
      // two neighbouring quotation lines with nothing between them: the verse is not in this list
      else if(!(lines[a.li].q&&lines[b.li].q&&lines[a.li].refs.filter(x=>x.ch&&x.vs).length===1)) res={li:a.li, li2:b.li};
      if(res){ res.exact=false; break; }
    }
  }
  if(res){
    const A=lines[res.li], B=res.li2!=null?lines[res.li2]:A;
    const y2=B.page===A.page&&B.col===A.col?B.y:A.y;
    res={page:A.page, col:A.col, y:A.y, y2, exact:res.exact, pages:span};
  }
  FOUND.set(id,res||{pages:span}); return FOUND.get(id);
}
let verseRef=null;
// verse view options: interlinear (literal English + grammar under each word) and the user's own Bible translations
const VOPT={il:false, tr:false}; try{ Object.assign(VOPT,JSON.parse(localStorage.getItem('es-vopt')||'{}')); }catch(e){}
const saveVopt=()=>{ try{ localStorage.setItem('es-vopt',JSON.stringify(VOPT)); }catch(e){} };
const rerender=()=>{ if(verseRef) render($('q').value); };
function interlinearHtml(ref){
  const ws=ESVerse.interlinear(ref);
  if(!ws){ ESVerse.loadExtra().then(rerender,()=>{}); return `<div class="meta il-wait">${T('loading')}</div>`; }
  return `<div class="il he" dir="rtl">${ws.map(x=>{
    const m=ESMorph.describe(x.morph), r=lexById(x.id);
    const lt=LANG==='lt'&&r&&r.lt?`<div class="iwl">${esc(r.lt)}</div>`:'';
    return `<div class="iw"><div class="iwh">${esc(x.w)}</div><div class="iwg" dir="ltr">${esc(x.gloss||'–')}</div>${lt}<div class="iwm" dir="ltr" title="${esc(m.long)}">${esc(m.short)}</div></div>`;
  }).join('')}</div>`;
}
function translationsHtml(ref){
  const out=[], list=ESTrans.list();
  for(const t of ESTrans.verse(ref)){
    const own=t.ref?' · '+t.ref.split(',').map(x=>LANG==='lt'?x.replace(':',', '):x).join('; '):'';
    out.push(`<div class="trv"><div class="trn">${esc(t.title)}${esc(own)}</div><div>${t.text?esc(t.text):`<span class="meta">${T('trNoText')}</span>`}</div></div>`);
  }
  out.push(`<div class="trlist">${list.map(t=>`<label class="trrow" title="${esc(t.file)}"><input type="checkbox" data-tr="${esc(t.id)}"${t.on?' checked':''}> ${esc(t.title)} <button class="trdel" data-del="${esc(t.id)}" title="${T('trRemove')}">✕</button></label>`).join('')}
    <button class="tradd" type="button">${T('trAdd')}</button>${list.length?'':`<div class="meta">${T('trHint')}</div>`}</div>`);
  return out.join('');
}
function renderVerse(ref){
  const ws=ESVerse.words(ref); verseRef=ws?ref:null;
  if(!ws) return `<div class="sec">${T('noVerse',{ref:esc(ESVerse.label(ref))})}</div>`;
  const out=[`<div class="sec vhead"><button class="vstep" data-d="-1" title="${T('prevVerse')}">‹</button><span>${esc(ESVerse.label(ref))}</span><button class="vstep" data-d="1" title="${T('nextVerse')}">›</button></div>`,
    `<div class="verse he" dir="rtl">${ws.map(x=>esc(x.w)).join(' ').replace(/־ /g,'־')}</div>`,
    `<div class="vopts"><label title="${T('optIlTip')}"><input type="checkbox" data-opt="il"${VOPT.il?' checked':''}> ${T('optIl')}</label><label><input type="checkbox" data-opt="tr"${VOPT.tr?' checked':''}> ${T('optTr')}</label></div>`];
  if(VOPT.il) out.push(interlinearHtml(ref));
  if(VOPT.tr) out.push(translationsHtml(ref));
  out.push(`<div class="sec">${T('verseConc')}</div><div class="vconc" id="vconc">${pdf?T('verseLooking'):T('verseNeedPdf')}</div>`);
  ws.forEach((x,i)=>{ const r=lexById(x.id); if(r) out.push(wordRow(x.w.replace(/־$/,''),r,'',i)); });
  out.push(`<div class="vconc legend" id="vlegend" hidden>${T('verseLegend')}</div>`);
  return out.join('');
}
// find each word's line for the verse, one word after another, and fill in the pages as they come
let locSeq=0;
async function locateVerse(ref){
  const seq=++locSeq, ws=ESVerse.words(ref)||[], pages=new Map();
  const mark=f=>`data-p="${f.page}" data-col="${f.col}" data-y="${f.y}" data-y2="${f.y2}"${f.exact?'':' data-approx="1"'}`;
  const summary=done=>{
    const box=$('vconc'); if(!box) return;
    const chips=[...pages.values()].sort((a,b)=>a.page-b.page).map(f=>
      `<button class="vpg${f.exact?'':' approx'}" ${mark(f)} title="${T(f.exact?'foundTip':'approxTip')}">${f.exact?'':'≈ '}${f.page}</button>`).join('');
    box.innerHTML=(done?'':`<div>${T('verseLooking')}</div>`)+(chips?`<div>${T('versePages')}</div><div class="vpgs">${chips}</div>`:'');
    if(done&&$('vlegend')) $('vlegend').hidden=false;
  };
  for(const [i,x] of ws.entries()){
    const row=document.querySelector(`.res[data-w="${i}"]`); if(!row) continue;
    let f=null; try{ f=await findInEntry(x,ref); }catch(e){}
    if(seq!==locSeq) return;
    if(!f) continue;
    const pg=row.querySelector('.pg');
    if(f.page){
      Object.assign(row.dataset,{p:f.page,col:f.col,y:f.y,y2:f.y2}); if(!f.exact) row.dataset.approx=1; row.title=T(f.exact?'foundTip':'approxTip');
      pg.textContent=(f.exact?'✓ ':'≈ ')+T('pAbbr')+' '+f.page; pg.classList.toggle('approx',!f.exact);
      const e=pages.get(f.page); if(!e||!e.exact&&f.exact) pages.set(f.page,f);
    } else {
      const [a,b]=f.pages; row.title=T('entryTip'); pg.classList.add('entry');
      pg.textContent=a===b?T('pAbbr')+' '+a:`${T('pAbbr')} ${a}–${b}`;
    }
    summary(false);
  }
  summary(true);
}
// open a result: with a found line, its column with the line highlighted
function openHit(el){
  const d=el.dataset;
  if(d.y) show(+d.p, +d.col, {y:+d.y, y2:+d.y2, approx:!!d.approx}); else show(+d.p);
}
ESTrans.onChange(rerender); ESTrans.ready.then(rerender);
$('trFile').onchange=async e=>{
  const files=[...e.target.files]; e.target.value=''; if(!files.length) return;
  const b=document.querySelector('.tradd'); if(b){ b.disabled=true; b.textContent=T('loading'); }
  const errs=await ESTrans.addFiles(files);
  if(errs.length) alert(T('trError')+'\n'+errs.join('\n'));
  rerender();
};
$('results').addEventListener('change',e=>{
  const o=e.target.dataset.opt, t=e.target.dataset.tr;
  if(o){ VOPT[o]=e.target.checked; saveVopt(); rerender(); }
  else if(t) ESTrans.toggle(t,e.target.checked);
});
function render(q){
  const {lex,direct,verse,forms}=search(q), out=[];
  if(verse){ $('results').innerHTML=renderVerse(verse); if(verseRef&&pdf) locateVerse(verseRef); return; }
  verseRef=null;
  if(forms&&forms.length){
    out.push(`<div class="sec">${T('inBible')}</div>`);
    for(const f of forms.slice(0,12)) out.push(wordRow(f.forms[0]||q, f.r, T('times',{n:f.n})+(f.forms.length>1?' · '+f.forms.slice(1).map(esc).join(', '):'')));
  }
  if(direct){
    let b=direct.page?BYPAGE.get(nearest(direct.page)):pageFor(direct.heb);
    if(b){
      out.push(`<div class="sec">${T('goTo')}</div><button class="res" data-p="${b.page}"><div class="top"><span class="heb he">${esc(direct.heb||'')}</span><span class="meta">${direct.heb?T('alpha'):''}</span><span class="pg">${T('pAbbr')} ${b.page}</span></div><div class="meta">${T('pageRuns')} <span class="he">${esc(b.first)}</span> → <span class="he">${esc(b.last)}</span></div></button>`);
    } else if(direct.page) out.push(`<div class="sec">${T('noPage',{p:direct.page,a:MINPAGE,b:MAXPAGE})}</div>`);
  }
  if(lex.length){
    out.push(`<div class="sec">${T(lex.length>1?'matchesN':'matches1',{n:lex.length})}</div>`);
    for(const r of lex){
      const b=pageFor(r.h);
      out.push(`<button class="res" data-p="${b?b.page:''}"><div class="top"><span class="heb he">${esc(r.h)}</span><span class="tr">${esc(r.t)}</span><span class="pg">${b?T('pAbbr')+' '+b.page:''}</span></div><div>${glossHtml(r)} <span class="meta">· ${esc(r.s)} · ${esc(r.p)}</span></div><div class="df">${esc(r.d)}</div></button>`);
    }
  } else if(q.trim() && !direct && !(forms&&forms.length)) out.push(`<div class="sec">${T('noMatches')}</div>`);
  $('results').innerHTML=out.join('');
}
$('q').addEventListener('input',e=>render(e.target.value));
$('q').addEventListener('keydown',e=>{ if(e.key==='Enter'){const f=$('results').querySelector('.res[data-p]:not([data-p=""])'); if(f) f.click();} });
$('results').addEventListener('click',e=>{
  if(e.target.closest('.tradd')){ $('trFile').click(); return; }
  const del=e.target.closest('.trdel');
  if(del){ e.preventDefault(); if(confirm(T('trRemoveAsk'))) ESTrans.remove(del.dataset.del); return; }
  const s=e.target.closest('.vstep');
  if(s){ const r=verseRef&&ESVerse.step(verseRef,+s.dataset.d); if(r){ const q=$('q'); q.value=ESVerse.label(r); render(q.value); } return; }
  const v=e.target.closest('.vpg'); if(v){ openHit(v); return; }
  const b=e.target.closest('.res'); if(!b||!b.dataset.p) return;
  document.querySelectorAll('.res.on').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  openHit(b);
});
// Hebrew keypad: letters, then vowel points (optional: they narrow Bible word forms to that vocalisation)
const LET='אבגדהוזחטיכלמנסעפצקרשת'.split('').concat(['⌫']);
const PTS=['ְ','ֱ','ֲ','ֳ','ִ','ֵ','ֶ','ַ','ָ','ֹ','ֻ','ּ','ׁ','ׂ'];
$('kbd').innerHTML=LET.map(c=>`<button class="he" type="button" data-c="${c}">${c}</button>`).join('')
  // each point is shown on a sample letter (dagesh on ב, shin/sin dots on ש); only the point is typed
  +PTS.map(c=>`<button class="he pt" type="button" data-c="${c}" title="${T('point')}">${c==='ּ'?'ב':c>'׀'?'ש':'א'}${c}</button>`).join('');
$('kbd').addEventListener('click',e=>{const c=e.target.closest('button'); if(!c) return; const q=$('q');
  q.value = c.dataset.c==='⌫' ? [...q.value].slice(0,-1).join('') : q.value+c.dataset.c; render(q.value); q.focus();});

// ---------- viewer ----------
// Each view (a whole page, or one column of it) is rendered once into `raw`, then painted onto the
// visible canvas through the optional clean-paper / dark filter. Nothing is ever thresholded to
// pure black and white, so vowel points and dagesh survive at every setting.
let pdf=null, cur=null, col=null, zoomMul=1, renderTask=null, renderSeq=0, view=null;
const raw=document.createElement('canvas');
const VIEW={clean:false,strength:60,dark:false,loupe:false,eng:false};
try{ Object.assign(VIEW,JSON.parse(localStorage.getItem('es-view')||'{}')) }catch(e){}
const saveView=()=>{ try{ localStorage.setItem('es-view',JSON.stringify(VIEW)) }catch(e){} };
const DPR=()=>window.devicePixelRatio||1;
function setHeads(b){ $('heads').innerHTML = !b?'':b.title?`<span dir="ltr" style="font:600 14px system-ui">${esc(b.title)}</span>`:`${esc(b.first)} <span style="color:var(--mute)">…</span> ${esc(b.last)}`; }

// --- pixel filter: grayscale, levels from this page's own histogram, gentle gamma; optional dark ---
function filterInto(src, dst){
  dst.width=src.width; dst.height=src.height;
  const ctx=dst.getContext('2d'); ctx.drawImage(src,0,0);
  if(!VIEW.clean && !VIEW.dark) return;
  const img=ctx.getImageData(0,0,dst.width,dst.height), d=img.data, n=d.length;
  const hist=new Uint32Array(256);
  for(let i=0;i<n;i+=4) hist[(d[i]*77+d[i+1]*150+d[i+2]*29)>>8]++;
  const pct=q=>{ const t=q*(n/4); let a=0; for(let v=0;v<256;v++){ a+=hist[v]; if(a>=t) return v; } return 255; };
  const s=VIEW.clean?VIEW.strength/100:0;
  // paper (the page's 60th percentile and lighter) reaches pure white by mid strength; ink deepens gradually
  const k=Math.min(1,s*1.7), lo=pct(.02)*s, hi=255-(255-pct(.6)*.97)*k, gamma=1+.7*s;
  const lut=new Uint8ClampedArray(256*3);
  for(let v=0;v<256;v++){
    let x=Math.min(1,Math.max(0,(v-lo)/Math.max(1,hi-lo)));
    x=Math.pow(x,gamma);                       // 0 = ink, 1 = paper
    if(VIEW.dark){ lut[v*3]=27+(232-27)*(1-x); lut[v*3+1]=26+(226-26)*(1-x); lut[v*3+2]=24+(214-24)*(1-x); }
    else lut[v*3]=lut[v*3+1]=lut[v*3+2]=x*255;
  }
  for(let i=0;i<n;i+=4){ const v=((d[i]*77+d[i+1]*150+d[i+2]*29)>>8)*3; d[i]=lut[v]; d[i+1]=lut[v+1]; d[i+2]=lut[v+2]; }
  ctx.putImageData(img,0,0);
}
function repaint(){
  const cv=$('cv'); if(!raw.width) return; filterInto(raw,cv); cv.style.background=VIEW.dark?'#1b1a18':'#fff'; hires=null;
  if(VIEW.eng&&view&&view.refs) ESRefs.drawOverlay(cv, view.refs, view.x0, view.s*DPR(), VIEW.dark, view.zones);
  if(view&&view.mark) markLine(cv, view.mark, view.s*DPR());
}
// a soft band across the column on the found line (the line itself stays readable); fainter when approximate
function markLine(cv, m, sc){
  const ctx=cv.getContext('2d'); ctx.save(); ctx.globalCompositeOperation=VIEW.dark?'screen':'multiply'; if(m.approx) ctx.globalAlpha=.5;
  ctx.fillStyle=VIEW.dark?'#5a4a10':'#ffe27a'; const y2=Math.max(m.y,m.y2||m.y);
  ctx.fillRect(0,Math.round((m.y-8.5)*sc),cv.width,Math.round((y2-m.y+11)*sc)); ctx.restore();
}
// English references: load this page's overlay list once, then repaint
async function loadRefs(){ if(!VIEW.eng||!view||view.refs||!window.ESRefs) return; const v=view;
  const b=BYPAGE.get(v.page), e=await columnsFor(b), W=(await pdf.getPage(b.idx+1)).getViewport({scale:1}).width;
  // the reference area is the left ~40% of each column
  v.zones=[0,1,2].map(k=>[e[k]*W, (e[k]+(e[k+1]-e[k])*.42)*W]);
  v.refs=await ESRefs.pageRefs(pdf, b.idx); if(v===view) repaint(); }

// --- column detection: the three columns are separated by thin vertical rules ---
const COLS=new Map();   // printed page -> [x0,x1,x2,x3] as fractions of page width, left to right
async function columnsFor(b){
  if(COLS.has(b.page)) return COLS.get(b.page);
  const p=await pdf.getPage(b.idx+1), base=p.getViewport({scale:1}), sc=700/base.width;
  const vp=p.getViewport({scale:sc}), c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
  await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
  const W=c.width, H=c.height, d=c.getContext('2d').getImageData(0,0,W,H).data;
  const y0=Math.round(H*.1), y1=Math.round(H*.95), rows=y1-y0, ink=new Float32Array(W);
  for(let x=0;x<W;x++){ let k=0; for(let y=y0;y<y1;y++){ const i=(y*W+x)*4; if(d[i]*77+d[i+1]*150+d[i+2]*29<140*256) k++; } ink[x]=k/rows; }
  const has=x=>ink[x]>.02;
  let L=0; while(L<W-1&&!has(L)) L++;
  let R=W-1; while(R>0&&!has(R)) R--;
  // a rule is dark on most rows; without one, take the emptiest gap in that part of the page
  const pick=(a,b)=>{ let best=-1,bx=Math.round((a+b)/2);
    for(let x=Math.round(a);x<Math.round(b);x++) if(ink[x]>.45&&ink[x]>best){best=ink[x];bx=x}
    if(best<0){ let lo=2; for(let x=Math.round(a);x<Math.round(b);x++){ const v=(ink[x-1]+ink[x]+ink[x+1])/3; if(v<lo){lo=v;bx=x} } }
    return bx; };
  const w=R-L, g1=pick(L+w*.22,L+w*.45), g2=pick(L+w*.55,L+w*.78);
  const pad=w*.008, e=[Math.max(0,L-pad),g1,g2,Math.min(W,R+pad)].map(x=>x/W);
  COLS.set(b.page,e); return e;
}
// reading order is right to left: column 0 is the rightmost
const colRange=(e,k)=>[e[2-k],e[3-k]];

// mark = {y} in page points: a line to highlight and scroll to (a verse found in an entry)
async function show(page, c=null, mark=null){
  if(page>0) page=Math.max(MINPAGE,Math.min(MAXPAGE,page));   // negative = front/back matter (contents.js)
  const b=BYPAGE.get(page); cur=page; col=c; $('pg').value=page>0?page:''; setHeads(b);
  if(window.onShowPage) onShowPage(page);
  try{ if(page>0) localStorage.setItem('es-page',page) }catch(e){}
  updateColUI();
  if(!pdf||!b) return;
  const seq=++renderSeq;
  const p=await pdf.getPage(b.idx+1), stage=$('stage'), cv=$('cv');
  const base=p.getViewport({scale:1});
  let x0=0, x1=base.width;
  if(col!=null){ const e=await columnsFor(b); [x0,x1]=colRange(e,col).map(f=>f*base.width); }
  if(seq!==renderSeq) return;
  const s=(stage.clientWidth-28)/(x1-x0)*zoomMul;
  const vp=p.getViewport({scale:s*DPR(),offsetX:-x0*s*DPR()});
  if(renderTask) try{renderTask.cancel()}catch(e){}
  raw.width=Math.round((x1-x0)*s*DPR()); raw.height=Math.round(vp.height);
  view={page,col,x0,x1,s,h:base.height,mark};
  cv.hidden=false; $('empty').hidden=true; cv.classList.add('busy');
  renderTask=p.render({canvasContext:raw.getContext('2d'),viewport:vp});
  try{ await renderTask.promise; }catch(e){ return; }
  if(seq!==renderSeq) return;
  repaint(); cv.style.width=(raw.width/DPR())+'px'; cv.classList.remove('busy');
  stage.scrollTop=mark?Math.max(0,mark.y*s-stage.clientHeight/3):0;
  loadRefs();
}

// step over pages that are blank, section dividers or missing from the scan
function nextPage(p,d){ p+=d; while(p>=MINPAGE&&p<=MAXPAGE&&!BYPAGE.has(p)) p+=d; return BYPAGE.has(p)?p:null; }
function step(d){ if(cur<0&&window.stepExtra) return stepExtra(d); const p=nextPage(cur,d); if(p) show(p, col==null?null:(d>0?0:2)); }
function stepCol(d){
  if(col==null) return;
  const k=col+d;
  if(k>=0&&k<=2) return show(cur,k);
  const p=nextPage(cur,d>0?1:-1); if(p) show(p,d>0?0:2);
}
function nearest(p){ for(let d=0;d<30;d++){ if(BYPAGE.has(p+d)) return p+d; if(BYPAGE.has(p-d)) return p-d; } return MINPAGE; }
$('prev').onclick=()=>cur&&step(-1);
$('next').onclick=()=>cur&&step(1);
$('pg').onchange=e=>show(nearest(+e.target.value),col);
$('zin').onclick=()=>{zoomMul*=1.25;show(cur,col)};
$('zout').onclick=()=>{zoomMul/=1.25;show(cur,col)};
$('zfit').onclick=()=>{zoomMul=1;show(cur,col)};

// --- toolbar toggles ---
let picking=false;
function updateColUI(){
  $('cols').classList.toggle('on',picking||col!=null);
  $('stage').classList.toggle('picking',picking);
  for(const id of ['colPrev','colNext','colInfo']) $(id).hidden=col==null;
  if(col!=null) $('colInfo').textContent=T('colInfo',{k:col+1});
  $('cols').textContent=col!=null?T('wholePage'):picking?T('colsPick'):T('cols');
}
function syncToggles(){
  $('clean').classList.toggle('on',VIEW.clean); $('dark').classList.toggle('on',VIEW.dark);
  $('loupeBtn').classList.toggle('on',VIEW.loupe); $('engBtn').classList.toggle('on',VIEW.eng); $('strength').value=VIEW.strength; $('strength').disabled=!VIEW.clean;
}
$('clean').onclick=()=>{VIEW.clean=!VIEW.clean;saveView();syncToggles();repaint()};
$('dark').onclick=()=>{VIEW.dark=!VIEW.dark;saveView();syncToggles();repaint()};
$('engBtn').onclick=()=>{VIEW.eng=!VIEW.eng;saveView();syncToggles();repaint();loadRefs()};
let sT; $('strength').oninput=e=>{VIEW.strength=+e.target.value;saveView();clearTimeout(sT);sT=setTimeout(repaint,60)};
$('cols').onclick=()=>{ if(col!=null){picking=false;show(cur,null);} else {picking=!picking;updateColUI();} };
$('colPrev').onclick=()=>stepCol(-1);
$('colNext').onclick=()=>stepCol(1);
$('loupeBtn').onclick=()=>{VIEW.loupe=!VIEW.loupe;saveView();syncToggles();if(!VIEW.loupe)hideLoupe()};
$('cv').addEventListener('click',async e=>{
  if(!picking||!view||view.col!=null) return;
  const b=BYPAGE.get(cur), e4=await columnsFor(b), r=$('cv').getBoundingClientRect();
  const fx=(e.clientX-r.left)/r.width;
  const k=fx>=e4[2]?0:fx>=e4[1]?1:2;
  picking=false; show(cur,k);
});
syncToggles();

// --- magnifier: a separate high-resolution render of the same view (about the scan's native 350 dpi) ---
let hires=null, hiresBusy=null, shiftDown=false, lastMouse=null;
const hiresKey=()=>JSON.stringify([view.page,view.col,view.s,VIEW.clean,VIEW.strength,VIEW.dark,VIEW.eng&&!!view.refs]);
async function ensureHires(){
  const key=hiresKey();
  if(hires&&hires.key===key) return hires;
  if(hiresBusy) return hiresBusy;
  const v=view;
  hiresBusy=(async()=>{
    try{
      const p=await pdf.getPage(BYPAGE.get(v.page).idx+1), base=p.getViewport({scale:1});
      let s=Math.max(350/72, v.s*DPR()*2);
      s=Math.min(s, Math.sqrt(24e6/((v.x1-v.x0)*base.height)));   // keep under ~24 Mpx
      const vp=p.getViewport({scale:s,offsetX:-v.x0*s}), c=document.createElement('canvas');
      c.width=Math.round((v.x1-v.x0)*s); c.height=Math.round(vp.height);
      await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const out=document.createElement('canvas'); filterInto(c,out);
      if(VIEW.eng&&v.refs) ESRefs.drawOverlay(out, v.refs, v.x0, s, VIEW.dark, v.zones);
      hires={key,canvas:out}; return hires;
    } finally { hiresBusy=null; }
  })();
  return hiresBusy;
}
const loupe=$('loupe');
function hideLoupe(){ loupe.hidden=true; $('stage').classList.remove('looking'); }
function drawLoupe(ev){
  const cv=$('cv'), r=cv.getBoundingClientRect();
  if(!view||cv.hidden||ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom) return hideLoupe();
  const fx=(ev.clientX-r.left)/r.width, fy=(ev.clientY-r.top)/r.height, size=300, dpr=DPR();
  if(loupe.width!==size*dpr){ loupe.width=loupe.height=size*dpr; }
  loupe.style.left=(ev.clientX-size/2)+'px'; loupe.style.top=(ev.clientY-size/2)+'px';
  loupe.hidden=false; $('stage').classList.add('looking');
  const ctx=loupe.getContext('2d'), w=loupe.width;
  ctx.fillStyle=VIEW.dark?'#1b1a18':'#fff'; ctx.fillRect(0,0,w,w);
  const src=hires&&hires.key===hiresKey()?hires.canvas:null;
  if(src) ctx.drawImage(src,fx*src.width-w/2,fy*src.height-w/2,w,w,0,0,w,w);
  else {
    const q=w/2.5; ctx.drawImage(cv,fx*cv.width-q/2,fy*cv.height-q/2,q,q,0,0,w,w);
    ensureHires().then(()=>{ if(lastMouse&&(VIEW.loupe||shiftDown)) drawLoupe(lastMouse); }).catch(()=>{});
  }
}
document.addEventListener('mousemove',e=>{ lastMouse=e; shiftDown=e.shiftKey; if(VIEW.loupe||e.shiftKey) drawLoupe(e); else if(!loupe.hidden) hideLoupe(); refTip(e); });

// --- Bible-reference tooltips (see refs.js) ---
const tip=$('reftip'); let tipSeq=0;
async function refTip(ev){
  const seq=++tipSeq, cv=$('cv'), r=cv.getBoundingClientRect();
  if(!pdf||!view||cv.hidden||!window.ESRefs||ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom){ tip.hidden=true; return; }
  const x=view.x0+(ev.clientX-r.left)/r.width*(view.x1-view.x0), y=(ev.clientY-r.top)/r.height*view.h;
  const refs=await ESRefs.refsAt(pdf, BYPAGE.get(view.page).idx, x, y);
  if(seq!==tipSeq) return;
  if(!refs.length){ tip.hidden=true; return; }
  const f=refs[0];
  tip.innerHTML=`<span class="he">${esc(f.heb)}</span>${esc(ESRefs.fullRef(f))}`;
  const big=!loupe.hidden?160:14;
  tip.style.left=Math.min(innerWidth-tip.offsetWidth-8, ev.clientX+big)+'px'; tip.style.top=(ev.clientY+big)+'px';
  tip.hidden=false;
}
document.addEventListener('keyup',e=>{ if(e.key==='Shift'){ shiftDown=false; if(!VIEW.loupe) hideLoupe(); } });
$('stage').addEventListener('scroll',()=>{ if(lastMouse&&!loupe.hidden) drawLoupe(lastMouse); });

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  if(e.key==='Shift'){ shiftDown=true; if(lastMouse) drawLoupe(lastMouse); return; }
  if(col!=null&&e.key==='ArrowLeft'){ e.preventDefault(); return stepCol(1); }     // RTL: leftwards = onwards
  if(col!=null&&e.key==='ArrowRight'){ e.preventDefault(); return stepCol(-1); }
  if(e.key==='ArrowLeft') $('prev').click();
  if(e.key==='ArrowRight') $('next').click();
  if(e.key==='/'){ e.preventDefault(); $('q').focus(); }
  if(e.key==='Escape'){ picking=false; if(col!=null) show(cur,null); else updateColUI(); }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const k=e.key.toLowerCase();
  if(k==='c') $('clean').click();
  if(k==='d') $('dark').click();
  if(k==='k') $('cols').click();
  if(k==='m') $('loupeBtn').click();
  if(k==='e') $('engBtn').click();
});
let rz; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(()=>cur&&show(cur,col),200); });

// ---------- opening the PDF ----------
// Desktop app (Tauri): native file dialog, the path is remembered and the PDF is streamed from disk.
// Plain browser: file picker; Chrome/Edge remember the file handle in IndexedDB.
const TAURI = window.__TAURI__;
const BTN = $('openBtn');
function opened(){ BTN.textContent=T('change'); BTN.classList.remove('primary'); COLS.clear(); hires=null; FOUND.clear(); if(window.ESRefs) ESRefs.clear(); show(cur||MINPAGE); if(verseRef) render($('q').value); }
async function load(src, label){
  BTN.textContent=T('loading');
  try{
    pdf=await pdfjsLib.getDocument(src).promise;
    if(EXPECTED_PAGES && pdf.numPages!==EXPECTED_PAGES) alert(T('pageCount',{n:pdf.numPages,m:EXPECTED_PAGES}));
    opened(); return true;
  }catch(e){
    BTN.textContent=T('open'); BTN.classList.add('primary');
    alert(T('cantOpen',{what:label||T('thePdf'),err:e.message})); return false;
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
    let path=null; try{path=localStorage.getItem('es-pdf-path')}catch(e){}
    if(path) openPath(path);
    return;
  }
  const h=await loadHandle();
  if(h&&h.queryPermission){
    BTN.textContent=T('reopen',{name:h.name.length>24?h.name.slice(0,22)+'…':h.name});
    BTN.onclick=async()=>{ try{ if(await h.requestPermission({mode:'read'})==='granted'){ BTN.onclick=pick; return openFile(await h.getFile()); } }catch(e){} $('file').click(); };
  }
})();
$('q').focus();
