// Contents tab: the same outline as tools/add_bookmarks.py, as in-app navigation.
// English introduction sections, then each Hebrew letter, opening to its pages with head words
// and English glosses. Front/back-matter pages have no printed number, so they are registered in
// BYPAGE under negative keys (-PDF page) and shown by the normal viewer.
(function(){
const LETTERS='אבגדהוזחטיכלמנסעפצקרשת';
const LT=window.I18N&&I18N.lang==='lt';
const NAMES=LT?['Alef','Bet','Gimel','Dalet','He','Vav','Zain','Chet','Tet','Jod','Kaf','Lamed','Mem','Nun',
                'Samech','Ajin','Pe','Cadi','Kof','Reš','Šin / Sin','Tav']
              :['Alef','Bet','Gimel','Dalet','He','Vav','Zayin','Het','Tet','Yod','Kaf','Lamed','Mem','Nun',
                'Samekh','Ayin','Pe','Tsadi','Qof','Resh','Shin / Sin','Tav'];
// [title, 1-based PDF page] of the 1,316-page scan, in reading order
// the introduction itself is in English; in Lithuanian mode only these titles are translated
const FRONT=(LT?[
  ['Antraštiniai puslapiai',1],
  ['Pratarmė (anglų k.)',14],
  ['1.1 Antraštinių žodžių tvarka',15],
  ['1.2–1.4 Vediniai, tvarka straipsnyje, citavimas',12],
  ['1.5–1.6 Reikšmės, hebrajiškas tekstas, ketiv/kerė',13],
  ['1.6.3–2.3 Vokalizacija, junginiai',10],
  ['2.4–2.6 Sunkios veiksmažodžių formos, vokalizacija, kirčiai',11],
  ['2.6–3.1.1 Pauzinės formos, makafas, masora, dažni žodžiai',8],
  ['3.1.2–3.2 Skliaustai, daugtaškis, santrumpos, reikšmių skyrimas',9],
  ['3.3–3.5.1 Panašūs žodžiai, aramėjų kalba, bendrosios santrumpos',6],
  ['3.5.2–3.6.2 Biblijos knygos, veiksmažodžių kamienai, skaičiai',7],
  ['3.6.3–3.6.4 Daiktavardžių formų ir įvardžių tvarka',4],
]:[
  ['Title pages',1],
  ['Preface (English)',14],
  ['1.1 Order of the entry words',15],
  ['1.2–1.4 Derivatives, order within entries, citations',12],
  ['1.5–1.6 Definitions, the Hebrew text, Ketib/Qere',13],
  ['1.6.3–2.3 Vocalization, collocations',10],
  ['2.4–2.6 Difficult verbal forms, vocalization, accents',11],
  ['2.6–3.1.1 Pausal forms, maqqeph, Masorah, high-frequency words',8],
  ['3.1.2–3.2 Parenthesis, ellipsis, abbreviations, word divisions',9],
  ['3.3–3.5.1 Similar words, Aramaic, general abbreviations',6],
  ['3.5.2–3.6.2 Books of the Bible, verbal stems, numbers',7],
  ['3.6.3–3.6.4 Sequence of nominal forms and pronouns',4],
]);
const BACK=[[LT?'Redaktoriaus pratarmė (anglų k.)':"Editor's preface (English)",1309]];
const EXTRA=[...FRONT,...BACK];
for(const [title,pdfPage] of EXTRA) BYPAGE.set(-pdfPage,{idx:pdfPage-1,page:-pdfPage,first:'',last:'',title});
window.stepExtra=d=>{
  const i=FRONT.findIndex(f=>-f[1]===cur);
  if(i<0) return show(MINPAGE);
  const j=i+d; if(j>=0&&j<FRONT.length) show(-FRONT[j][1]); else if(j>=FRONT.length) show(MINPAGE);
};

// English gloss per consonant spelling, preferring ordinary words over proper names
const GLOSS=new Map();
for(const r of LEXI){ const k=key(r.h); if(!k||!r.g) continue; const name=r.p.startsWith('N:');
  const old=GLOSS.get(k); if(!old||old.name&&!name) GLOSS.set(k,{g:LT&&r.lt?r.lt:r.g,name}); }
const gloss=w=>{ const g=GLOSS.get(key(w)); return g?(g.g.length>26?g.g.slice(0,25)+'…':g.g):''; };

// a letter starts on the first page whose last head begins with it (or a later letter)
const initial=w=>{ const k=key(w); for(const c of k) if(LETTERS.includes(c)) return c; return null; };
const groups=[]; let li=0;
for(const b of BODY){
  const L=initial(b.last)||initial(b.first);
  while(li<LETTERS.length&&L&&LETTERS.indexOf(L)>=li){ groups.push({L:LETTERS[li],name:NAMES[li],pages:[]}); li++; }
  if(groups.length) groups[groups.length-1].pages.push(b);
}

const toc=$('toc');
const pageBtn=b=>{
  const f=gloss(b.first), l=b.last&&b.last!==b.first?gloss(b.last):'';
  const heads=b.last&&b.last!==b.first?`${esc(b.first)} – ${esc(b.last)}`:esc(b.first);
  const gl=[f,l].filter(Boolean).join(' – ');
  return `<button class="it" data-p="${b.page}"><span class="pn">${b.page}</span><span class="he">${heads}</span>${gl?` <span class="gl">(${esc(gl)})</span>`:''}</button>`;
};
toc.innerHTML=
  `<div class="sec">${T('intro')}</div>`+
  FRONT.map(([t,p])=>`<button class="it" data-p="${-p}">${esc(t)}</button>`).join('')+
  `<div class="sec">${T('concordance')}</div>`+
  groups.map((g,i)=>`<details data-g="${i}"><summary><span class="L he">${g.L}</span><span>${g.name}</span>`+
    `<span class="rng">${T('pp',{a:g.pages[0].page,b:g.pages[g.pages.length-1].page})}</span></summary><div class="pages"></div></details>`).join('')+
  `<div class="sec">${T('back')}</div>`+
  BACK.map(([t,p])=>`<button class="it" data-p="${-p}">${esc(t)}</button>`).join('');

// fill a letter's page list the first time it is opened
function fill(d){ const box=d.querySelector('.pages'); if(!box.childElementCount) box.innerHTML=groups[+d.dataset.g].pages.map(pageBtn).join(''); }
toc.addEventListener('toggle',e=>{ if(e.target.tagName==='DETAILS'&&e.target.open) fill(e.target); },true);
toc.addEventListener('click',e=>{ const b=e.target.closest('button.it'); if(b) show(+b.dataset.p); });

// keep the current page highlighted (and its letter open) while reading
window.onShowPage=page=>{
  toc.querySelectorAll('button.it.on').forEach(x=>x.classList.remove('on'));
  let btn=toc.querySelector(`button.it[data-p="${page}"]`);
  if(!btn&&page>0){
    const gi=groups.findIndex(g=>g.pages.some(b=>b.page===page));
    const d=toc.querySelector(`details[data-g="${gi}"]`);
    if(d){ fill(d); btn=d.querySelector(`button.it[data-p="${page}"]`); }
  }
  if(btn){ btn.classList.add('on'); const d=btn.closest('details');
    if(d&&!d.open&&!toc.hidden){ toc.querySelectorAll('details[open]').forEach(x=>x.open=false); d.open=true; }
    if(!toc.hidden) btn.scrollIntoView({block:'nearest'}); }
};

// tabs
function tab(which){
  const t=which==='toc';
  toc.hidden=!t; $('searchPane').hidden=t;
  $('tabToc').classList.toggle('on',t); $('tabSearch').classList.toggle('on',!t);
  try{ localStorage.setItem('es-tab',which) }catch(e){}
  if(t&&cur!=null) onShowPage(cur);
}
$('tabSearch').onclick=()=>{ tab('search'); $('q').focus(); };
$('tabToc').onclick=()=>tab('toc');
let saved='search'; try{ saved=localStorage.getItem('es-tab')||'search' }catch(e){}
tab(saved);
document.addEventListener('keydown',e=>{ if(e.key==='/'&&e.target.tagName!=='INPUT'&&!toc.hidden){ tab('search'); $('q').focus(); } });
})();
