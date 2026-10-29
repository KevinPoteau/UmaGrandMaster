"use strict";
/* Career screen: rendering, help popovers, tips, calendar, layout scaling and boot. */
/* ================= UI ================= */
let view='home';
/* Optional photo of the real Oguri Cap: set to an image URL you are allowed to use (same folder on your host works best). Leave empty to show the silhouette. */
const PHOTO_URL='';
const SKEY=['spd','sta','pow','gut','wit','sp'], GCOL=['red','blue','yellow'], GSHORT=['Darley','Godolphin','Byerley'];
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function grade(v){const T=[[1200,'UG'],[1100,'SS+'],[1000,'SS'],[900,'S+'],[800,'S'],[700,'A+'],[650,'A'],[600,'B+'],[550,'B'],[500,'C+'],[450,'C'],[400,'D+'],[350,'D'],[300,'E+'],[250,'E'],[200,'F+'],[150,'F'],[100,'G+'],[0,'G']];for(const [t,g] of T)if(v>=t)return g;return'G';}
function gradeCls(g){return 'g-'+g.replace('+','');}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const $=id=>document.getElementById(id);
const sideOn=()=>!$('side').hidden;

/* ---------- modal ---------- */
function openModal(kind,src,title,bodyHTML,approx){
  closePop();
  const root=$('modalRoot');
  root.innerHTML='<div class="scrim" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="modal"><div class="mh k-'+kind+'"><div class="src">'+esc(src)+(approx?'<span class="approx" title="Effects are estimated">≈ estimated</span>':'')+'</div><h3 id="mt">'+esc(title)+'</h3></div><div class="mb">'+bodyHTML+'</div></div></div>';
  return root;}
function closeModal(){$('modalRoot').innerHTML='';}
function ask(src,title,text,choices,approx){
  const kind=src==='Oguri Cap'?'trainee':(src==='Scenario'||src==='Ancestors & Guides'||src==='Recreation')?'scen':'card';
  return new Promise(res=>{
    const root=openModal(kind,src,title,(text?'<p>'+esc(text)+'</p>':'')+'<div class="choices">'+choices.map((c,i)=>'<button type="button" class="choice" data-i="'+i+'"><div class="ct">'+esc(c.t)+'</div>'+(c.d?'<div class="ce">'+esc(c.d)+'</div>':'')+'</button>').join('')+'</div>',approx);
    root.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{closeModal();res(+b.dataset.i);}));
    const f=root.querySelector('.choice');if(f)f.focus();});}
function infoModal(title,html,src){
  const root=openModal('info',src||'Info',title,html+'<div class="choices"><button type="button" class="choice" id="mClose"><div class="ct">Close</div></button></div>');
  $('mClose').addEventListener('click',closeModal);$('mClose').focus();}
const HELP=`<div class="help">
<h4>Turn flow</h4><p>78 turns: three years of 24 half-months, then 6 finale turns ending with the Grand Masters race. Each turn the cards scatter over the five facilities; each card favours its own type.</p>
<h4>Training</h4><p>Tap <b>Training</b>, tap a facility to preview its cards and gains, tap it again to train.</p>
<h4>Scenario</h4><p>Collect Knowledge Fragments, fill the table, obtain a Goddess' Wisdom, level up the three goddesses. Tap any <b>?</b> for a short explanation, and follow the tips panel.</p>
<h4>Approximations</h4><p>Races are always won and give flat rewards (−15 energy each). Event timing, the three-goddess trigger rate (≈40%) and success rolls (60%) are estimates. Events marked ≈ have guessed effects (Mejiro Ramonu and Oguri Cap events are not documented in English). Skills are not bought. No game artwork is used. Logic adapted from the open-source UmaAi simulator (MIT); data from GameTora and umamusu.wiki.</p></div>`;
function deckModal(){
  const rows=CARDS.map((c,i)=>{
    const right=i===0?(G.gc.unlocked?'Outings '+G.gc.used.filter(Boolean).length+'/5':G.gc.first?'Outings locked':'Not met yet'):'Chain '+'●'.repeat(G.chain[i])+'○'.repeat(3-G.chain[i]);
    return '<div class="deckrow"><span class="face t'+c.type+'">'+esc(c.ab)+'</span><div><b>'+esc(c.name)+'</b><small>SSR '+TYPE_NAME[c.type]+' · bond '+G.bond[i]+' · '+right+'</small><div class="gauge"><i style="width:'+G.bond[i]+'%;background:'+bondColor(G.bond[i])+'"></i></div></div></div>';}).join('')+
    EXTRA_HEADS.map((x,k)=>'<div class="deckrow"><span class="face tn">'+x.ab+'</span><div><b>'+x.name+'</b><small>bond '+G.bond[6+k]+'</small><div class="gauge"><i style="width:'+G.bond[6+k]+'%;background:'+bondColor(G.bond[6+k])+'"></i></div></div></div>').join('');
  infoModal('Support Cards',rows,'Deck · MLB');}
