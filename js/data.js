/* Grand Masters Career Sim — game data: constants, Oguri Cap, the fixed MLB deck, card and trainee events, stat score table. */
"use strict";
/* ================= DATA ================= */
const STAT=['Speed','Stamina','Power','Guts','Wit'], SH=['Spd','Sta','Pow','Gut','Wit','SP'];
const COL=['Red','Blue','Yellow'], GOD=['Darley Arabian','Godolphin Barb','Byerley Turk'];
const BASIC_LIMIT=[1800,1600,1800,1400,1400]; // internal: above 1200 counts double (game halves gains)
const TBV=[
 [[10,0,3,0,0,5,-19],[11,0,3,0,0,5,-21],[12,0,3,0,0,5,-22],[13,0,4,0,0,5,-24],[14,0,5,0,0,5,-25],[15,0,6,0,0,5,-26]],
 [[0,8,0,6,0,5,-20],[0,9,0,6,0,5,-22],[0,10,0,7,0,5,-23],[0,11,0,7,0,5,-25],[0,12,0,8,0,5,-26],[0,13,0,9,0,5,-27]],
 [[0,4,9,0,0,5,-20],[0,4,10,0,0,5,-22],[0,4,11,0,0,5,-23],[0,5,12,0,0,5,-25],[0,6,13,0,0,5,-26],[0,7,14,0,0,5,-27]],
 [[2,0,3,9,0,5,-20],[2,0,3,10,0,5,-22],[2,0,3,11,0,5,-23],[3,0,3,12,0,5,-25],[3,0,4,13,0,5,-26],[4,0,5,14,0,5,-27]],
 [[2,0,0,0,8,5,5],[2,0,0,0,9,5,5],[2,0,0,0,10,5,5],[3,0,0,0,11,5,5],[4,0,0,0,12,5,5],[5,0,0,0,13,5,5]]];
const VENUS_TRAIN=[0,5,8,11,13,15], RED_COST=[0,10,15,18,20,23], BLUE_HINT=[0,20,25,30,33,35], YEL_EVENT=[0,10,15,20,23,25], YEL_CHAIN=[0,20,40,60,80,90];
const BLUE_REL=[[6,0,2,0,0,0],[0,6,0,2,0,0],[0,2,6,0,0,0],[1,0,1,6,0,0],[0,0,0,0,6,5]];
const SPIRIT_P=[[4,1,4,1,1,4],[1,4,1,4,1,4],[1,4,4,1,1,4],[17,6,17,17,6,17],[4,1,1,1,4,4],[1,1,1,1,1,1],[1,1,1,1,1,1],[1,1,1,1,1,1]];
const PASSION_END=[0,0,.5,.5,.5,.8,.8,.8,1,1,1,1,1];
const UMA={name:'Oguri Cap',init:[124,81,130,103,112],growth:[20,0,10,0,0]};
const BLUE_FACTORS=[2,1,2,0,1], INHERIT_EXTRA=[15,0,15,0,0,40];
const RACES={11:'Make Debut',32:'NHK Mile Cup (G1)',45:'Japan Cup (G1)',47:'Arima Kinen (G1)',67:'Tenno Sho Autumn (G1)',71:'Arima Kinen (G1)',77:'Grand Masters'};
const TOTAL=78;
const CARDS=[
 {id:30137,name:'Ancestors & Guides',ab:'A&G',type:5,yq:20,gj:0,xl:10,bonus:[1,1,1,0,0,0],init:[0,0,35,0,0,0],initJB:20,saiHou:0,hintProb:0,deYi:0,wiz:2},
 {id:30028,name:'Kitasan Black',ab:'KB',type:0,yq:25,gj:30,xl:15,bonus:[0,0,1,0,0,0],init:[0,0,0,0,0,0],initJB:35,saiHou:5,hintProb:30,deYi:100,wiz:0},
 {id:30101,name:'Agnes Tachyon',ab:'AT',type:0,yq:20,gj:0,xl:5,bonus:[1,0,0,0,0,2],init:[35,0,0,0,0,0],initJB:20,saiHou:0,hintProb:50,deYi:80,wiz:0},
 {id:30016,name:'Super Creek',ab:'SC',type:1,yq:37.5,gj:0,xl:15,bonus:[0,1,0,0,0,0],init:[0,35,0,0,0,0],initJB:30,saiHou:10,hintProb:0,deYi:55,wiz:0},
 {id:30134,name:'Mejiro Ramonu',ab:'MR',type:4,yq:35,gj:0,xl:20,bonus:[0,0,0,0,2,1],init:[0,0,0,0,0,0],initJB:20,saiHou:5,hintProb:60,deYi:50,wiz:5},
 {id:30010,name:'Fine Motion',ab:'FM',type:4,yq:37.5,gj:30,xl:15,bonus:[0,0,0,0,1,0],init:[0,0,0,0,35,0],initJB:15,saiHou:10,hintProb:0,deYi:35,wiz:5}];
