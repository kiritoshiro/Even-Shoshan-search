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
    // right-to-left runs are anchored at their right edge
    return i.dir==='rtl'?{x0:x-i.width,x1:x,y0:y-h,y1:y+2,by:y,str:i.str}:{x0:x,x1:x+i.width,y0:y-h,y1:y+2,by:y,str:i.str};
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
// --- English overlay: every reference on a page that was read completely (book, chapter and verse) ---
const ABBR={'Genesis':'Gen','Exodus':'Exod','Leviticus':'Lev','Numbers':'Num','Deuteronomy':'Deut','Joshua':'Josh',
  'Judges':'Judg','1 Samuel':'1 Sam','2 Samuel':'2 Sam','1 Kings':'1 Kgs','2 Kings':'2 Kgs','Isaiah':'Isa','Jeremiah':'Jer',
  'Ezekiel':'Ezek','Hosea':'Hos','Joel':'Joel','Amos':'Amos','Obadiah':'Obad','Jonah':'Jonah','Micah':'Mic','Nahum':'Nah',
  'Habakkuk':'Hab','Zephaniah':'Zeph','Haggai':'Hag','Zechariah':'Zech','Malachi':'Mal','Psalms':'Ps','Proverbs':'Prov',
  'Job':'Job','Song of Songs':'Song','Ruth':'Ruth','Lamentations':'Lam','Ecclesiastes':'Eccl','Esther':'Esth',
  'Daniel':'Dan','Ezra':'Ezra','Nehemiah':'Neh','1 Chronicles':'1 Chr','2 Chronicles':'2 Chr'};
// chapters per book in the Hebrew Bible, to reject impossible OCR readings
const CHAPTERS={'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,'Judges':21,'1 Samuel':31,
  '2 Samuel':24,'1 Kings':22,'2 Kings':25,'Isaiah':66,'Jeremiah':52,'Ezekiel':48,'Hosea':14,'Joel':4,'Amos':9,'Obadiah':1,
  'Jonah':2,'Micah':7,'Nahum':3,'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':3,'Psalms':150,'Proverbs':31,
  'Job':42,'Song of Songs':8,'Ruth':4,'Lamentations':5,'Ecclesiastes':12,'Esther':10,'Daniel':12,'Ezra':10,'Nehemiah':13,
  '1 Chronicles':29,'2 Chronicles':36};
const overlays=new Map();
async function pageRefs(doc, idx){
  if(overlays.has(idx)) return overlays.get(idx);
  const list=await items(doc,idx), lines=[];
  for(const it of [...list].sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1))){
    const yc=(it.y0+it.y1)/2, ln=lines.find(l=>Math.abs(l.yc-yc)<3.5);
    ln?ln.items.push(it):lines.push({yc,items:[it]});
  }
  const out=[];
  for(const ln of lines){
    const row=ln.items.sort((a,b)=>b.x0-a.x0);
    for(let k=0;k<row.length;k++){
      const it=row[k], nx=row[k+1]&&row[k+1].x1>it.x0-25?row[k+1]:null;
      const own=parse(logical(it.str));
      if(own.length!==1) continue;
      let r=own[0], box=[it];
      if(!(r.ch&&r.vs)&&nx){ const both=parse(logical(it.str)+' '+logical(nx.str)); if(both[0]&&both[0].ch&&both[0].vs){ r=both[0]; box=[it,nx]; k++; } }
      if(!(r.ch&&r.vs)||r.ch>CHAPTERS[r.en]){
        // the item is just the book name: translate the name, leave the printed chapter/verse untouched
        const word=logical(it.str).trim();
        if(word===r.heb||!word.includes(' ')&&word.length>=4&&!/\d/.test(word))
          out.push({x0:it.x0,x1:it.x1,by:it.by,text:ABBR[r.en],ref:r,bookOnly:true});
        continue;
      }
      out.push({x0:Math.min(...box.map(b=>b.x0)),x1:Math.max(...box.map(b=>b.x1)),by:it.by,
                text:`${ABBR[r.en]} ${r.ch}:${r.vs}`, ref:r});
    }
  }
  overlays.set(idx,out); return out;
}
// Draw the overlays onto a canvas showing page points from x0 at `scale` px per point.
// `zones` = [[left,right],...] in points: the reference area at the left of each column; anything
// the OCR placed elsewhere is ignored. Only complete references are drawn. The OCR's word positions
// are a few points off, so the cell's right edge is found in the image itself: from the book name,
// move right until a clear white gap (the space before the quotation).
function drawOverlay(canvas, refs, x0, scale, dark, zones){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}), FS=6.4;
  const font=s=>`600 ${s*scale}px system-ui,"Segoe UI",sans-serif`;
  for(const o of refs){
    if(o.bookOnly) continue;
    const z=zones.find(z=>o.x1>z[0]+4&&o.x1<z[1]); if(!z) continue;
    const Y=Math.round((o.by-FS*1.15)*scale), H=Math.round(FS*1.5*scale);
    const L=Math.round((z[0]+2-x0)*scale);
    let R=Math.round((o.x1-x0)*scale);
    const maxR=Math.min(canvas.width-1, Math.round((o.x1+30-x0)*scale));
    if(R<0||L>canvas.width||Y<0||Y+H>canvas.height) continue;
    const band=ctx.getImageData(0,Y,canvas.width,H).data, W=canvas.width;
    // paper = lightest pixel in the band's left part; ink = clearly darker than paper (works in dark mode too)
    let pr=0,pg=0,pb=0,best=dark?1e9:-1;
    for(let x=Math.max(0,L);x<Math.min(W,R);x+=2) for(let y=0;y<H;y+=2){ const i=(y*W+x)*4, s=band[i]+band[i+1]+band[i+2];
      if(dark?s<best:s>best){best=s;pr=band[i];pg=band[i+1];pb=band[i+2];} }
    const ink=x=>{ for(let y=0;y<H;y++){ const i=(y*W+x)*4, s=band[i]+band[i+1]+band[i+2]; if(Math.abs(s-best)>200) return true; } return false; };
    const gap=Math.max(3,Math.round(3.6*scale)); let run=0, x=R;
    for(;x<=maxR;x++){ if(ink(x)) run=0; else if(++run>=gap) break; }
    if(x>maxR) continue;                                  // no clear gap: don't risk covering the quotation
    R=x-run+Math.round(1*scale);
    let fs=FS; ctx.font=font(fs);
    const tw=ctx.measureText(o.text).width;
    if(tw>R-L-2*scale){ fs*=(R-L-2*scale)/tw; ctx.font=font(fs); }
    ctx.fillStyle=`rgb(${pr},${pg},${pb})`; ctx.fillRect(L,Y,R-L,H);
    ctx.fillStyle=dark?'#e8e2d6':'#1a1714'; ctx.textBaseline='alphabetic'; ctx.textAlign='right';
    ctx.fillText(o.text, R-1*scale, (o.by-0.4-x0*0)*scale);
  }
}
window.ESRefs={refsAt, pageRefs, drawOverlay, parse, logical, clear:()=>{cache.clear();overlays.clear();}};
})();