function skillsModal(){
  const h=(G.trainHints?'<span class="tag">'+G.trainHints+' hints from training</span>':'')+G.hints.map(x=>'<span class="tag">'+esc(x)+'</span>').join('');
  infoModal('Skills','<p><b>'+G.sp+' skill points.</b> Buying skills is not simulated; hints you collected are listed here.</p>'+(h||'<p>No hints yet.</p>')+'<p style="margin-top:8px">Unique skill level '+G.uniq+'. Condition: '+(G.conds.length?esc(G.conds.join(', ')):'none')+'.</p>','Skills');}

/* ---------- recent turns, tips, calendar ---------- */
function dateShort(t){if(t>=72)return t===77?'GM':'Finale '+(t-71);return ['Jr','Cl','Sr'][Math.floor(t/24)]+' '+(t%2?'L':'E')+'-'+MONTHS[Math.floor((t%24)/2)];}
function recentHTML(){
  const turns=[];for(let t=G.turn;t>=0&&turns.length<4;t--){const ev=G.log.filter(e=>e.t===t);if(ev.length||t===G.turn)turns.push([t,ev]);}
  return turns.filter(([t,ev])=>ev.length).slice(0,3).map(([t,ev])=>'<div class="rt"><span class="d'+(t===G.turn?' cur':'')+'">'+dateShort(Math.min(t,77))+'</span><ul>'+ev.map(e=>'<li class="k-'+e.kind+'" title="'+esc(e.title+' — '+e.text)+'"><b>'+esc(e.title)+'</b>'+(e.approx?'<span class="approx">≈</span>':'')+' '+esc(e.text)+'</li>').join('')+'</ul></div>').join('')||'<div class="rt"><span class="d">—</span><ul><li>Nothing yet.</li></ul></div>';}
function predictWisdom(){
  const b=G.bottom,c=s=>Math.floor(s/8);
  if(!b[0])return -1;
  if(b[4]&&c(b[0])===c(b[4]))return c(b[0]);
  if(!b[4])return -2;
  let cnt=0;for(const s of b){if(!s)continue;if(c(s)===c(b[0]))cnt++;else if(c(s)===c(b[4]))cnt--;}
  return cnt>0?c(b[0]):cnt<0?c(b[4]):-3;}
function bestFacility(fn){let best=-1,bv=0;for(let t=0;t<5;t++){const v=fn(t);if(v>bv){bv=v;best=t;}}return [best,bv];}
function tips(){
  const T=[],race=isRace(),camp=isCamp(),filled=G.bottom.filter(Boolean).length;
  if(G.ended)return [{c:'g',h:'Career complete',t:'Start a new career from the ↻ button to try another route.'}];
  if(G.wisdom&&!G.wisActive){
    const w=G.wisdom-1;let t=WIS_SHORT[w];
    if(w===0)t+=race?' <b>Race today: use it now.</b>':G.vital<50?' <b>Energy is low: good time.</b>':' Keep it for a race day or when energy drops.';
    else if(race)t+=' No training today: wait for next turn.';
    else{const [f,n]=bestFacility(x=>G.dist[x].slice(0,6).filter((v,i)=>v&&(w===2||CARDS[i].type<5||i===0)).length+(w===1&&G.dist[x][0]?1:0));if(f>=0)t+=' <b>Best now: '+STAT[f]+' ('+G.dist[f].slice(0,6).filter(Boolean).length+' cards).</b>';}
    T.push({c:['r','b','y'][w],h:COL[w]+' Wisdom ready',t});}
  if(G.wisActive)T.push({c:['r','b','y'][G.wisdom-1],h:COL[G.wisdom-1]+' Wisdom active',t:'Its effect lasts this turn only; the table empties afterwards.'});
  if(race)T.push({c:'p',h:'Race day',t:RACES[G.turn]+': racing is the only action. It gives two identical fragments.'});
  if(!race){const fr=[0,1,2,3,4].filter(t=>friendCount(t));if(fr.length)T.push({c:'g',h:'Friendship available',t:fr.map(t=>STAT[t]).join(', ')+': bigger gains and two fragments.'});}
  if(G.turn>=2&&!G.wisdom&&!race){
    if(filled===0)T.push({c:'p',h:'New table',t:'Fragment 1 sets the colour of the left half: it will likely decide your next Wisdom.'});
    else if(filled===4){const col=Math.floor(G.bottom[0]/8);T.push({c:['r','b','y'][col],h:'Fragment 5 is next',t:'A '+COL[col].toLowerCase()+' fragment locks a '+COL[col]+' Wisdom (same colour as slot 1).'});}
    else if(filled>=6){const p=predictWisdom();if(p>=0)T.push({c:['r','b','y'][p],h:(8-filled)+' fragment'+(filled<7?'s':'')+' to Wisdom',t:'It will be '+COL[p]+' ('+GOD[p]+').'});}
  }
  if(!race&&G.vital<50)T.push({c:'w',h:'Energy '+G.vital,t:'Failure risk rises below about 60. Rest, Wit training'+(G.wisdom===1&&!G.wisActive?', or the Red Wisdom':'')+'.'});
  if(G.mood<=2)T.push({c:'w',h:'Mood '+MOODS[G.mood],t:'Training gains −'+(3-G.mood)*10+'%. Recreation raises mood.'});
  if(!race&&!G.gc.first&&G.turn>=2){const f=[0,1,2,3,4].find(t=>G.dist[t][0]);if(f!==undefined)T.push({c:'p',h:'Ancestors & Guides on '+STAT[f],t:'First training with it: +3 all stats, +10 energy, and it starts the goddess events.'});}
  if(G.gc.passion)T.push({c:'g',h:'Passion Zone',t:'Ancestors & Guides gives friendship anywhere and always triggers the goddess choice.'});
  if(!race&&!camp&&goutBadge())T.push({c:'p',h:'Goddess outing available',t:'Energy, mood and stats in one turn; outing 5 lights the Passion Zone.'});
  const yr=[23,47,71].find(t=>t>=G.turn&&t-G.turn<=3);
  if(yr!==undefined){const k=[23,47,71].indexOf(yr),nm=['GUR','WBC','SWBC'][k];T.push({c:'g',h:nm+(yr===G.turn?' after this turn':' in '+(yr-G.turn)+' turns'),t:'Goddesses at level '+(k+1)+'+ add their bonus. Now: '+G.vl.map((l,i)=>GSHORT[i]+' '+l).join(', ')+'.'});}
  const camps=[36,60].find(t=>t>G.turn&&t-G.turn<=3);
  if(camps)T.push({c:'g',h:'Summer camp in '+(camps-G.turn)+' turns',t:'All facilities become Lv5 for 4 turns: arrive with energy.'});
  if(G.turn<30&&!race){const low=[1,2,3,4,5].filter(i=>G.bond[i]<80);if(low.length&&T.length<4)T.push({c:'p',h:'Build bonds',t:'Friendship needs bond 80 (orange gauge). Still below: '+low.map(i=>CARDS[i].ab).join(', ')+'.'});}
  return T.slice(0,5);}
