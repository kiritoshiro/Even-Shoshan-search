// Verse search and Bible word forms. data/bible.js holds every verse of the Hebrew Bible
// (Westminster Leningrad Codex, Hebrew chapter and verse numbering) with each word's Strong's number
// from the Open Scriptures Hebrew Bible. Loaded after refs.js, before app.js.
(function(){
const BIB=window.ES_BIBLE||{}, R=window.ESRefs||{}, LT=R.lt||{};
const LANG=()=>window.I18N?I18N.lang:'en';
const fold=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.\s]/g,'');

// ---------- book names ----------
// English abbreviations (SBL and common forms). "Pr", "Iš", "Ez" etc. are Lithuanian RK abbreviations and win in Lithuanian mode.
const EN={'Genesis':'gen ge gn','Exodus':'ex exo exod','Leviticus':'lev le lv','Numbers':'num nu nm nb','Deuteronomy':'deut deu dt',
  'Joshua':'josh jos jsh','Judges':'judg jdg jg','Ruth':'ru rth','1 Samuel':'1sam 1sa 1sm','2 Samuel':'2sam 2sa 2sm',
  '1 Kings':'1kgs 1ki 1kin 1kings','2 Kings':'2kgs 2ki 2kin 2kings','1 Chronicles':'1chr 1ch 1chron','2 Chronicles':'2chr 2ch 2chron',
  'Ezra':'ezr','Nehemiah':'neh ne','Esther':'esth est es','Job':'job jb','Psalms':'ps psa psalm pss','Proverbs':'prov prv pro',
  'Ecclesiastes':'eccl ecc qoh qoheleth','Song of Songs':'song sos songofsolomon cant canticles','Isaiah':'isa','Jeremiah':'jer je',
  'Lamentations':'lam la','Ezekiel':'ezek eze ezk','Daniel':'dan da dn','Hosea':'hos ho','Joel':'joel jl','Amos':'amos am',
  'Obadiah':'obad ob','Jonah':'jonah jon','Micah':'mic mi','Nahum':'nah na','Habakkuk':'hab','Zephaniah':'zeph zep',
  'Haggai':'hag hg','Zechariah':'zech zec','Malachi':'mal'};
