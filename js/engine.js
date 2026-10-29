"use strict";
/* Scenario engine: RNG, game state, card placement, training values, Knowledge Fragments, Wisdom, actions and end-of-turn events. Adapted from UmaAi (hzyhhzy/UmaAi, MIT), branch grandmasters. */
/* ================= RNG ================= */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rngState=0; function rnd(){ // stateful so it can be snapshotted
  rngState=(rngState+0x6D2B79F5)|0; let t=Math.imul(rngState^rngState>>>15,1|rngState);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const ri=n=>Math.floor(rnd()*n), rb=p=>rnd()<p;
function wpick(w){let s=0;for(const x of w)s+=x;let r=rnd()*s;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return i;}return w.length-1;}

/* ================= STATE ================= */
let G=null, sel=-1, busy=false, newLogFrom=0;
function newGame(seed){
  rngState=seed|0;
  G={seed,turn:0,vital:100,maxVital:100,mood:3,failBias:0,conds:[],sp:120,uniq:1,
     stats:UMA.init.slice(),limits:BASIC_LIMIT.map((b,i)=>b+BLUE_FACTORS[i]*14+ri(20)),
     bond:CARDS.map(c=>c.initJB).concat([0,0]),tcount:[0,0,0,0,0],
     vl:[0,0,0],bottom:[0,0,0,0,0,0,0,0],upper:[0,0,0,0,0,0],wisdom:0,wisActive:false,
     gc:{first:false,unlocked:false,passion:false,pturns:0,used:[false,false,false,false,false]},
     dist:[],hint:[false,false,false,false,false,false],frag:[0,0,0,0,0,0,0,0],tv:[],fr:[0,0,0,0,0],sb:[0,0,0,0,0,0],
     chain:[3,0,0,0,0,0],lastChain:[-9,-9,-9,-9,-9,-9],rndDone:{},hints:[],trainHints:0,log:[],ended:false,final:null};
  for(let i=0;i<6;i++){for(let j=0;j<5;j++)addStat(j,CARDS[i].init[j]);G.sp+=CARDS[i].init[5];}
  for(let j=0;j<5;j++)addStat(j,BLUE_FACTORS[j]*7);
  log('scen','Career start','Oguri Cap begins the Grand Masters scenario with a fixed MLB deck and inherited factors (Spd/Pow 6★, Sta/Wit 3★).');
  sel=-1; distribute();
}

/* ================= HELPERS ================= */
const isCamp=()=>(G.turn>=36&&G.turn<=39)||(G.turn>=60&&G.turn<=63);
const isRace=()=>RACES[G.turn]!==undefined;
const disp=v=>v<=1200?v:1200+Math.floor((v-1200)/2);
function addStat(i,v){G.stats[i]=Math.max(1,Math.min(G.limits[i],G.stats[i]+v));}
function addAll(v){for(let i=0;i<5;i++)addStat(i,v);}
function addVital(v){G.vital=Math.max(0,Math.min(G.maxVital,G.vital+v));}
function addMood(v){G.mood=Math.max(1,Math.min(5,G.mood+v));}
function addBond(i,v){G.bond[i]=Math.min(100,G.bond[i]+v);}
function addTC(i,v){G.tcount[i]=Math.min(48,G.tcount[i]+v);}
function tLevel(i){if(G.wisActive&&G.wisdom===1)return 5;if(isCamp())return 4;return Math.min(4,Math.floor(G.tcount[i]/12));}
function dateLabel(t){
  if(t>=72)return t===77?'Finale · Grand Masters':'Finale · Turn '+(t-71)+'/6';
  const y=['Junior','Classic','Senior'][Math.floor(t/24)],m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.floor((t%24)/2)];
  return y+' Year · '+(t%2?'Late ':'Early ')+m;}
function log(kind,title,text,approx){G.log.push({t:G.turn,kind,title,text,approx:!!approx});}
const MOODS=['','Awful','Bad','Normal','Good','Great'];
function bondTier(b){return b>=100?'bm':b>=80?'bo':b>=60?'bg':'';}
function bondColor(b){return b>=100?'var(--b-max)':b>=80?'var(--b-orange)':b>=60?'var(--b-green)':'var(--b-blue)';}