function tipsHTML(){return tips().map(x=>'<div class="tip '+x.c+'"><b>'+x.h+'.</b> '+x.t+'</div>').join('');}
const CAL_EVENTS={23:'GUR (year-end race)',29:'Inheritance',47:'WBC (year-end race)',48:'New Year lottery',53:'Inheritance · Director check',71:'SWBC (year-end race)',76:'Goddess choice',77:'Grand Masters'};
function calHTML(){
  const cell=t=>{let c='cc';const ev=[];
    if((t>=36&&t<=39)||(t>=60&&t<=63)){c+=' camp';ev.push('Summer camp');}
    if(RACES[t]&&t!==77){c+=' obj';ev.push(RACES[t]);}
    if(t===23||t===47||t===71)c+=' yr';
    if(t===29||t===53)c+=' inh';
    if(t===77)c+=' gm';
    if(CAL_EVENTS[t])ev.push(CAL_EVENTS[t]);
    if(t<G.turn)c+=' past';if(t===G.turn&&!G.ended)c+=' now';
    return '<span class="'+c+'" title="'+esc(dateLabel(t)+(ev.length?' · '+ev.join(' · '):''))+'"></span>';};
  let h='<div class="mh2"><span></span>'+['J','F','M','A','M','J','J','A','S','O','N','D'].map(m=>'<span>'+m+'</span>').join('')+'</div>';
  ['Junior','Classic','Senior'].forEach((y,k)=>{h+='<div class="cr"><span class="yl">'+y+'</span>';for(let t=k*24;t<k*24+24;t++)h+=cell(t);h+='</div>';});
  h+='<div class="cr fin"><span class="yl">Finale</span>';for(let t=72;t<78;t++)h+=cell(t);h+='<span></span></div>';
  h+='<div class="legend"><span><i style="outline:2px solid var(--fg);background:#3c5d4c"></i>Now</span><span><i class="cc obj"></i>Objective</span><span><i class="cc yr"></i>Year-end race</span><span><i class="cc inh"></i>Inheritance</span><span><i style="background:#4a2c27"></i>Summer camp</span></div>';
  return h;}
function upcomingHTML(){
  const keys=[...new Set(Object.keys(RACES).map(Number).concat(Object.keys(CAL_EVENTS).map(Number),[36,60]))].filter(t=>t>=G.turn).sort((a,b)=>a-b).slice(0,5);
  return keys.map(t=>'<div><b>'+esc(t===36||t===60?'Summer camp starts':RACES[t]||CAL_EVENTS[t])+'</b><span>'+(t===G.turn?'now':'in '+(t-G.turn))+' · '+dateShort(t)+'</span></div>').join('');}
