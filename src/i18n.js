// Interface language: English or Lithuanian. Loaded before app.js.
// T('key', {vars}) returns the text in the chosen language; switching language reloads the page.
(function(){
let lang='en';
try{ lang=localStorage.getItem('es-lang')||((navigator.language||'').toLowerCase().startsWith('lt')?'lt':'en'); }catch(e){}
if(lang!=='lt') lang='en';

const S={
  // header, sidebar
  title:            {en:'Even-Shoshan Finder', lt:'Even-Šošano paieška'},
  subtitle:         {en:"Type a word in English, Hebrew, transliteration or Strong's to open its page in the concordance",
                     lt:'Įrašykite žodį lietuviškai, angliškai, hebrajiškai, transliteracija arba Strongo numeriu, ir atsivers jo puslapis konkordancijoje'},
  open:             {en:'Open concordance PDF…', lt:'Atidaryti konkordancijos PDF…'},
  change:           {en:'Change PDF…', lt:'Keisti PDF…'},
  loading:          {en:'Loading…', lt:'Įkeliama…'},
  reopen:           {en:'Reopen {name}', lt:'Vėl atidaryti {name}'},
  tabSearch:        {en:'Search', lt:'Paieška'},
  tabToc:           {en:'Contents', lt:'Turinys'},
  placeholder:      {en:'father · אב · ויזרח · Gen 1:1 · H1 · p340', lt:'tėvas · אב · ויזרח · Pr 1, 1 · H1 · p340'},
  hint:             {en:"English gloss · Hebrew word, also as written in a verse (vowels optional) · verse (Gen 1:1, בראשית א 1) · transliteration · Strong's (H1254) · page (p340)",
                     lt:'Lietuviška ar angliška reikšmė · hebrajiškas žodis, ir toks, kaip parašytas eilutėje (balsės nebūtinos) · eilutė (Pr 1, 1, בראשית א 1) · transliteracija · Strongo nr. (H1254) · puslapis (p340)'},
  // verses and Bible word forms
  inBible:          {en:'In the Bible', lt:'Biblijoje'},
  times:            {en:'{n}×', lt:'{n} k.'},
  verseWords:       {en:'Words of the verse', lt:'Eilutės žodžiai'},
  noVerse:          {en:'No verse {ref}', lt:'Nėra eilutės {ref}'},
  prevVerse:        {en:'Previous verse', lt:'Ankstesnė eilutė'},
  nextVerse:        {en:'Next verse', lt:'Kita eilutė'},
  point:            {en:'Vowel point (optional)', lt:'Balsės ženklas (nebūtinas)'},
  // results
  goTo:             {en:'Go to', lt:'Eiti į'},
  alpha:            {en:'alphabetical position', lt:'vieta pagal abėcėlę'},
  pageRuns:         {en:'Page runs', lt:'Puslapyje nuo'},
  noPage:           {en:'No page {p} (pages {a}–{b})', lt:'Nėra {p} puslapio (puslapiai {a}–{b})'},
  matches1:         {en:'{n} lexicon match', lt:'{n} žodyno atitikmuo'},
  matchesN:         {en:'{n} lexicon matches', lt:'Žodyno atitikmenų: {n}'},
  noMatches:        {en:'No matches', lt:'Nieko nerasta'},
  pAbbr:            {en:'p.', lt:'p.'},
  // viewer toolbar
  prev:             {en:'Previous page (←)', lt:'Ankstesnis puslapis (←)'},
  next:             {en:'Next page (→)', lt:'Kitas puslapis (→)'},
  zout:             {en:'Zoom out', lt:'Mažinti'},
  zfit:             {en:'Fit', lt:'Pritaikyti'},
  zfitT:            {en:'Fit width', lt:'Pritaikyti pločiui'},
  zin:              {en:'Zoom in', lt:'Didinti'},
  clean:            {en:'Clean paper', lt:'Švarus popierius'},
  cleanT:           {en:'Clean paper: grey scan becomes white paper and dark ink (C)', lt:'Švarus popierius: pilkas skenas tampa baltu popieriumi ir tamsiu raštu (C)'},
  strengthT:        {en:'Clean-up strength', lt:'Valymo stiprumas'},
  dark:             {en:'Dark', lt:'Tamsus'},
  darkT:            {en:'Light text on dark background (D)', lt:'Šviesus tekstas tamsiame fone (D)'},
  cols:             {en:'Column zoom', lt:'Stulpelis'},
  colsT:            {en:'Column zoom: click a column to read it at full width (K)', lt:'Stulpelio didinimas: spustelėkite stulpelį, kad jis užpildytų langą (K)'},
  colsPick:         {en:'Click a column…', lt:'Spustelėkite stulpelį…'},
  wholePage:        {en:'Whole page', lt:'Visas puslapis'},
  colPrev:          {en:'‹ col', lt:'‹ stulp.'},
  colPrevT:         {en:'Previous column', lt:'Ankstesnis stulpelis'},
  colNext:          {en:'col ›', lt:'stulp. ›'},
  colNextT:         {en:'Next column', lt:'Kitas stulpelis'},
  colInfo:          {en:'column {k} of 3', lt:'{k} stulpelis iš 3'},
  eng:              {en:'English refs', lt:'Nuorodos LT'},
  engT:             {en:'Show Bible references in English where the scan was read completely (E)',
                     lt:'Rodyti Biblijos nuorodas lietuviškai, kur skenas perskaitytas visas (E)'},
  loupe:            {en:'Magnifier', lt:'Lupa'},
  loupeT:           {en:'Magnifier: hold Shift over the page, or switch on here (M)', lt:'Lupa: laikykite Shift virš puslapio arba įjunkite čia (M)'},
  // empty state, footer
  emptyH:           {en:'Open your copy of the concordance', lt:'Atidarykite savo konkordancijos kopiją'},
  emptyP1:          {en:'Click <b>Open concordance PDF…</b> and choose the Even-Shoshan scan (the 1,316-page file). It stays on your computer; nothing is uploaded.',
                     lt:'Spustelėkite <b>Atidaryti konkordancijos PDF…</b> ir pasirinkite Even-Šošano skeną (1 316 puslapių failą). Jis lieka jūsų kompiuteryje, niekas neįkeliama.'},
  emptyP1app:       {en:'Click <b>Open concordance PDF…</b> and choose the Even-Shoshan scan (the 1,316-page file). The app remembers where it is, so you only do this once.',
                     lt:'Spustelėkite <b>Atidaryti konkordancijos PDF…</b> ir pasirinkite Even-Šošano skeną (1 316 puslapių failą). Programa įsimena, kur jis yra, todėl tai reikia padaryti tik kartą.'},
  emptyP2:          {en:'You can search before opening it: results show the page number.', lt:'Ieškoti galima ir neatidarius: rezultatuose rodomas puslapio numeris.'},
  footer:           {en:"Page index made from the book's running heads. English glosses: <a href=\"https://github.com/STEPBible/STEPBible-Data\" target=\"_blank\" rel=\"noopener\">STEPBible TBESH</a> (CC BY 4.0, Tyndale House Cambridge). Verse text and word forms: <a href=\"https://github.com/openscriptures/morphhb\" target=\"_blank\" rel=\"noopener\">Open Scriptures Hebrew Bible</a> (Westminster Leningrad Codex, CC BY 4.0). Lookup lands on the page where the word's consonants fall alphabetically; check the neighbouring page if an entry starts mid-page.",
                     lt:"Puslapių rodyklė sudaryta iš knygos antraščių. Angliškos reikšmės: <a href=\"https://github.com/STEPBible/STEPBible-Data\" target=\"_blank\" rel=\"noopener\">STEPBible TBESH</a> (CC BY 4.0, Tyndale House Cambridge); lietuviškos išverstos iš hebrajiškų žodžių. Eilučių tekstas ir žodžių formos: <a href=\"https://github.com/openscriptures/morphhb\" target=\"_blank\" rel=\"noopener\">Open Scriptures Hebrew Bible</a> (Westminster Leningrado kodeksas, CC BY 4.0). Paieška atveria puslapį, kuriame žodžio priebalsės yra pagal abėcėlę; jei įrašas prasideda puslapio viduryje, peržiūrėkite ir gretimą puslapį."},
  // messages
  pageCount:        {en:'This PDF has {n} pages; the index was made for the {m}-page scan. Pages may not line up.',
                     lt:'Šis PDF turi {n} puslapių, o rodyklė sudaryta {m} puslapių skenui. Puslapiai gali nesutapti.'},
  cantOpen:         {en:'Could not open {what}: {err}', lt:'Nepavyko atidaryti {what}: {err}'},
  thePdf:           {en:'the PDF', lt:'PDF'},
  // contents
  intro:            {en:'English introduction', lt:'Įvadas (anglų k.)'},
  concordance:      {en:'Concordance', lt:'Konkordancija'},
  back:             {en:'Back matter', lt:'Pabaiga'},
  pp:               {en:'pp. {a}–{b}', lt:'p. {a}–{b}'},
  langBtn:          {en:'LT', lt:'EN'},
  langT:            {en:'Lietuviškai', lt:'In English'},
};
function T(k,v){ const e=S[k]; let s=e?(e[lang]||e.en):k; if(v) for(const n in v) s=s.split('{'+n+'}').join(v[n]); return s; }

// static text by element id: [text-or-html, title, placeholder]
function applyStatic(){
  const set=(id,{text,html,title,ph}={})=>{ const el=document.getElementById(id); if(!el) return;
    if(text!=null) el.textContent=text; if(html!=null) el.innerHTML=html; if(title!=null) el.title=title; if(ph!=null) el.placeholder=ph; };
  document.documentElement.lang=lang;
  document.querySelector('header h1').textContent=T('title');
  document.querySelector('header .sub').textContent=T('subtitle');
  document.title=T('title');
  set('openBtn',{text:T('open')});
  set('tabSearch',{text:T('tabSearch')}); set('tabToc',{text:T('tabToc')});
  set('q',{ph:T('placeholder')});
  document.querySelector('.searchbox .hint').textContent=T('hint');
  set('prev',{title:T('prev')}); set('next',{title:T('next')});
  set('zout',{title:T('zout')}); set('zfit',{text:T('zfit'),title:T('zfitT')}); set('zin',{title:T('zin')});
  set('clean',{text:T('clean'),title:T('cleanT')}); set('strength',{title:T('strengthT')});
  set('dark',{text:T('dark'),title:T('darkT')});
  set('cols',{text:T('cols'),title:T('colsT')});
  set('colPrev',{text:T('colPrev'),title:T('colPrevT')}); set('colNext',{text:T('colNext'),title:T('colNextT')});
  set('engBtn',{text:T('eng'),title:T('engT')}); set('loupeBtn',{text:T('loupe'),title:T('loupeT')});
  const em=document.getElementById('empty');
  if(em){ const ps=em.querySelectorAll('p'); em.querySelector('h2').textContent=T('emptyH');
    ps[0].innerHTML=T(window.__TAURI__?'emptyP1app':'emptyP1'); ps[1].textContent=T('emptyP2'); }
  document.querySelector('footer').innerHTML=T('footer');
  set('langBtn',{text:T('langBtn'),title:T('langT')});
}
window.I18N={lang,T,applyStatic,setLang:l=>{ try{ localStorage.setItem('es-lang',l) }catch(e){} location.reload(); }};
window.T=T;
})();