/* ================= CARD EFFECTS & TRAINING VALUES ================= */
function cardEffect(i,at){
  const c=CARDS[i],jb=G.bond[i];
  const e={yq:c.yq,gj:c.gj,xl:c.xl,bonus:c.bonus.slice(),vb:c.wiz};
  let shine=c.type<5?(jb>=80&&c.type===at):G.gc.passion;
  if(G.wisActive&&G.wisdom===3)shine=true;
  if(!shine)e.yq=0;
  if(!shine||at!==4)e.vb=0;
  if(c.id===30137){if(jb<100){if(shine)e.yq=20;e.gj=0;e.bonus[5]=0;}else{if(shine)e.yq=32;e.gj=15;e.bonus[5]=1;}}
  if(c.id===30101&&shine)e.yq=jb>=100?44:20;
  if(c.id===30134&&G.turn<24)e.xl=4+0.6666667*G.turn;
  e.shine=shine;return e;}
function failRate(tt){
  const B=[-3.77,-3.74,-3.76,-3.81333,-3.286],C=[130,127,129,133.5,80.2];
  let fr=Math.round(0.0245*G.vital*G.vital+B[tt]*G.vital+C[tt]+0.5*tLevel(tt));
  if(G.vital>60)fr=0; fr=Math.max(0,Math.min(99,fr)); fr+=G.failBias; return Math.max(0,Math.min(100,fr));}
function calcSpiritBonus(){
  const sb=[0,0,0,0,0,0];
  for(let i=0;i<8;i++){const s=G.bottom[i];if(!s)break;sb[s%8-1]+=1;}
  for(let i=0;i<4;i++){const s=G.upper[i];if(!s)break;sb[s%8-1]+=(Math.floor(G.bottom[2*i]/8)===Math.floor(G.bottom[2*i+1]/8))?2:3;}
  for(let i=0;i<2;i++){const s=G.upper[4+i];if(!s)break;sb[s%8-1]+=(Math.floor(G.upper[2*i]/8)===Math.floor(G.upper[2*i+1]/8))?2:3;}
  G.sb=sb;}
function calcTrain(tt){
  let fr=failRate(tt);const effs=[];let vcd=1;
  for(let c=0;c<6;c++)if(G.dist[tt][c])effs.push(cardEffect(c,tt));
  const n=effs.length;
  let mult=1+0.05*n;
  for(const e of effs)mult*=1+0.01*e.yq;
  let xl=0,gj=0;for(const e of effs){xl+=e.xl;gj+=e.gj;}
  mult*=1+0.01*xl;
  mult*=1+0.1*(G.mood-3)*(1+0.01*gj);
  const lv=tLevel(tt),base=[0,0,0,0,0,0];
  for(const e of effs)for(let j=0;j<6;j++)base[j]+=e.bonus[j];
  for(let j=0;j<6;j++){const b=TBV[tt][lv][j];base[j]=b>0?base[j]+b:0;}
  const out=[];
  for(let j=0;j<6;j++){const gr=j<5?1+0.01*UMA.growth[j]:1;let v=Math.floor(mult*base[j]*gr);if(v>100)v=100;if(v>0)v+=G.sb[j];out.push(v);}
  const vm=1+0.01*(VENUS_TRAIN[G.vl[0]]+VENUS_TRAIN[G.vl[1]]+VENUS_TRAIN[G.vl[2]]);
  for(let j=0;j<6;j++)out[j]=Math.floor(vm*out[j]);
  let vit=TBV[tt][lv][6];for(const e of effs)vit+=e.vb;
  if(vit<0)vit=Math.round(vit*(1-0.01*RED_COST[G.vl[0]])*vcd);
  out.push(vit);G.tv[tt]=out;G.fr[tt]=fr;}
function calcAll(){calcSpiritBonus();for(let t=0;t<5;t++)calcTrain(t);}
function blueBonus(tt){
  const v=[0,0,0,0,0,0];let n=0;
  for(let i=0;i<6;i++)if(G.dist[tt][i]&&CARDS[i].type<5){n++;for(let j=0;j<6;j++)v[j]+=BLUE_REL[CARDS[i].type][j];}
  for(let j=0;j<6;j++)if(v[j]>0)v[j]+=G.sb[j];
  v[5]+=20*n;return v;}