function logModal(){infoModal('Tips & calendar','<div class="sh" style="padding:0 0 4px">Scenario tips</div><div class="tips" style="padding:0 0 8px">'+tipsHTML()+'</div><div class="sh" style="padding:4px 0">Recent turns</div><div class="recent" style="padding:0 0 8px">'+recentHTML()+'</div><div class="sh" style="padding:4px 0">Career calendar</div><div class="cal" style="padding:0 0 6px">'+calHTML()+'</div><div class="upc" style="padding:0">'+upcomingHTML()+'</div>','Career');}

/* ---------- compact help popovers ---------- */
function closePop(){const p=$('popRoot');if(p)p.innerHTML='';}
function popHelp(key,anchor){
  const H=helpContent(key);if(!H)return;
  const scr=$('screen'),sr=scr.getBoundingClientRect(),s=sr.width/430;
  let ax=215,ay=300,below=true;
  if(anchor&&scr.contains(anchor)){const r=anchor.getBoundingClientRect();ax=(r.left+r.width/2-sr.left)/s;ay=(r.top-sr.top)/s;below=ay<466;if(below)ay=(r.bottom-sr.top)/s;}
  const left=Math.max(10,Math.min(430-310,ax-150));
  $('popRoot').innerHTML='<div class="pop" role="dialog" aria-label="'+esc(H.t)+'" style="left:'+left+'px;'+(below?'top:'+(ay+6)+'px':'bottom:'+(932-ay+6)+'px')+'"><h5>'+esc(H.t)+'<button class="x" type="button" aria-label="Close">×</button></h5>'+H.h+'</div>';
  $('popRoot').querySelector('.x').addEventListener('click',closePop);}
const WIS_SHORT=['+50 energy, mood Great, facilities Lv5+ this turn, +35% race gains.','Every card on the facility gives a hint, bonus stats and 20 SP; goddess choice guaranteed.','Every card on every facility triggers friendship this turn.'];
function helpContent(k){
  const sb=G.sb.some(Boolean)?G.sb.map((v,i)=>v?SH[i]+' +'+v:'').filter(Boolean).join(', '):'none';
  if(k==='kt')return {t:'Knowledge Table',h:'<ul><li>Every action shows the <b>fragment</b> it gives (gem). Friendship training gives <b>2</b>.</li><li>Each fragment: <b>+1</b> to its stat on every training. Crystals: <b>+2</b> same colours, <b>+3</b> mixed. Now: '+sb+'.</li><li>Pairs merge; the <b>left</b> fragment keeps its colour.</li><li><b>Slots 1 and 5</b> decide the Wisdom colour (else the majority).</li><li>8 fragments = a <b>Goddess\' Wisdom</b>. The table empties after you use it.</li></ul>'};
  if(k==='wisdom'){const w=G.wisdom?G.wisdom-1:-1;return {t:"Goddess' Wisdom",h:'<ul>'+[0,1,2].map(i=>'<li style="'+(i===w?'':'opacity:.75')+'"><b style="color:var(--'+GCOL[i]+')">'+COL[i]+'</b>'+(i===w?' (ready)':'')+': '+WIS_SHORT[i]+'</li>').join('')+'<li>Free action: obtain it, then choose what to do this turn.</li><li>Also gives that goddess <b>+1 level</b> for good.</li></ul>'};}
  if(k==='gods'){
    const rows=[1,2,3,4,5].map(l=>'<tr><td>'+l+'</td><td'+(G.vl[0]===l?' class="cur"':'')+'>−'+RED_COST[l]+'%</td><td'+(G.vl[1]===l?' class="cur"':'')+'>+'+BLUE_HINT[l]+'%</td><td'+(G.vl[2]===l?' class="cur"':'')+'>+'+YEL_EVENT[l]+'%</td><td>+'+VENUS_TRAIN[l]+'%</td></tr>').join('');
    return {t:'Goddess levels',h:'<table class="tbl"><tr><th>Lv</th><th style="color:var(--red)">Darley<br>energy cost</th><th style="color:var(--blue)">Godolphin<br>hint rate</th><th style="color:var(--yellow)">Byerley<br>card events</th><th>Training<br>each</th></tr>'+rows+'</table><ul><li>Levels come from obtaining that Wisdom (max 5).</li><li>Year-end races: a goddess at level ≥ year adds SP (Darley), strategy hints (Godolphin) or stats (Byerley).</li><li>Level 4+ unlocks her rare skill before Grand Masters.</li></ul>'};}
  if(k==='passion')return {t:'Passion Zone',h:'<ul><li>Ancestors & Guides gives <b>friendship on any facility</b>.</li><li>Training with it <b>always</b> triggers the goddess choice, with extra SP.</li><li>Lit by unlocking outings, outing 5 and goddess choices; fades after 2+ turns.</li></ul>'};
  if(k==='friendship')return {t:'Friendship training',h:'<ul><li><b>Rainbow ring ★</b> = a card is ready for friendship there.</li><li>Type cards: bond <b>80+</b> (orange gauge) on their own facility.</li><li>Ancestors & Guides: only during Passion Zone.</li><li>Yellow Wisdom: every card, every facility.</li><li>Bigger gains, 2 fragments; Wit friendship restores energy.</li></ul>'};
  if(k==='calendar')return {t:'Career calendar',h:'<ul><li>One square = one turn (half a month). Outlined = now.</li><li><b style="color:var(--purple)">●</b> objective race · <b style="color:var(--gold)">■</b> GUR / WBC / SWBC · <b style="color:var(--blue)">●</b> inheritance · red squares = summer camp.</li><li>Finale: 5 training turns, then Grand Masters.</li></ul>'};
  if(k==='outing')return {t:'Goddess outings',h:'<ul><li>Unlocked at random after meeting Ancestors & Guides.</li><li>Darley, Godolphin, Byerley first (any order), then A&G I, then A&G II.</li><li>Each: big energy, +1 mood, stats or SP. A&G II lights the Passion Zone.</li></ul>'};
  return null;}

