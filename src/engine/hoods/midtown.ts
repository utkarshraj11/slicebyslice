import { Tile } from '../tile';
import { INK, C_GRASS, iso, f1, ln, box, faceL, faceR, frect, ftext, cyl } from '../iso';
import { bld, storefront, personSVG } from '../parts';

export function buildMidtown(): Tile {
  const t=new Tile('midtown',0,22,16,{hood:'midtown',top:9});
  t.road(0,8.6,16,2,'x');
  t.road(4.2,0,1.4,8.6,'y',{line:false}); t.road(4.2,10.6,1.4,5.4,'y',{line:false});
  t.road(11.2,0,1.2,8.6,'y',{line:false}); t.road(11.2,10.6,1.2,5.4,'y',{line:false});
  t.xwalk(3.5,8.6,.55,2); t.xwalk(5.75,8.6,.55,2); t.xwalk(10.55,8.6,.55,2); t.xwalk(12.5,8.6,.55,2);
  t.xwalk(4.2,7.95,1.4,.5); t.xwalk(11.2,7.95,1.2,.5); t.xwalk(4.2,10.75,1.4,.5); t.xwalk(11.2,10.75,1.2,.5);
  // Columbus Circle
  t.circ(2.1,13.35,2.05,'#e4ddce'); t.circ(2.1,13.35,1.25,C_GRASS); t.circ(2.1,13.35,.62,'#e4ddce');
  const cx=t.X(2.1), cy=t.Y(13.35);
  let mon=box(cx-.42,cy-.42,0,.84,.84,.45,'#e8e2d5')+cyl(cx,cy,.45,.17,4.3,'#f1ece2','#e6e0d2');
  const top=iso(cx,cy,4.75);
  mon+=`<path d="M${f1(top[0]-2.4)} ${f1(top[1])}l1 -6h2.8l1 6z" fill="#8f9aa0"/><circle cx="${f1(top[0])}" cy="${f1(top[1]-8)}" r="2" fill="#8f9aa0"/>`;
  t.add(1.7,12.95,2.5,13.75,mon);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.4;t.tree(2.1+Math.cos(a)*1.65,13.35+Math.sin(a)*1.65,.8);}
  t.crowd(.6,11.6,3,1,3); t.person(3.7,14.9); t.person(.5,15.4);
  t.cart(3.75,11.55);
  // Pop's
  t.b(.5,.5,3.4,4.1,6.6,'#c4ae93',{tower:true,fire:'R'});
  t.pizza('pops',.5,4.9,3.4,3.1,4.3,'#efe1c4',{front:'LR',sign:"POP'S PIZZA",awn:['#d9473a','#fff6e8'],signBg:'#d9473a',signFg:'#fff6e8'});
  t.queue(.7,8.3,'x',4,.5); t.lamp(3.95,8.3);
  // billboard block + Lazzara's
  t.b(6.0,.5,4.6,4.0,8.2,'#d9d4cb',{noWinL:true,noWinR:true,extraFaces:(FL,FR)=>{
    let s=frect(FL,.25,4.3,4.35,7.6,'#d9473a','stroke-width="1"')+ftext(FL,2.3,6.5,'EAT A SLICE',13,'#fff6e8',{font:'Fraunces, Georgia, serif',w:800})+ftext(FL,2.3,5.1,'it’s 3am somewhere',7,'#ffe3a8');
    s+=frect(FL,.25,1.0,4.35,3.9,'#2f3a48','stroke-width="1"')+ftext(FL,2.3,2.9,'BROADWAY',11,'#f2c230',{ls:2})+ftext(FL,2.3,1.75,'★ ★ ★ ★ ★',7,'#ffffff');
    s+=frect(FR,.25,4.0,3.75,7.6,'#3f7fbf','stroke-width="1"')+ftext(FR,2.0,6.4,'NYC',17,'#ffffff',{font:'Fraunces, Georgia, serif',w:800})+ftext(FR,2.0,4.9,'never sleeps',7.5,'#f2c230');
    s+=frect(FR,.25,1.0,3.75,3.6,'#f2c230','stroke-width="1"')+ftext(FR,2.0,2.3,'TAXI!',13,INK,{w:800});
    return s;}});
  t.b(6.0,4.9,2.0,3.2,3.6,'#d8b98f',{g0:2.75,extraFaces:(FL)=>storefront(FL,.12,1.88,{sign:'DELI',awn:['#3f8f5a','#f4efe3'],wall:'#d8b98f'})});
  t.pizza('lazzaras',8.0,4.9,2.6,3.2,4.9,'#c46a52',{front:'R',awn:null,sign:null,b:{fire:'L'},faces:(_FL,FR)=>{
    let s=frect(FR,.25,2.75,2.95,3.4,'#f6efe2','stroke-width=".8"')+ftext(FR,1.6,3.08,"LAZZARA'S",7.4,'#c0392b',{font:'Fraunces, Georgia, serif',w:800});
    s+=frect(FR,.3,1.45,2.9,1.95,'#2f3a48','stroke-width=".7"')+ftext(FR,1.6,1.7,'PIZZA CAFE ↑ 2nd fl',5.6,'#f2c230');
    return s;}});
  t.queue(10.9,6.0,'y',2,.5);
  // garment center
  t.b(6.0,11.2,4.6,4.4,5.4,'#cdbfac',{fire:'R',tower:true,tu:.6});
  const rack=(x:number,y:number)=>{const X=t.X(x),Y=t.Y(y);let s=ln(iso(X,Y-.35,0),iso(X,Y-.35,.95),'#6b625a',1)+ln(iso(X,Y+.35,0),iso(X,Y+.35,.95),'#6b625a',1)+ln(iso(X,Y-.35,.95),iso(X,Y+.35,.95),'#6b625a',1.2);
    const cs=['#e07aa0','#3f7fbf','#f2c230','#5aa469','#d9473a'];for(let i=0;i<5;i++){const a=iso(X,Y-.28+i*.14,.92);s+=`<rect x="${f1(a[0]-2.6)}" y="${f1(a[1])}" width="5.2" height="12" rx="1" fill="${cs[i]}" stroke-width=".5"/>`;}return s;};
  t.add(10.75,12.0,10.95,12.8,rack(10.85,12.4)); t.add(10.75,13.6,10.95,14.4,rack(10.85,14.0));
  // Empire State
  {const X=t.X(13.0),Y=t.Y(.6),c='#e2dccf';
   let s=bld(X,Y,2.8,2.8,3.0,c,{g0:.4});
   s+=box(X+.4,Y+.4,3.0,2.0,2.0,7.2,c,{top:'#ebe6dc'});
   const FL=faceL(X+.4,Y+.4,3.0,2.0,2.0),FR=faceR(X+.4,Y+.4,3.0,2.0,2.0);
   for(let u=.2;u<2;u+=.2){s+=frect(FL,u-.04,.2,u+.04,7.0,'#bfb6a4','stroke="none"');s+=frect(FR,u-.04,.2,u+.04,7.0,'#b3aa98','stroke="none"');}
   s+=box(X+.75,Y+.75,10.2,1.3,1.3,2.0,c,{top:'#ebe6dc'});
   const F2=faceL(X+.75,Y+.75,10.2,1.3,1.3),F3=faceR(X+.75,Y+.75,10.2,1.3,1.3);
   for(let u=.18;u<1.2;u+=.2){s+=frect(F2,u-.035,.15,u+.035,1.85,'#bfb6a4','stroke="none"');s+=frect(F3,u-.035,.15,u+.035,1.85,'#b3aa98','stroke="none"');}
   s+=box(X+1.0,Y+1.0,12.2,.8,.8,.9,'#d8d0c0');
   s+=cyl(X+1.4,Y+1.4,13.1,.22,1.0,'#cfc7b6');
   s+=ln(iso(X+1.4,Y+1.4,14.1),iso(X+1.4,Y+1.4,16.6),INK,1.4);
   t.add(13.0,.6,15.8,3.4,s);}
  t.b(13.0,4.6,2.8,3.4,3.3,'#e6d6bd',{g0:2.75,extraFaces:(FL)=>storefront(FL,.12,2.68,{sign:'BAGELS',awn:['#f2c230','#fff6e8'],wall:'#e6d6bd'})});
  t.subway(14.2,8.0,'x');
  // little plaza
  t.grass(13.1,11.5,2.5,3.9);
  t.tree(13.6,12.0); t.tree(15.1,12.2,.9); t.tree(13.7,14.7,.9); t.tree(15.1,14.9);
  t.bench(14.35,13.3,'y'); t.crowd(13.3,12.6,2.0,1.6,4);
  t.cart(12.85,11.15,['#d9473a','#f6efe3']);
  t.hydrant(10.75,8.3); t.lamp(6.1,10.95); t.lamp(12.7,8.3);
  // movers
  t.car('x',16,0,9.1,1.7,'#f4c430',{taxi:true}); t.car('x',16,0,10.1,1.5,'#f4c430',{taxi:true});
  t.car('x',16,0,9.1,1.7,'#3f7fbf'); t.car('x',16,0,10.1,1.4,'#e8e4dc',{bus:true,len:2.6});
  t.car('y',16,0,11.8,1.3,'#f4c430',{taxi:true}); t.car('y',0,16,4.9,1.2,'#d9473a');
  t.walker('x',.5,15.5,8.35,.45); t.walker('x',1,15,10.95,.5); t.walker('x',6,15.5,10.95,.4); t.walker('y',11.2,15.6,12.75,.4);
  t.walker('y',11.3,15.5,10.95,.35,{svg:personSVG({shirt:'#5aa469'})+`<g transform="translate(9,-2)">${rackSVGsmall()}</g>`});
  return t;
}
function rackSVGsmall(){const cs=['#e07aa0','#3f7fbf','#f2c230','#d9473a'];let s='<path d="M-6 0V-17M6 0V-17M-7 -17H7" stroke="#6b625a" stroke-width="1.1" fill="none"/>';cs.forEach((c,i)=>s+=`<rect x="${-5+i*2.6}" y="-16" width="2.6" height="10" fill="${c}" stroke-width=".4"/>`);return s;}
