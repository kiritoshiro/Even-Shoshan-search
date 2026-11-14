// Bible-reference tooltips. The scan's hidden OCR text layer stores each line in visual order
// (letters reversed); book names come through well, chapter letters and verse digits mostly.
// Hovering a reference shows e.g. "יהושע כב 20 → Joshua 22:20".
(function(){
const BOOKS=[
  ['בראשית','Genesis'],['שמות','Exodus'],['ויקרא','Leviticus'],['במדבר','Numbers'],['דברים','Deuteronomy'],
  ['יהושע','Joshua'],['שופטים','Judges'],['ש"א','1 Samuel'],['ש"ב','2 Samuel'],['מ"א','1 Kings'],['מ"ב','2 Kings'],
  ['ישעיה','Isaiah'],['ירמיה','Jeremiah'],['יחזקאל','Ezekiel'],['הושע','Hosea'],['יואל','Joel'],['עמוס','Amos'],
  ['עובדיה','Obadiah'],['יונה','Jonah'],['מיכה','Micah'],['נחום','Nahum'],['חבקוק','Habakkuk'],['צפניה','Zephaniah'],
  ['חגי','Haggai'],['זכריה','Zechariah'],['מלאכי','Malachi'],['תהלים','Psalms'],['משלי','Proverbs'],['איוב','Job'],
  ['שה"ש','Song of Songs'],['רות','Ruth'],['איכה','Lamentations'],['קהלת','Ecclesiastes'],['אסתר','Esther'],
  ['דניאל','Daniel'],['עזרא','Ezra'],['נחמיה','Nehemiah'],['דה"א','1 Chronicles'],['דה"ב','2 Chronicles'],
];
const NAME=new Map(BOOKS);
const VAL={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
const hebNum=s=>{ let n=0; for(const c of s){ if(!VAL[c]) return 0; n+=VAL[c]; } return n; };

// visual -> logical: reverse the words, and the letters inside each Hebrew run, but keep digit runs as they are
function logical(str){
  const q=str.replace(/[֑-ׇ]/g,'').replace(/[״”“'׳]/g,'"');
  return q.split(/\s+/).filter(Boolean).reverse().map(tok=>{
    const runs=tok.match(/[א-ת"]+|[^א-ת"]+/g)||[];
    return runs.reverse().map(r=>/[א-ת]/.test(r)?[...r].reverse().join(''):r).join(' ');
  }).join(' ');
}
function near(a,b){ // edit distance <= 1, for OCR slips such as ז read as ו
  if(a===b) return true; if(Math.abs(a.length-b.length)>1||b.length<4) return false;
  let i=0,j=0,e=0;
  while(i<a.length&&j<b.length){ if(a[i]===b[j]){i++;j++;continue} if(++e>1) return false;
    if(a.length>b.length) i++; else if(b.length>a.length) j++; else {i++;j++} }
  return e+(a.length-i)+(b.length-j)<=1;
}
function bookOf(w){
  if(NAME.has(w)) return w;
  if(w.includes('"')) return null;
  for(const [h] of BOOKS) if(!h.includes('"')&&near(w,h)) return h;
  return null;
}
// find "book [chapter-letters] [verse]" in a logical-order line
function parse(line){
  const t=line.split(/\s+/).filter(Boolean), out=[];
  for(let i=0;i<t.length;i++){
    const b=bookOf(t[i]); if(!b) continue;
    let ch=0, vs=0, j=i+1;
    if(t[j]&&/^[א-ת]{1,3}$/.test(t[j])){ ch=hebNum(t[j]); j++; }
    if(t[j]&&/^\d{1,3}/.test(t[j])) vs=parseInt(t[j]);
    if(ch>150) ch=0; if(vs>176) vs=0;
    out.push({heb:b, en:NAME.get(b), ch, vs, ref:`${NAME.get(b)}${ch?' '+ch+(vs?':'+vs:''):''}`});
  }
  return out;
}

const cache=new Map();   // pdf page index -> [{x0,x1,y0,y1,str}] in page points, top-left origin
async function items(doc, idx){
  if(cache.has(idx)) return cache.get(idx);
  const p=await doc.getPage(idx+1), vp=p.getViewport({scale:1}), tc=await p.getTextContent();
  const list=tc.items.filter(i=>/[א-ת]/.test(i.str)).map(i=>{
    const [x,y]=vp.convertToViewportPoint(i.transform[4],i.transform[5]), h=Math.abs(i.transform[3])||8;
    return {x0:x,x1:x+i.width,y0:y-h,y1:y+2,str:i.str};
  });
  cache.set(idx,list); return list;
}
// references on the line under (x,y); only when the cursor is on or right beside a word
async function refsAt(doc, idx, x, y){
  const list=await items(doc,idx);
  const hit=list.find(i=>x>=i.x0-3&&x<=i.x1+3&&y>=i.y0-2&&y<=i.y1+1);
  if(!hit) return [];
  const line=list.filter(i=>Math.abs((i.y0+i.y1)/2-(hit.y0+hit.y1)/2)<4&&i.x1>x-60&&i.x0<x+60)
                 .sort((a,b)=>b.x0-a.x0);              // right to left = reading order
  const found=[];
  // a book name may be split from its chapter/verse, which then sit in the next item to the left
  line.forEach((it,k)=>{
    const own=logical(it.str), next=line[k+1]&&line[k+1].x1>it.x0-25?logical(line[k+1].str):'';
    const ownBooks=parse(own).length;
    parse(own+' '+next).slice(0,ownBooks).forEach(r=>{ r.d=Math.max(0,it.x0-x,x-it.x1); found.push(r); });
  });
  return found.sort((a,b)=>a.d-b.d).slice(0,1);
}
window.ESRefs={refsAt, parse, logical, clear:()=>cache.clear()};
})();