/* ================= DISTRIBUTION ================= */
function distribute(){
  if(G.turn>=TOTAL){return;}
  for(let pass=0;pass<50;pass++){
    G.dist=[0,1,2,3,4].map(()=>[false,false,false,false,false,false,false,false]);
    G.hint=[false,false,false,false,false,false];
    if(!isRace()){
      const hb=1+0.01*BLUE_HINT[G.vl[1]];
      for(let i=0;i<8;i++){
        if(G.turn<2&&i===0)continue;
        const p=[100,100,100,100,100,50];
        if(i<6){const c=CARDS[i];if(c.type<5)p[c.type]+=c.deYi;else p[5]+=50;}else p[5]+=50;
        const w=wpick(p);if(w<5)G.dist[w][i]=true;
        if(i<6&&CARDS[i].type<5)G.hint[i]=rb(0.06*hb*(1+0.01*CARDS[i].hintProb));
      }
    }
    let six=false;for(let t=0;t<5;t++){if(G.dist[t].filter(Boolean).length>=6)six=true;}
    if(!six)break;
  }
  // fragments
  G.frag=[0,0,0,0,0,0,0,0];
  if(G.turn>=2&&G.bottom[7]===0){
    const allow2=G.bottom[6]===0;
    for(let i=0;i<8;i++){
      let s=wpick(SPIRIT_P[i])+1+8*ri(3);
      let two=false;
      if(allow2){
        if(i<5){let shine=false;for(let c=0;c<6;c++)if(G.dist[i][c]&&cardEffect(c,i).yq>0)shine=true;
          if(shine){if(i<4)two=true;else if(ri(5)<2)two=true;}}
        else if(ri(5)===0)two=true;}
      if(two)s+=32;G.frag[i]=s;}
  }
  calcAll();
}
function addSpirit(s){
  if(!s)return;
  if(s>32){addSpirit(s%32);addSpirit(s%32);return;}
  let place=G.bottom.indexOf(0);if(place===-1)return;
  G.bottom[place]=s;
  const type=s%8-1;if(type>=0&&type<5)addTC(type,1);
  if(place%2===1){
    const sL=G.bottom[place-1];let ty=sL%8;if(ri(5)===0)ty=s%8;
    const sU=ty+8*Math.floor(sL/8),l2=place>>1;G.upper[l2]=sU;
    if(l2%2===1){const sL2=G.upper[l2-1];let ty2=sL2%8;if(ri(5)===0)ty2=sU%8;G.upper[4+(l2>>1)]=ty2+8*Math.floor(sL2/8);}
  }
  if(place===7){
    const c1=Math.floor(G.bottom[0]/8),c2=Math.floor(G.bottom[4]/8);let w;
    if(c1===c2)w=c1;else{let cnt=0;for(const b of G.bottom){const c=Math.floor(b/8);if(c===c1)cnt++;else if(c===c2)cnt--;}w=cnt>0?c1:cnt<0?c2:(ri(2)?c1:c2);}
    G.wisdom=w+1;
    log('wis',"Goddess' Wisdom ready",COL[w]+' Wisdom ('+GOD[w]+') can be obtained from the Knowledge Table.');
  }
  calcSpiritBonus();}
function fragName(s){if(!s)return'';const t=s%32;return COL[Math.floor(t/8)]+' '+SH[t%8-1]+(s>32?' ×2':'');}

/* ================= WISDOM ================= */
function obtainWisdom(){
  if(!G.wisdom||G.wisActive||busy||G.ended)return;
  G.wisActive=true;const w=G.wisdom-1;
  if(G.vl[w]<5)G.vl[w]++;
  let txt='';
  if(w===0){addVital(50);G.mood=5;txt='+50 energy, mood set to Great, facilities above Lv5 and +35% race gains this turn.';}
  if(w===1){for(let i=0;i<6;i++)if(CARDS[i].type<5)G.hint[i]=true;txt='Every support card on a facility gives a hint and bonus stats this turn; the goddess choice is guaranteed.';}
  if(w===2){txt='Every support card triggers friendship training this turn.';}
  log('wis',COL[w]+" Wisdom obtained · "+GOD[w],txt+' '+GOD[w]+' reaches level '+G.vl[w]+'.');
  calcAll();render();}

