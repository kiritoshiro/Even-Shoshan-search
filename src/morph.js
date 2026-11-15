// Hebrew and Aramaic grammar codes of the Open Scriptures Hebrew Bible (e.g. "HC/Vqw3ms") in words.
// ESMorph.describe(code) -> {short, long} in the interface language. Codes: https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html
(function(){
const lang=()=>window.I18N&&I18N.lang==='lt'?1:0;
// [English short, English long, Lithuanian short, Lithuanian long]; a single string is used for all four
const W={
  C:['conj.','conjunction','jungt.','jungtukas'], D:['adverb','adverb','prieveiksm.','prieveiksmis'],
  R:['prep.','preposition','prielinksn.','prielinksnis'], Rd:['prep. + article','preposition with the article','prielinksn. + artikelis','prielinksnis su artikeliu'],
  Ta:['particle','affirmation particle','dalel.','patvirtinimo dalelytė'], Td:['article','definite article','artikelis','žymimasis artikelis'],
  Te:['particle','exhortation particle','dalel.','raginimo dalelytė'], Ti:['question','interrogative particle','klaus. dalel.','klausiamoji dalelytė'],
  Tj:['interjection','interjection','jaustukas','jaustukas'], Tm:['particle','demonstrative particle','dalel.','parodomoji dalelytė'],
  Tn:['negative','negative particle','neig. dalel.','neigiamoji dalelytė'], To:['object marker','direct object marker','objekto žym.','tiesioginio objekto žymiklis'],
  Tr:['relative','relative particle','sant. dalel.','santykinė dalelytė'], T:['particle','particle','dalel.','dalelytė'],
  Nc:['noun','noun','daiktav.','daiktavardis'], Ng:['gentilic','gentilic noun','kilmės daiktav.','kilmės daiktavardis'],
  Np:['name','proper name','tikr. vardas','tikrinis vardas'], Nx:['noun','noun','daiktav.','daiktavardis'],
  Aa:['adj.','adjective','būdv.','būdvardis'], Ac:['number','cardinal number','skaitv.','kiekinis skaitvardis'],
  Ag:['gentilic adj.','gentilic adjective','kilmės būdv.','kilmės būdvardis'], Ao:['ordinal','ordinal number','kelint. skaitv.','kelintinis skaitvardis'],
  Pd:['pron.','demonstrative pronoun','parod. įv.','parodomasis įvardis'], Pf:['pron.','indefinite pronoun','nežym. įv.','nežymimasis įvardis'],
  Pi:['pron.','interrogative pronoun','klaus. įv.','klausiamasis įvardis'], Pp:['pron.','personal pronoun','asm. įv.','asmeninis įvardis'],
  Pr:['pron.','relative pronoun','sant. įv.','santykinis įvardis'],
  Sd:['ה of direction','directional he','krypties ה','krypties ה'], Sh:['paragogic ה','paragogic he','paragoginė ה','paragoginė ה'],
  Sn:['paragogic נ','paragogic nun','paragoginė נ','paragoginė נ'], Sp:['suffix','pronominal suffix','priesaga','įvardinė priesaga'],
  V:['verb','verb','veiksm.','veiksmažodis'],
};
const TYPE={p:['perfect','perfect (qatal)','perfektas','perfektas (katal)'], q:['weqatal','sequential perfect (weqatal)','vekatal','tęstinis perfektas (vekatal)'],
  i:['imperfect','imperfect (yiqtol)','imperfektas','imperfektas (jiktol)'], w:['wayyiqtol','sequential imperfect (wayyiqtol)','vajiktol','tęstinis imperfektas (vajiktol)'],
  h:['cohortative','cohortative','kohortatyvas','kohortatyvas'], j:['jussive','jussive','jusyvas','jusyvas'], v:['imperative','imperative','liepiamoji','liepiamoji nuosaka'],
  r:['participle','active participle','dalyvis','veikiamasis dalyvis'], s:['pass. participle','passive participle','neveik. dalyvis','neveikiamasis dalyvis'],
  a:['inf. abs.','infinitive absolute','bendr. abs.','bendratis (absoliutinė)'], c:['inf. constr.','infinitive construct','bendr. konstr.','bendratis (konstruktinė)']};
const STEM_H={q:'Qal',N:'Niphal',p:'Piel',P:'Pual',h:'Hiphil',H:'Hophal',t:'Hithpael',o:'Polel',O:'Polal',r:'Hithpolel',m:'Poel',M:'Poal',
  k:'Palel',K:'Pulal',Q:'Qal passive',l:'Pilpel',L:'Polpal',f:'Hithpalpel',D:'Nithpael',j:'Pealal',i:'Pilel',u:'Hothpaal',c:'Tiphil',
  v:'Hishtaphel',w:'Nithpalel',y:'Nithpoel',z:'Hithpoel'};
const STEM_A={q:'Peal',Q:'Peil',u:'Hithpeel',p:'Pael',P:'Ithpaal',M:'Hithpaal',a:'Aphel',h:'Haphel',s:'Saphel',e:'Shaphel',H:'Hophal',
  i:'Ithpeel',t:'Hishtaphel',v:'Ishtaphel',w:'Hithaphel',o:'Polel',z:'Ithpoel',r:'Hithpolel',f:'Hithpalpel',b:'Hephal',c:'Tiphel',
  m:'Poel',l:'Palpel',L:'Ithpalpel',O:'Ithpolel',G:'Ittaphal'};
const PERS={1:['1st','1st person','1 asm.','1 asmuo'],2:['2nd','2nd person','2 asm.','2 asmuo'],3:['3rd','3rd person','3 asm.','3 asmuo']};
const GEN={m:['masc.','masculine','vyr. g.','vyriškoji giminė'],f:['fem.','feminine','mot. g.','moteriškoji giminė'],
  b:['m./f.','masculine or feminine','vyr./mot. g.','vyriškoji arba moteriškoji giminė'],c:['common','common gender','bendr. g.','bendroji giminė']};
const NUM={s:['sing.','singular','vns.','vienaskaita'],p:['pl.','plural','dgs.','daugiskaita'],d:['dual','dual','dvisk.','dviskaita']};
const STATE={a:['absolute','absolute state','absol.','status absolutus'],c:['construct','construct state','konstr.','status constructus'],
  d:['determined','determined (emphatic) state','apibr.','status determinatus']};

function segment(s, aram){
  const L=lang(), sh=[], lo=[];
  const put=(t,k)=>{ if(t){ const x=typeof t==='string'?[t,t,t,t]:t; sh.push(x[L*2]); lo.push(x[L*2+1]); } };
  const pgn=(p,g,n)=>{ put(PERS[p]); put(GEN[g]); put(NUM[n]); };
  const pos=s[0];
  if(pos==='V'){
    const stem=(aram?STEM_A:STEM_H)[s[1]]||s[1]; put(W.V); put(stem); put(TYPE[s[2]]);
    const r=s.slice(3);
    if(s[2]==='r'||s[2]==='s'){ put(GEN[r[0]]); put(NUM[r[1]]); put(STATE[r[2]]); } else pgn(r[0],r[1],r[2]);
  } else if(pos==='C'||pos==='D'){ put(W[pos]); }
  else if(pos==='R'){ put(s[1]==='d'?W.Rd:W.R); }
  else if(pos==='T'){ put(W['T'+(s[1]||'')]||W.T); }
  else if(pos==='N'||pos==='A'){ put(W[s.slice(0,2)]||W[pos+'c']); put(GEN[s[2]]); put(NUM[s[3]]); put(STATE[s[4]]); }
  else if(pos==='P'||pos==='S'){ put(W[s.slice(0,2)]||W.Sp); pgn(s[2],s[3],s[4]); }
  else { sh.push(s); lo.push(s); }
  return {short:sh.join(' '), long:lo.join(', ')};
}
function describe(code){
  if(!code||code==='-') return {short:'',long:''};
  const aram=code[0]==='A', parts=code.slice(1).split('/').map(x=>segment(x,aram));
  const tag=aram?[['Aram.','Aramaic','aram.','aramėjų k.'][lang()*2],['Aram.','Aramaic','aram.','aramėjų k.'][lang()*2+1]]:null;
  return {short:(tag?tag[0]+' ':'')+parts.map(p=>p.short).join(' + '), long:(tag?tag[1]+': ':'')+parts.map(p=>p.long).join(' + ')};
}
window.ESMorph={describe};
})();
