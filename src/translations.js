// Bible translations the user adds from their own MyBible modules (*.SQLite3). They are read on this
// computer with sql.js, lined up with the Hebrew verse numbering and kept in IndexedDB; nothing is uploaded
// and no translation text ships with the app. Loaded after verses.js, before app.js.
(function(){
const BIB=window.ES_BIBLE||{}, BOOKS=Object.keys(BIB);
// MyBible book numbers of the 39 books, in the order of data/bible.js (Genesis … Malachi)
const MB=[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,190,220,230,240,250,260,290,300,310,330,340,
  350,360,370,380,390,400,410,420,430,440,450,460];
const DBN='es-bibles';
const db=()=>new Promise((res,rej)=>{ const r=indexedDB.open(DBN,1); r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id'}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const store=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{ const t=d.transaction('t',mode), q=fn(t.objectStore('t')); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));

let LIST=[];          // [{id, title, file, verses:{book:[[text]]}, refs:{book:{"c:v":"c:v,…"}}}]
let ON=[]; try{ ON=JSON.parse(localStorage.getItem('es-tr-on')||'[]'); }catch(e){}
const saveOn=()=>{ try{ localStorage.setItem('es-tr-on',JSON.stringify(ON)); }catch(e){} };
let changed=()=>{};
const ready=store('readonly',s=>s.getAll()).then(all=>{ LIST=(all||[]).sort((a,b)=>a.title.localeCompare(b.title)); }).catch(()=>{});

// MyBible markup: <f> footnote markers, <S>/<m> Strong's and morphology, <n> notes, <h> headings are left out
const clean=t=>(t||'').replace(/<(f|S|m|n|h)>[\s\S]*?<\/\1>/g,'').replace(/<(br|pb)\s*\/?>/g,' ').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

// Each translation numbers verses either as the Hebrew Bible does or as English Bibles do (Gen 31:55,
// Mal 4, psalm titles...), and often mixes the two book by book. For every Hebrew chapter that the two
// schemes number differently, the scheme whose chapter lengths match the translation is used.
function lineUp(mod){
  const V2E=window.ES_V2E||{}, verses={}, refs={};
  BOOKS.forEach((book,bi)=>{
    const m=mod.get(MB[bi]); if(!m) return;
    const heb=BIB[book], map=V2E[book]||{}, H={}, E={}, M={};
    heb.forEach((vv,c)=>{ H[c+1]=vv.length; });
    const tgt=(c,v)=>(map[c+':'+v]||c+':'+v).split(',').map(x=>x.split(':').map(Number));
    heb.forEach((vv,c)=>vv.forEach((_,v)=>tgt(c+1,v+1).forEach(([ec,ev])=>{ if(ev>0) E[ec]=Math.max(E[ec]||0,ev); })));
    for(const [c,vs] of m) M[c]=Math.max(...vs.keys());
    const fit=(chs,n)=>{ chs=[...chs]; return chs.filter(c=>M[c]===n[c]).length/(chs.length||1); };
    verses[book]=heb.map((vv,c)=>{
      c++;
      let eng=false;
      if(Object.keys(map).some(k=>k.startsWith(c+':'))){
        const es=new Set(); vv.forEach((_,v)=>tgt(c,v+1).forEach(([ec,ev])=>{ if(ev>0) es.add(ec); }));
        eng=fit(es,E)>fit([c],H);
      }
      // a chapter the translation joins to the one before (Luther's Joel 3 = Hebrew Joel 3 + 4)
      const joined=!eng&&!M[c]&&M[c-1]===H[c-1]+H[c];
      return vv.map((_,v)=>{
        v++;
        const t=joined?[[c-1,H[c-1]+v]]:eng?tgt(c,v):[[c,v]];
        if(joined) (refs[book]=refs[book]||{})[c+':'+v]=t[0].join(':');
        if(eng&&map[c+':'+v]) (refs[book]=refs[book]||{})[c+':'+v]=map[c+':'+v];
        return t.map(([ec,ev])=>(m.get(ec)||new Map()).get(ev)||'').filter(Boolean).join(' ');
      });
    });
  });
  return {verses, refs};
}

let SQL=null;
async function add(file){
  await window.ESVerse.need('vendor/sql-wasm.js','data/versemap.js');
  SQL=SQL||await initSqlJs({locateFile:f=>'vendor/'+f});
  const d=new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  try{
    let info={}; try{ info=Object.fromEntries(d.exec('select name,value from info')[0].values); }catch(e){}
    const rows=(d.exec('select book_number,chapter,verse,text from verses where book_number<=460')[0]||{}).values||[];
    if(!rows.length) throw new Error('no Old Testament verses');
    const mod=new Map();
    for(const [b,c,v,t] of rows){ let bk=mod.get(b); if(!bk) mod.set(b,bk=new Map()); let ch=bk.get(c); if(!ch) bk.set(c,ch=new Map()); ch.set(v,clean(t)); }
    const id=file.name.replace(/\.(sqlite3?|db)$/i,'').toLowerCase();
    const t={id, file:file.name, title:(info.description||file.name).trim(), ...lineUp(mod)};
    await store('readwrite',s=>s.put(t));
    LIST=LIST.filter(x=>x.id!==id).concat(t).sort((a,b)=>a.title.localeCompare(b.title));
    if(!ON.includes(id)){ ON.push(id); saveOn(); }
    return t;
  } finally { d.close(); }
}
async function addFiles(files){
  const errs=[];
  for(const f of files){ try{ await add(f); }catch(e){ errs.push(f.name+': '+e.message); } }
  changed(); return errs;
}
async function remove(id){
  await store('readwrite',s=>s.delete(id));
  LIST=LIST.filter(x=>x.id!==id); ON=ON.filter(x=>x!==id); saveOn(); changed();
}
function toggle(id,on){ ON=ON.filter(x=>x!==id); if(on) ON.push(id); saveOn(); changed(); }
const list=()=>LIST.map(t=>({id:t.id, title:t.title, file:t.file, on:ON.includes(t.id)}));
// [{title, text, ref}] for the translations switched on; ref is the translation's own "c:v" when it differs
function verse(r){
  return LIST.filter(t=>ON.includes(t.id)).map(t=>({title:t.title, text:((t.verses[r.book]||[])[r.ch-1]||[])[r.vs-1]||'',
    ref:((t.refs||{})[r.book]||{})[r.ch+':'+r.vs]||''}));
}
window.ESTrans={ready, list, verse, addFiles, remove, toggle, onChange:f=>{ changed=f; }};
})();