/* ================= EFFECT APPLICATION ================= */
function effText(e,mult){
  if(!e)return'';const p=[];mult=mult||1;
  if(e.s)e.s.forEach((v,i)=>{if(v)p.push((v>0?'+':'')+Math.round(v*mult)+' '+STAT[i]);});
  if(e.sp)p.push('+'+Math.round(e.sp*mult)+' SP');
  if(e.en)p.push((e.en>0?'+':'')+e.en+' energy');
  if(e.mood)p.push((e.mood>0?'+':'')+e.mood+' mood');
  if(e.bond)p.push('bond +'+e.bond);
  if(e.hint)p.push(e.hint[0]+' hint +'+e.hint[1]);
  if(e.cond)p.push(e.cond);
  return p.join(', ');}
function applyEff(e,card,mult){
  if(!e)return;mult=mult||1;
  if(e.s)e.s.forEach((v,i)=>{if(v)addStat(i,v>0?Math.round(v*mult):v);});
  if(e.sp)G.sp+=Math.round(e.sp*mult);
  if(e.en)addVital(e.en);if(e.mood)addMood(e.mood);
  if(e.bond&&card!=null)addBond(card,e.bond);
  if(e.hint)G.hints.push(e.hint[0]+' Lv'+e.hint[1]);
  if(e.cond&&!G.conds.includes(e.cond)){G.conds.push(e.cond);if(e.cond.startsWith('Practice Perfect'))G.failBias=-2;}}
async function runEvent(ev,card,src,kind){
  const mult=card!=null&&card>0?1+0.01*YEL_EVENT[G.vl[2]]:1;
  let parts=[];
  if(ev.ch){
    const i=await ask(src,ev.n,'Choose a response.',ev.ch.map(c=>({t:c.t,d:effText(c.e,mult)+((c.ok)?' · then a success/failure roll':'')})),ev.approx);
    const c=ev.ch[i];applyEff(c.e,card,mult);parts.push('“'+c.t+'” → '+effText(c.e,mult));
    if(c.ok){const okk=rb(0.6);const b=okk?c.ok:c.ko;applyEff(b,card,mult);parts.push((okk?'Success: ':'Failure: ')+effText(b,mult));}
  }else{
    applyEff(ev.e,card,mult);if(ev.e&&effText(ev.e,mult))parts.push(effText(ev.e,mult));
    if(ev.ok){const okk=rb(0.6);const b=okk?ev.ok:ev.ko;applyEff(b,card,mult);parts.push((okk?'Success: ':'Failure: ')+effText(b,mult));}
  }
  log(kind||'card',src+' · '+ev.n,parts.join(' · ')||'No effect.',ev.approx);render();}