/* ---------- render ---------- */
function fragGem(s,label){
  if(G.turn<2||G.ended)return '';
  if(!s)return label?'<span class="gem2">Table full</span>':'';
  const t=s%32,c=Math.floor(t/8);
  return '<span class="gem2" title="'+fragName(s)+' fragment"><span class="gem c'+c+'"></span>'+SH[t%8-1]+(s>32?' ×2':'')+'</span>';}
function friendCount(t){if(!G.dist[t])return 0;let n=0;for(let i=0;i<6;i++)if(G.dist[t][i]&&cardEffect(i,t).shine)n++;return n;}
function goutBadge(){
  if(!G.gc.unlocked||isCamp())return '';
  const av=OUTINGS.map((o,k)=>(!G.gc.used[k]&&(k<3||(k===3?G.gc.used[0]&&G.gc.used[1]&&G.gc.used[2]:G.gc.used[3])))?k:-1).filter(k=>k>=0);
  if(!av.length)return '';
  return '<span class="gout" title="Goddess outings available">'+av.map(k=>'<i style="background:'+(k<3?'var(--'+GCOL[k]+')':'conic-gradient(var(--red),var(--blue),var(--yellow),var(--red))')+'"></i>').join('')+'Outing</span>';}
function render(){
  const race=!G.ended&&isRace(),camp=!G.ended&&isCamp();
  if(G.ended){$('dy').textContent='Career';$('dd').textContent='Complete';}
  else if(G.turn>=72){$('dy').textContent='Finale';$('dd').textContent=G.turn===77?'Grand Masters':'Turn '+(G.turn-71)+' / 6';}
  else{$('dy').textContent=['Junior Year','Classic Year','Senior Year'][Math.floor(G.turn/24)];$('dd').textContent=(G.turn%2?'Late ':'Early ')+MONTHS[Math.floor((G.turn%24)/2)];}
  const nextObj=Object.keys(RACES).map(Number).find(t=>t>=G.turn);
  if(G.ended){$('goalName').textContent='All goals cleared';$('goalSub').textContent='Rating estimate '+G.final.toLocaleString('en-US');$('goalN').textContent='—';}
  else{$('goalName').textContent=RACES[nextObj];$('goalSub').textContent=nextObj===G.turn?'Race today · win to continue':'Win the race · turn '+(G.turn+1)+' of 78';$('goalN').textContent=nextObj-G.turn;}
  let costW=0;if(view==='train'&&sel>=0&&G.tv[sel]&&G.tv[sel][6]<0)costW=Math.min(G.vital,-G.tv[sel][6]);
  $('enCost').style.left=(100*(G.vital-costW)/G.maxVital)+'%';$('enCost').style.width=(100*costW/G.maxVital)+'%';
  $('enBar').style.width=(100*(G.vital-costW)/G.maxVital)+'%';
  $('enTxt').textContent=G.vital+' / '+G.maxVital;
  const md=$('mood');md.className='mood m'+G.mood;
  md.innerHTML='<svg viewBox="0 0 16 16">'+(G.mood>=4?'<path d="M8 2l5 6h-3v6H6V8H3z"/>':G.mood===3?'<path d="M2 6h12v4H2z"/>':'<path d="M8 14L3 8h3V2h4v6h3z"/>')+'</svg>'+MOODS[G.mood];
  // knowledge table
  const sl=s=>s?'<span class="sl f c'+Math.floor(s/8)+'"></span>':'<span class="sl"></span>';
  $('kt').innerHTML='<div class="t"><span>Knowledge Table '+G.bottom.filter(Boolean).length+'/8</span><button class="qm" type="button" data-help="kt" aria-label="How the Knowledge Table works">?</button></div><div class="ly l4">'+(G.wisdom?'<span class="sl f c'+(G.wisdom-1)+'"></span>':'<span class="sl"></span>')+'</div><div class="ly l3">'+G.upper.slice(4,6).map(sl).join('')+'</div><div class="ly l2">'+G.upper.slice(0,4).map(sl).join('')+'</div><div class="ly">'+G.bottom.map(sl).join('')+'</div><div class="ktb">'+(G.sb.some(Boolean)?G.sb.map((v,i)=>v?SH[i]+' <b>+'+v+'</b>':'').filter(Boolean).join(' '):'No bonus yet')+'</div>';
  const wb=$('bWis'),w=G.wisdom-1;
  wb.className='wis'+(G.wisActive?' on':G.wisdom?' ready w'+w:'');
  wb.disabled=!G.wisdom||G.wisActive||G.ended||busy;
  wb.innerHTML=G.wisActive?COL[w]+' Wisdom active<small>this turn only</small>':G.wisdom?'OBTAIN '+COL[w].toUpperCase()+' WISDOM<small>'+GOD[w]+'</small>':'Goddess\' Wisdom<small>fill the 8 slots</small>';
  $('gods').innerHTML='<span class="gh">Goddess levels<span class="qm" data-help="gods" aria-hidden="true">?</span></span>'+[0,1,2].map(i=>'<span class="god"><span class="gn" style="color:var(--'+GCOL[i]+')">'+GOD[i]+' · Lv'+G.vl[i]+'</span><span class="pips">'+[1,2,3,4,5].map(k=>'<i'+(k<=G.vl[i]?' style="background:var(--'+GCOL[i]+')"':'')+'></i>').join('')+'</span></span>').join('');
  // center
  let b='';
  if(G.wisdom&&!G.wisActive)b+='<button type="button" class="bd wready" data-help="wisdom" style="background:var(--'+GCOL[w]+')">◆ '+COL[w]+' Wisdom ready</button>';
  if(race)b+='<span class="bd race">Race day</span>';
  if(camp)b+='<span class="bd camp">Summer camp · Lv5</span>';
  if(G.gc.passion)b+='<button type="button" class="bd passion" data-help="passion">Passion Zone <span class="qm" aria-hidden="true">?</span></button>';
  $('badges').innerHTML=b;
  $('uniq').textContent='Unique skill Lv'+G.uniq+' · '+G.sp+' SP';
  if(sideOn()){const lastEv=G.log.slice(newLogFrom);$('last').innerHTML='<div class="lt">LAST TURN</div>'+esc((lastEv.length?lastEv:G.log.slice(-1)).map(e=>e.title).join(' · '));}
  else{const tp=tips()[0];$('last').innerHTML='<div class="lt">TIP · tap for tips &amp; calendar</div>'+(tp?'<b>'+tp.h+'.</b> '+tp.t:'');}
  // support column
  const supp=$('supp');
  if(view==='train'&&sel>=0&&!race){
    supp.innerHTML=[0,1,2,3,4,5,6,7].filter(i=>G.dist[sel][i]).map(i=>{
      if(i>=6){const x=EXTRA_HEADS[i-6];return '<div class="sc" title="'+x.name+'"><span class="face tn">'+x.ab+'</span><div class="gauge"><i style="width:'+G.bond[i]+'%;background:'+bondColor(G.bond[i])+'"></i></div></div>';}
      const c=CARDS[i],e=cardEffect(i,sel);
      return '<div class="sc" title="'+esc(c.name)+' · bond '+G.bond[i]+(e.shine?' · friendship':'')+(G.hint[i]?' · hint':'')+'"><span class="face t'+c.type+(e.shine?' shine':'')+'">'+esc(c.ab)+'<small>'+TYPE_NAME[c.type]+'</small>'+(G.hint[i]?'<span class="hint">!</span>':'')+'</span><div class="gauge"><i style="width:'+G.bond[i]+'%;background:'+bondColor(G.bond[i])+'"></i></div></div>';}).join('');
  }else supp.innerHTML='';
  // stats
  const tv=view==='train'&&sel>=0?G.tv[sel]:null;
  $('gainrow').innerHTML=[0,1,2,3,4,5].map(j=>{if(!tv||!tv[j])return '<span></span>';const d=j<5?disp(Math.min(G.limits[j],G.stats[j]+tv[j]))-disp(G.stats[j]):tv[j];return '<span>+'+d+'</span>';}).join('');
  $('stats').innerHTML=STAT.map((s,i)=>{const v=disp(G.stats[i]),g=grade(v);return '<div class="st"><div class="sn bg-'+SKEY[i]+'">'+s+'</div><div class="row"><span class="gr '+gradeCls(g)+'">'+g+'</span><span class="v num">'+v+'</span></div><div class="cap">/'+disp(G.limits[i])+'</div></div>';}).join('')+
    '<div class="st"><div class="sn bg-sp">Skill Pts</div><div class="row"><span class="v num">'+G.sp+'</span></div><div class="cap">&nbsp;</div></div>';
  // bottom
  const bt=$('bottom'),lock=G.ended||busy;
  if(view==='train'&&!race&&!G.ended){
    bt.innerHTML='<div class="trainview"><div class="fails">'+[0,1,2,3,4].map(t=>{const fr=G.fr[t];return '<span class="'+(fr>=20?'bad':fr>0?'warn':'ok')+(sel===t?' sel':'')+'">Fail '+fr+'%</span>';}).join('')+'</div>'+
      '<div class="facs">'+[0,1,2,3,4].map(t=>{const lv=tLevel(t),n=G.dist[t].filter(Boolean).length,fs=friendCount(t);return '<button type="button" class="fac'+(sel===t?' sel':'')+'" data-t="'+t+'" '+(lock?'disabled':'')+' aria-pressed="'+(sel===t)+'" aria-label="'+STAT[t]+(fs?', friendship training':'')+'"><span class="fwrap'+(fs?' friend':'')+'">'+(fs?'<span class="fstar">★'+(fs>1?'×'+fs:'')+'</span>':'')+'<span class="ring bg-'+SKEY[t]+'">'+STAT[t]+(n?'<span class="heads">'+n+'</span>':'')+'</span></span><span class="lv">'+(lv===5?'Lv5+':'Lv'+(lv+1))+'</span>'+fragGem(G.frag[t])+'</button>';}).join('')+'</div>'+
      '<div class="tvfoot"><button type="button" class="back" id="bBack">Back</button><span class="tvhint">'+(sel>=0?(G.dist[sel][0]?(G.gc.first?'A&amp;G here: goddess choice possible · ':'A&amp;G here: first meeting · '):'')+'tap again to train':'Tap a facility')+'<button class="qm" type="button" data-help="friendship" aria-label="About friendship training">?</button></span>'+(sel>=0?'<button type="button" class="go" id="bGo">Train</button>':'')+'</div></div>';
    bt.querySelectorAll('.fac').forEach(f=>f.addEventListener('click',()=>{const t=+f.dataset.t;if(sel===t)doTrain(t);else{sel=t;render();}}));
    $('bBack').addEventListener('click',()=>{view='home';sel=-1;render();});
    if($('bGo'))$('bGo').addEventListener('click',()=>doTrain(sel));
  }else{
    const canRace=!race&&G.turn>12&&G.turn<72&&!camp;
    bt.innerHTML='<div class="home">'+
      '<button type="button" class="hb" data-a="rest" '+(lock||race?'disabled':'')+'>'+(camp?'Rest &amp;<br>Recreation':'Rest')+'<small>'+(camp?'+40 energy, +1 mood':'+30 to +70 energy')+'</small><span class="fr">'+fragGem(G.frag[5])+'</span></button>'+
      (race?'<button type="button" class="hb train race-day" data-a="race" '+(lock?'disabled':'')+'>Race!<small>'+esc(RACES[G.turn])+'</small></button>'
           :'<button type="button" class="hb train" data-a="train" '+(lock?'disabled':'')+'>Training<small>'+(G.ended?'Career complete':'Choose a facility')+'</small>'+(!G.ended&&[0,1,2,3,4].some(t=>friendCount(t))?'<span class="fbadge">★ Friendship</span>':'')+'</button>')+
      '<button type="button" class="hb" data-a="skills">Skills<small>'+G.sp+' SP · '+(G.hints.length+G.trainHints)+' hints</small></button>'+
      '<button type="button" class="hb" data-a="inf" disabled>Infirmary<small>No condition</small></button>'+
      '<button type="button" class="hb" data-a="out" '+(lock||race||camp?'disabled':'')+'>'+goutBadge()+'Recreation<small>'+(camp?'Not at camp':G.gc.unlocked?'Goddess outings':'Mood up')+'</small><span class="fr">'+fragGem(G.frag[6])+'</span></button>'+
      '<button type="button" class="hb" data-a="free" '+(lock||!canRace?'disabled':'')+'>Races<small>'+(canRace?'Optional G1, −15 energy':'Unavailable')+'</small><span class="fr">'+fragGem(G.frag[7])+'</span></button></div>';
    bt.querySelectorAll('.hb').forEach(x=>x.addEventListener('click',()=>homeAction(x.dataset.a)));
  }
  renderSide();
  if(G.ended&&!endShown){endShown=true;setTimeout(endModal,50);}
}
function renderSide(){if(!sideOn()||!G)return;$('sideRecent').innerHTML=recentHTML();$('sideTips').innerHTML=tipsHTML();$('sideCal').innerHTML=calHTML();$('sideUpc').innerHTML=upcomingHTML();}
let endShown=false;
function endModal(){
  const html='<p style="font-size:34px;font-weight:800;margin:0;line-height:1;font-family:var(--display)">'+G.final.toLocaleString('en-US')+'</p><p style="color:var(--muted)">Rating estimate (stats + SP)</p>'+
   '<p>'+STAT.map((s,i)=>s+' <b>'+disp(G.stats[i])+'</b> ('+grade(disp(G.stats[i]))+')').join(' · ')+'</p><p>'+G.sp+' SP unspent · goddess levels '+G.vl.map((l,i)=>GSHORT[i]+' '+l).join(', ')+'</p>'+
   '<div class="choices"><button type="button" class="choice" id="mNew"><div class="ct">Start a new career</div></button><button type="button" class="choice" id="mStay"><div class="ct">Review this career</div></button></div>';
  openModal('scen','Grand Masters','Career complete',html);
  $('mNew').addEventListener('click',()=>{closeModal();start();});$('mStay').addEventListener('click',closeModal);}