const TYPE_NAME=['Speed','Stamina','Power','Guts','Wit','Group'];
const EXTRA_HEADS=[{ab:'Dir',name:'Director Akikawa'},{ab:'Rep',name:'Reporter Etsuko'}];

/* Card events. e = effect object: s:[spd,sta,pow,gut,wit], sp, en, mood, bond, hint:[name,lv], cond, ok/ko = success/failure branches */
const CARD_EVENTS={
 1:{chain:[
   {n:'Chasing Brilliance (1/3)',e:{s:[2,0,2,0,2],bond:5,mood:1}},
   {n:'Paying It Forward (2/3)',ch:[{t:'Guess you better get well soon.',e:{en:10,bond:5,mood:1}},{t:'Bounce back even better than before!',e:{bond:5},ok:{s:[10,0,0,0,0],hint:['Straightaway Adept',3]},ko:{s:[5,0,0,0,0],hint:['Straightaway Adept',1]}}]},
   {n:'We Walk Together (3/3)',e:{bond:5},ok:{s:[10,0,10,0,0],hint:['Professor of Curvature',3]},ko:{s:[5,0,5,0,0],hint:['Professor of Curvature',1]}}],
  rnd:[
   {n:'Ah, Friendship',ch:[{t:'You have a good set of pipes!',e:{mood:1,bond:5,s:[0,0,5,0,0]}},{t:"Now you've just gotta get ready for the test!",e:{en:10,bond:5}}]},
   {n:'Ah, Home Sweet Home',ch:[{t:'Some good quality shoes would work.',e:{s:[5,0,10,0,0],bond:5}},{t:'A training guide would be good.',e:{bond:5,cond:'Practice Perfect ○'}}]}]},
 2:{chain:[
   {n:'Rapport (1/3)',ch:[{t:'No, that was just a coincidence!',e:{mood:1,en:10,bond:5}},{t:'Any more would be really scary...',e:{s:[5,5,0,0,5],bond:5},ok:{hint:['Pace Chaser Straightaways ○',3]},ko:{hint:['Pace Chaser Straightaways ○',1]}}]},
   {n:'Dreams (2/3)',e:{s:[5,5,0,0,5],sp:10,bond:5}},
   {n:'Velocity (3/3)',e:{},ok:{en:10,sp:30,hint:['Unstoppable',3]},ko:{en:5,sp:10,hint:['Unstoppable',1]}}],
  rnd:[
   {n:'The Correlation between Sleep and Efficiency',ch:[{t:"You're just going to power through it?",e:{s:[0,0,5,0,5],bond:5}},{t:'Sounds like you\'re writing a pretty complicated thesis.',e:{s:[0,0,0,0,10],bond:5}}]},
   {n:'Happenstance Introduced Through Intervention',ch:[{t:'A running style.',e:{bond:5,hint:['Late Surger Savvy ○',1]}},{t:'Decision-making.',e:{s:[0,0,0,0,10],bond:5}}]}]},
 3:{chain:[
   {n:'Freshly Made in Ample Amounts (1/3)',e:{s:[0,5,0,0,0],en:10,bond:5}},
   {n:'The Taste of Warmth (2/3)',e:{s:[0,5,5,0,0],bond:5}},
   {n:'Have a Second Helping! (3/3)',e:{s:[0,10,5,0,0],bond:5,hint:['Swinging Maestro',1]}}],
  rnd:[
   {n:'Leave it to Me to Help Out!',ch:[{t:'Could you give me some pointers on training?',e:{en:15,bond:5}},{t:'Would you like to train with us?',e:{s:[0,10,0,0,0],bond:5}}]},
   {n:'Leave it to Me to Be Considerate!',ch:[{t:'Cheer her on.',e:{bond:5,hint:['Deep Breaths',1]}},{t:'Get her a drink.',e:{en:10,s:[0,5,0,0,0],bond:5}}]}]},
 4:{approx:true,chain:[
   {n:'Zoisite Eyes (1/3)',e:{s:[0,0,0,0,5],sp:10,bond:5}},
   {n:'Seen Through Crystal (2/3)',ch:[{t:'Look closer.',e:{s:[0,0,0,0,10],bond:5}},{t:'Take a breather together.',e:{en:10,bond:5}}]},
   {n:'Wearing Out Diamonds (3/3)',e:{bond:5},ok:{s:[5,0,0,0,10],sp:20,hint:['Ramonu chain skill',3]},ko:{s:[0,0,0,0,5],sp:10,hint:['Ramonu chain skill',1]}}],
  rnd:[
   {n:'At a Glance',e:{s:[0,0,0,0,5],bond:5}},
   {n:'At Your Service',ch:[{t:'Accept the gesture.',e:{en:10,bond:5}},{t:'Ask for advice.',e:{s:[0,0,0,0,8],bond:5}}]}]},
 5:{chain:[
   {n:'Lovely Training Weather ♪ (1/3)',ch:[{t:'Running with a friend is even more fun.',e:{s:[0,0,0,0,5],bond:5,sp:20}},{t:'You should focus on training.',e:{s:[10,5,0,0,0]}},{t:"It's important to train and have fun!",e:{bond:5,cond:'Practice Perfect ○'}}]},
   {n:'Lovely Concert Weather ♪ (2/3)',e:{en:10,sp:10}},
   {n:'Lovely Racing Weather ♪ (3/3)',e:{s:[0,0,0,5,0],en:-10},ok:{s:[0,0,0,0,10],sp:15,hint:['Speed Star',3]},ko:{s:[0,0,0,0,5],sp:5,hint:['Prepared to Pass',1]}}],
  rnd:[
   {n:'Wonderful New Shoes',ch:[{t:'Lightweight shoes.',e:{s:[5,0,0,0,0],sp:10,bond:5}},{t:'Heavy shoes.',e:{en:-10,s:[0,5,0,0,0],sp:20,bond:5}}]},
   {n:'Reminiscent Clover',ch:[{t:'The final corner.',e:{bond:5,hint:['Corner Adept ○',1]}},{t:'The final straight.',e:{s:[0,0,0,15,0],bond:5}}]}]}};