/* ================= ACTIONS ================= */
async function act(kind,arg){
  if(busy||G.ended)return;busy=true;sel=-1;newLogFrom=G.log.length;
  try{
    const res=applyAction(kind,arg);
    if(res===false){busy=false;render();return;}
    if(typeof view!=='undefined'){view='home';sel=-1;}render();
    if(res&&res.three){
      const col=await ask('Ancestors & Guides','The three goddesses appear','Choose whose knowledge to receive. You get a fragment of that colour.',[
        {t:'Darley Arabian (Red)',d:'+'+(4+(G.gc.passion?5:0))+' SP, red fragment'},
        {t:'Godolphin Barb (Blue)',d:'+4 Speed'+(G.gc.passion?', +4 SP':'')+', blue fragment'},
        {t:'Byerley Turk (Yellow)',d:'+4 Stamina'+(G.gc.passion?', +4 SP':'')+', yellow fragment'}]);
      threeChoices(col);
    }
    await afterTurn();
    endTurn();
  }finally{busy=false;view='home';render();}
}
function applyAction(kind,arg){
  const T=G.turn;
  if(kind==='race'){
    addVital(-15);
    if(T!==TOTAL-1){runRace(3,45);}
    addBond(6,4);
    const ns=(ri(6)+1)+8*ri(3);addSpirit(ns);addSpirit(ns);
    log('race',RACES[T]+' · 1st',T===TOTAL-1?'The final race against the three goddesses.':'Objective race won. Two '+fragName(ns)+' fragments from the goddesses. −15 energy.');
    return true;}
  if(kind==='rest'){
    if(isCamp()){addVital(40);addMood(1);log('scen','Summer camp rest','+40 energy, +1 mood.');}
    else{const r=ri(100),v=r<25?70:r<82?50:30;addVital(v);log('scen','Rest','+'+v+' energy.');}
    addSpirit(G.frag[5]);return true;}
  if(kind==='free'){
    addVital(-15);runRace(2,40);addSpirit(G.frag[7]);
    log('race','Optional race · 1st','Small stat and SP reward. −15 energy.');return true;}
  if(kind==='out'){
    if(arg===5){if(rb(.5)){addMood(2);log('scen','Recreation','+2 mood.');}else{addMood(1);addVital(10);log('scen','Recreation','+1 mood, +10 energy.');}}
    else{G.gc.used[arg]=true;OUTINGS[arg].f();log('scen',OUTINGS[arg].n,OUTINGS[arg].d+'. Bond +5.');}
    addSpirit(G.frag[6]);return true;}
  if(kind==='train'){
    const t=arg,name=STAT[t];
    if(rnd()*100<G.fr[t]){
      if(G.fr[t]>=20&&rnd()*100<G.fr[t]){addStat(t,-10);if(G.stats[t]>1200)addStat(t,-10);for(let i=0;i<5;i++){addStat(i,-4);if(G.stats[i]>1200)addStat(i,-4);}addMood(-3);addVital(10);
        log('bad','Training failed badly · '+name,'−10 '+name+', −4 all stats, −3 mood.');}
      else{addStat(t,-5);if(G.stats[t]>1200)addStat(t,-5);addMood(-1);log('bad','Training failed · '+name,'−5 '+name+', −1 mood.');}
      return true;}
    const tv=G.tv[t],before=G.stats.map(disp);
    for(let i=0;i<5;i++)addStat(i,tv[i]);G.sp+=tv[5];addVital(tv[6]);
    for(let i=0;i<8;i++)if(G.dist[t][i]){addBond(i,i===0?4:7);if(i===6)G.sp+=2;}
    const hc=[];for(let i=0;i<6;i++)if(G.dist[t][i]&&G.hint[i])hc.push(i);
    const applyHint=i=>{addBond(i,5);G.trainHints++;};
    let extra='';
    if(G.wisActive&&G.wisdom===2){const bb=blueBonus(t);for(let i=0;i<5;i++)addStat(i,bb[i]);G.sp+=bb[5];hc.forEach(applyHint);if(hc.length)extra=' Blue Wisdom: '+hc.length+' hints and bonus stats.';}
    else if(hc.length){const h=hc[ri(hc.length)];applyHint(h);extra=' Hint from '+CARDS[h].name+'.';}
    const gained=G.stats.map(disp).map((v,i)=>v-before[i]).map((d,i)=>d?('+'+d+' '+SH[i]):'').filter(Boolean).join(', ');
    log('train',name+' training',(gained||'No stat gain')+(tv[5]?', +'+tv[5]+' SP':'')+', '+(tv[6]>0?'+':'')+tv[6]+' energy.'+extra);
    addSpirit(G.frag[t]);
    let three=false;
    if(G.dist[t][0]){
      if(!G.gc.first){G.gc.first=true;addAll(3);addVital(10);addBond(0,10);log('scen','Ancestors & Guides · First meeting','+3 all stats, +10 energy, bond +10.');}
      else{let p=G.gc.passion?1:(G.wisActive&&G.wisdom===2)?1:0.4*(1+0.01*BLUE_HINT[G.vl[1]]);three=rb(p);}
    }
    if(!isCamp())addTC(t,2);
    return {three};}
  return false;}
function threeChoices(col){
  addSpirit(col*8+ri(6)+1);addBond(0,5);
  let d='';
  if(col===0){G.sp+=4+(G.gc.passion?5:0);d='+'+(4+(G.gc.passion?5:0))+' SP';}
  else{addStat(col===1?0:1,4);if(G.gc.passion)G.sp+=4;d='+4 '+(col===1?'Speed':'Stamina')+(G.gc.passion?', +4 SP':'');}
  if(G.gc.unlocked)G.gc.passion=true;
  log('scen','The three goddesses · '+GOD[col],d+', a '+COL[col].toLowerCase()+' fragment, bond +5.'+(G.gc.unlocked?' Passion Zone active.':''));}
function runRace(st,pt){
  let m=1+0.01*CARDS.reduce((a,c)=>a+c.saiHou,0);
  if(G.wisActive&&G.wisdom===1)m*=1.35;
  addAll(Math.floor(m*st));G.sp+=Math.floor(m*pt);}