const ALIAS=(()=>{
  const en=new Map(), lt=new Map(), full=[];
  for(const b of Object.keys(BIB)){
    const f=fold(b); en.set(f,b); full.push([f,b]);
    for(const a of (EN[b]||'').split(' ')) if(a) en.set(a,b);
    const l=LT[b]; if(l){
      lt.set(fold(l[0]),b); lt.set(fold(l[1]),b); full.push([fold(l[1]),b]);
      const w=l[1].split(' '); const stem=fold(/^\d/.test(w[0])?w[0]+w[1]:w[0]); lt.set(stem,b); full.push([stem,b]);
    }
  }
  lt.set('psalme',"Psalms"); lt.set('gies','Song of Songs'); lt.set('giesmiugiesme','Song of Songs');
  for(const [h,b] of (R.books||[])) { const k=h.replace(/["״]/g,''); en.set(k,b); lt.set(k,b); }
  return {en,lt,full};
})();
function bookOf(s){
  const k=fold(s).replace(/["״׳']/g,''); if(!k) return null;
  const first=LANG()==='lt'?ALIAS.lt:ALIAS.en, second=LANG()==='lt'?ALIAS.en:ALIAS.lt;
  if(first.has(k)) return first.get(k);
  if(second.has(k)) return second.get(k);
  if(k.length<3) return null;
  const hits=new Set(ALIAS.full.filter(([f])=>f.startsWith(k)).map(x=>x[1]));
  return hits.size===1?[...hits][0]:null;
}

// "Gen 1:1", "Pr 1, 1", "1 Sam 3 4", "Psalm 23" (verse 1), "בראשית א 1", "ש״ב כג 4"
function parse(q){
  q=q.trim(); let m;
  if((m=q.match(/^([1-3]?\s*[^\d\s:,.][^\d:,]*?)\.?\s*(\d{1,3})(?:\s*[:,.\s]\s*(\d{1,3}))?$/))){
    const b=bookOf(m[1]); if(b) return {book:b, ch:+m[2], vs:m[3]?+m[3]:1};
  }
  if((m=q.match(/^([א-ת"״׳']+)\s+([א-ת"״׳']{1,4}|\d{1,3})(?:\s*[,:.]?\s*(\d{1,3}))?$/))){
    const b=bookOf(m[1]); if(!b) return null;
    const ch=/^\d/.test(m[2])?+m[2]:(R.hebNum?R.hebNum(m[2].replace(/["״׳']/g,'')):0);
    if(ch) return {book:b, ch, vs:m[3]?+m[3]:1};
  }
  return null;
}
function words(r){
  const v=((BIB[r.book]||[])[r.ch-1]||[])[r.vs-1]; if(!v) return null;
  const t=v.split(' '), out=[];
  for(let i=0;i+1<t.length;i+=2) out.push({w:t[i], id:t[i+1]==='-'?'':t[i+1]});
  return out;
}
function label(r){
  return LANG()==='lt'&&LT[r.book]?`${LT[r.book][1]} ${r.ch}, ${r.vs}`:`${r.book} ${r.ch}:${r.vs}`;
}
function step(r,d){
  const order=Object.keys(BIB); let b=order.indexOf(r.book), ch=r.ch, vs=r.vs+d;
  const len=(b,c)=>((BIB[order[b]]||[])[c-1]||[]).length;
  if(vs<1){ ch--; if(ch<1){ b--; if(b<0) return null; ch=BIB[order[b]].length; } vs=len(b,ch); }
  else if(vs>len(b,ch)){ ch++; vs=1; if(ch>BIB[order[b]].length){ b++; if(b>=order.length) return null; ch=1; } }
  return {book:order[b], ch, vs};
}

// ---------- word forms ----------
// consonants with final letters folded; pointed forms compared without maqaf and meteg,
// with both holam code points treated alike
const FIN={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const ckey=s=>s.replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>FIN[c]);
const pkey=s=>s.replace(/ֺ/g,'ֹ').normalize('NFC').replace(/[־ֽ\s]/g,'').replace(/[ךםןףץ]/g,c=>FIN[c]);
let INDEX=null;   // consonants -> Map(id -> {n, forms: Map(pointed -> n)})
function index(){
  if(INDEX) return INDEX;
  INDEX=new Map();
  for(const b in BIB) for(const c of BIB[b]) for(const v of c){
    const t=v.split(' ');
    for(let i=0;i+1<t.length;i+=2){
      const id=t[i+1]; if(id==='-') continue;
      const k=ckey(t[i]); let m=INDEX.get(k); if(!m) INDEX.set(k,m=new Map());
      let e=m.get(id); if(!e) m.set(id,e={n:0,forms:new Map()});
      e.n++; const w=t[i].replace(/־$/,''); e.forms.set(w,(e.forms.get(w)||0)+1);
    }
  }
  return INDEX;
}
// letters with their points: [[letter, Set(points)], ...]
const clusters=s=>{ const out=[]; for(const ch of pkey(s).normalize('NFD')){ if(/[א-ת]/.test(ch)) out.push([ch,new Set()]); else if(out.length&&/[ְ-ׇ]/.test(ch)) out[out.length-1][1].add(ch); } return out; };
// every point the user typed is in the Bible form (points left out are not required)
function fits(typed, form){
  if(typed.length!==form.length) return false;
  return typed.every(([l,p],i)=>l===form[i][0]&&[...p].every(x=>form[i][1].has(x)));
}
// lemmas whose Bible forms match the typed word. Typed vowel points narrow the forms; if no form
// has them all, the consonants alone decide.
function forms(q){
  const k=ckey(q); if(!k) return [];
  const m=index().get(k); if(!m) return [];
  const typed=clusters(q), pointed=typed.some(c=>c[1].size);
  const collect=strict=>{
    const out=[];
    for(const [id,e] of m){
      let fs=[...e.forms].sort((a,b)=>b[1]-a[1]), n=e.n;
      if(strict){ fs=fs.filter(([f])=>fits(typed,clusters(f))); n=fs.reduce((s,x)=>s+x[1],0); if(!n) continue; }
      out.push({id, n, forms:fs.slice(0,4).map(x=>x[0])});
    }
    return out.sort((a,b)=>b.n-a.n);
  };
  const strict=pointed?collect(true):[];
  return strict.length?strict:collect(false);
}

window.ESVerse={parse, words, label, step, forms};
})();