async function homeAction(a){
  closePop();
  if(a==='skills')return skillsModal();
  if(busy||G.ended)return;
  if(a==='train'){view='train';sel=-1;return render();}
  if(a==='out'){
    const opts=[{t:'Recreation',d:'+1 or +2 mood, sometimes +10 energy',k:5}];
    if(G.gc.unlocked)OUTINGS.forEach((o,k)=>{const ok=!G.gc.used[k]&&(k<3||(k===3?G.gc.used[0]&&G.gc.used[1]&&G.gc.used[2]:G.gc.used[3]));if(ok)opts.push({t:o.n,d:o.d,k});});
    if(opts.length===1)return act('out',5);
    const i=await ask('Recreation','Where to?','Goddess outings each happen once.',opts);return act('out',opts[i].k);}
  act(a);}
async function doTrain(t){closePop();await act('train',t);}

/* ---------- layout scaling ---------- */
function fit(){
  const vw=window.innerWidth,vh=window.innerHeight,H=932;
  const wantSide=vw/vh>(430+14+360)/H*0.98&&vw>=760;
  $('side').hidden=!wantSide;
  const W=wantSide?804:430;
  const s=Math.min(vw/W,vh/H)*0.98;
  $('stage').style.transform='translate(-50%,-50%) scale('+s+')';
  if(G)render();}