/* ================= END-OF-TURN EVENTS ================= */
async function afterTurn(){
  const T=G.turn;
  if(G.gc.first&&!G.gc.unlocked&&rb(0.06)){
    G.gc.unlocked=true;G.gc.passion=true;addAll(6);G.sp+=12;addBond(0,5);
    log('scen','Ancestors & Guides · Learning from the Three Goddesses','Goddess outings unlocked. +6 all stats, +12 SP, bond +5. Passion Zone active.');}
  if(G.gc.passion){if(rb(PASSION_END[G.gc.pturns])){G.gc.passion=false;G.gc.pturns=0;log('scen','Passion Zone ends','Ancestors & Guides no longer triggers friendship.');}else G.gc.pturns++;}
  if(T===23){yearRace('GUR',1,10,50,2);addTCAll();
    const c=await ask('Scenario','Year-end reflection','Junior year is over. How do you spend the holiday?',[{t:'Recover',d:'+20 energy'},{t:'Keep sharp',d:'+5 all stats'}]);
    if(c===0)addVital(20);else addAll(5);log('scen','Year-end reflection',c===0?'+20 energy.':'+5 all stats.');
    if(G.gc.unlocked){addVital(19);G.sp+=86;addBond(0,5);log('scen','Ancestors & Guides · The goddesses take a break','+19 energy, +86 SP, bond +5.');}}
  else if(T===29){inherit('Classic');}
  else if(T===47){yearRace('WBC',2,15,60,4);addTCAll();
    const c=await ask('Scenario','Year-end reflection','Classic year is over. How do you spend the holiday?',[{t:'Recover',d:'+30 energy'},{t:'Keep sharp',d:'+8 all stats'}]);
    if(c===0)addVital(30);else addAll(8);log('scen','Year-end reflection',c===0?'+30 energy.':'+8 all stats.');}
  else if(T===48){const r=ri(100);
    if(r<16){addVital(30);addAll(10);addMood(2);log('scen','New Year lottery · Hot spring ticket','+30 energy, +10 all stats, +2 mood.');}
    else if(r<43){addVital(20);addAll(5);addMood(1);log('scen','New Year lottery · 2nd prize','+20 energy, +5 all stats, +1 mood.');}
    else if(r<89){addVital(20);log('scen','New Year lottery · 3rd prize','+20 energy.');}
    else{addMood(-1);log('bad','New Year lottery · Tissues','−1 mood.');}}
  else if(T===49){G.uniq++;log('scen','Fan milestone','Unique skill level '+G.uniq+'.');}
  else if(T===53){inherit('Senior');
    if(G.bond[6]>=60){addMood(1);G.uniq++;log('scen','Director Akikawa · Recognition','+1 mood, unique skill level '+G.uniq+'.');}
    else{addVital(-5);G.sp+=25;log('scen','Director Akikawa · Not quite','Director bond below 60: −5 energy, +25 SP.');}}
  else if(T===70){G.uniq++;log('scen','Fan milestone','Unique skill level '+G.uniq+'.');}
  else if(T===71){yearRace('SWBC',3,20,70,6);addTCAll();}
  else if(T===76){
    const c=await ask('Scenario','Ancestors of those who stake the present','Choose a goddess. You get a hint for her scenario skill (rare version from level 4).',GOD.map((g,i)=>({t:g+' ('+COL[i]+')',d:'Level '+G.vl[i]})));
    const lv=G.vl[c],tot=G.vl[0]+G.vl[1]+G.vl[2],mx=Math.max(...G.vl);
    const hl=tot>=12?3:1;G.hints.push(GOD[c]+(lv>=4?' (rare)':'')+' skill Lv'+hl);if(lv>=5)G.hints.push(GOD[c]+' skill Lv'+hl);
    let d='Scenario skill hint Lv'+hl+'.';
    if(mx>=4){addAll(10);G.sp+=50+(mx>=5?20:0)+(tot>=12?40:0);d+=' +10 all stats and SP (goddess level 4+).';}
    log('scen','Ancestors of those who stake the present · '+GOD[c],d);}
  else if(T===77){
    runRace(20,80);let d='+20 all stats, +80 SP (before race bonus).';
    if(G.gc.used[4]){addAll(12);G.sp+=12;d+=' Ancestors & Guides finale: +12 all stats, +12 SP.';}else{addAll(8);d+=' Ancestors & Guides finale: +8 all stats.';}
    if(G.bond[7]>=100){addAll(5);G.sp+=20;}else if(G.bond[7]>=80){addAll(3);G.sp+=10;}else G.sp+=5;
    addAll(25);G.sp+=80;d+=' Ending events: +25 all stats, +80 SP.';
    log('race','Grand Masters · 1st',d);}
  // random events (not after the final race)
  if(T<TOTAL-1){
    const yl=G.vl[2],chainP=0.17*(1+0.01*YEL_CHAIN[yl]);
    const eligible=[1,2,3,4,5].filter(c=>G.chain[c]<3&&T-G.lastChain[c]>=4&&!(G.chain[c]===2&&T<30));
    if(eligible.length&&rb(chainP)){
      const c=eligible[ri(eligible.length)],ev=CARD_EVENTS[c].chain[G.chain[c]];
      G.chain[c]++;G.lastChain[c]=T;await runEvent(Object.assign({approx:CARD_EVENTS[c].approx},ev),c,CARDS[c].name,'card');}
    else if(rb(0.08)){
      const pool=[];for(let c=1;c<=5;c++)CARD_EVENTS[c].rnd.forEach((e,k)=>{if(!G.rndDone[c+'-'+k])pool.push([c,k]);});
      if(pool.length){const [c,k]=pool[ri(pool.length)];G.rndDone[c+'-'+k]=true;await runEvent(Object.assign({approx:CARD_EVENTS[c].approx},CARD_EVENTS[c].rnd[k]),c,CARDS[c].name,'card');}}
    if(rb(0.15)){const ev=TRAINEE_EVENTS[ri(TRAINEE_EVENTS.length)];await runEvent(Object.assign({approx:true},ev),null,'Oguri Cap','card');}
    if(rb(0.10)){addVital(10);log('card','Oguri Cap · A good night\'s sleep','+10 energy.');}
    if(rb(0.02)){addMood(1);log('card','Oguri Cap · Good news','+1 mood.');}
    if(rb(0.04)){addMood(-1);log('bad','Oguri Cap · Off day','−1 mood.');}
  }
}
function yearRace(name,yr,st,pt,yst){
  let s=st,p=pt,extra=[];
  if(G.vl[2]>=yr){s+=yst;extra.push('Byerley Turk: extra stats');}
  if(G.vl[0]>=yr){p+=[0,20,30,45][yr];extra.push('Darley Arabian: extra SP');}
  runRace(s,p);
  if(G.vl[1]>=yr){G.sp+=10*yr;G.hints.push(yr+' strategy hint'+(yr>1?'s':'')+' ('+name+')');extra.push('Godolphin Barb: '+yr+' strategy hint'+(yr>1?'s':''));}
  log('race',name+' · 1st','Year-end scenario race. +'+st+' all stats, +'+pt+' SP before race bonus.'+(extra.length?' '+extra.join('; ')+'.':' No goddess at level '+yr+' yet.'));}