/* Conditions (umamusu.wiki "Conditions"). Trigger rates in the engine are estimates. */
const CONDS={
 'Night Owl':{bad:true,d:'Each turn, may lose 10 energy or 1 mood. Cured by the Infirmary or a +70 energy rest.'},
 'Skin Outbreak':{bad:true,d:'Each turn, may lose 1 mood. Comes from racing 3+ turns in a row. Cured by the Infirmary.'},
 'Practice Poor':{bad:true,d:'Training failure +2%. Comes from failed training. Cured by the Infirmary or Practice Perfect.'},
 'Migraine':{bad:true,d:'Mood cannot increase. Cured by the Infirmary.'},
 'Slacker':{bad:true,d:'May skip a stat training, wasting the turn. Cured by the Infirmary or training with Reporter Etsuko.'},
 'Slow Metabolism':{bad:true,d:'Speed cannot increase. Comes from eating events. Cured by the Infirmary.'},
 'Practice Perfect ○':{bad:false,d:'Training failure −2%.'},
 'Charming ○':{bad:false,d:'Bond gains with support cards +2.'},
 'Hot Topic':{bad:false,d:'Bond gains with Director Akikawa and Reporter Etsuko +40%.'}};
const TRAINEE_EVENTS=[
 {n:'Bottomless Appetite',ch:[{t:'Let her eat her fill.',e:{en:15,risk:{cond:'Slow Metabolism',p:0.25}}},{t:'Turn the snack run into a jog.',e:{s:[0,5,5,0,0],en:-5}}]},
 {n:'Running Partner Wanted',e:{s:[5,0,0,5,0]}},
 {n:'Study Session',e:{s:[0,0,0,0,8]}},
 {n:'Ashen Determination',e:{s:[0,0,5,5,0],sp:10}},
 {n:'Hometown Letter',e:{mood:1,en:5}},
 {n:'Midnight Snack',ch:[{t:'Join her.',e:{en:10,mood:1}},{t:'Send her to bed.',e:{s:[0,5,0,0,0]}}]}];

const OUTINGS=[
 {n:'Outing with Darley Arabian',c:0,d:'+45 energy, +1 mood, +34 SP',f(){addVital(45);addMood(1);G.sp+=34;addBond(0,5);}},
 {n:'Outing with Godolphin Barb',c:1,d:'+32 energy, +1 mood, +12 Spd/Wit, +10 SP',f(){addVital(32);addMood(1);addStat(0,12);addStat(4,12);G.sp+=10;addBond(0,5);}},
 {n:'Outing with Byerley Turk',c:2,d:'+4 max energy, +32 energy, +1 mood, +8 Sta/Pow/Gut, +15 SP',f(){G.maxVital+=4;addVital(32);addMood(1);addStat(1,8);addStat(2,8);addStat(3,8);G.sp+=15;addBond(0,5);}},
 {n:'Ancestors & Guides outing I',c:-1,d:'+45 energy, +1 mood, +15 Sta/Pow/Gut (needs the three goddess outings)',f(){addVital(45);addMood(1);addStat(1,15);addStat(2,15);addStat(3,15);addBond(0,5);}},
 {n:'Ancestors & Guides outing II',c:-1,d:'+52 energy, +1 mood, +9 all stats, +86 SP, Passion Zone',f(){addVital(52);addMood(1);addAll(9);G.sp+=86;addBond(0,5);G.gc.passion=true;}}];