window.addEventListener('resize',fit);
$('bHelp').addEventListener('click',()=>infoModal('How this career works',HELP,'Help'));
$('bDeck').addEventListener('click',deckModal);
$('bLog').addEventListener('click',logModal);
$('last').addEventListener('click',()=>{if(!sideOn())logModal();});
$('bWis').addEventListener('click',()=>{closePop();obtainWisdom();});
$('gods').addEventListener('click',e=>popHelp('gods',$('gods')));
$('goalBox').addEventListener('click',()=>{if(sideOn())popHelp('calendar',$('goalBox'));else logModal();});
$('goalBox').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('goalBox').click();}});
document.addEventListener('click',e=>{
  const q=e.target.closest('[data-help]');
  if(q&&!q.closest('#modalRoot')&&!q.closest('.pop')){e.stopPropagation();e.preventDefault();popHelp(q.dataset.help,q);return;}
  if(!e.target.closest('.pop')&&!e.target.closest('#gods'))closePop();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePop();});
if(PHOTO_URL){const im=$('photo');im.src=PHOTO_URL;im.hidden=false;$('silh').style.display='none';im.onerror=()=>{im.hidden=true;$('silh').style.display='';};}
$('bNew').addEventListener('click',()=>{if(busy)return;
  openModal('info','Career','Start a new career?','<p>The current career will be lost.</p><div class="choices"><button type="button" class="choice" id="mYes"><div class="ct">Start over</div></button><button type="button" class="choice" id="mNo"><div class="ct">Keep playing</div></button></div>');
  $('mYes').addEventListener('click',()=>{closeModal();start();});$('mNo').addEventListener('click',closeModal);});
function start(){endShown=false;view='home';newGame(Math.floor(Math.random()*2147483647));render();}
window.__sim={get G(){return G},act,obtainWisdom,get view(){return view}};
fit();
const boot=d=>{try{if(d&&d.G){G=d.G;rngState=d.r;endShown=!!G.ended;render();return;}}catch(e){}start();};
if(window.claude&&window.claude.hot){try{window.claude.hot.snapshot(()=>({G,r:rngState}));}catch(e){}}
window.claude?.hot?.ready?window.claude.hot.ready(boot):boot(window.claude?.hot?.data??{});