function addTCAll(){for(let i=0;i<5;i++)addTC(i,8);}
function inherit(y){
  for(let i=0;i<5;i++){addStat(i,BLUE_FACTORS[i]*6+INHERIT_EXTRA[i]);}G.sp+=INHERIT_EXTRA[5];
  log('scen','Inheritance · '+y+' year','Spd +'+(BLUE_FACTORS[0]*6+INHERIT_EXTRA[0])+', Sta +'+BLUE_FACTORS[1]*6+', Pow +'+(BLUE_FACTORS[2]*6+INHERIT_EXTRA[2])+', Wit +'+BLUE_FACTORS[4]*6+', +'+INHERIT_EXTRA[5]+' SP.');}
function endTurn(){
  if(G.wisActive){G.wisActive=false;G.wisdom=0;G.bottom=[0,0,0,0,0,0,0,0];G.upper=[0,0,0,0,0,0];G.sb=[0,0,0,0,0,0];}
  G.turn++;
  if(G.turn>=TOTAL){G.ended=true;let score=0;for(let i=0;i<5;i++)score+=FSS[Math.min(G.stats[i],G.limits[i])];score+=Math.round(1.8*G.sp);G.final=score;
    log('scen','Career complete','Final rating estimate: '+score.toLocaleString('en-US')+'.');return;}
  distribute();}

