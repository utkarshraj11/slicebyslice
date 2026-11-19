import { Tile } from '../tile';
import { INK, C_WIN, iso, f1, ln, box, faceL, faceR, frect, ftext } from '../iso';
import { storefront, windowsSVG } from '../parts';

export function buildHoboken(): Tile {
  const t=new Tile('hoboken',-2,45,16,{hood:'hoboken',top:7});
  t.rect(0,0,16,1.5,'#e7ddc9');
  t.road(0,1.5,16,1.0,'x',{line:false});
  t.road(0,7.0,16,1.4,'x');
  t.road(5.0,2.5,1.0,13.5,'y',{line:false});
  t.road(13.0,2.5,1.0,13.5,'y',{line:false});
  t.road(0,14.4,16,1.0,'x',{line:false});
  t.xwalk(4.4,7.0,.5,1.4); t.xwalk(6.1,7.0,.5,1.4); t.xwalk(12.4,7.0,.5,1.4); t.xwalk(14.1,7.0,.5,1.4);
  t.add(0,-.05,16,.15,t.rail(0,.12,16,.12));
  for(let x=1;x<15;x+=2.6){t.tree(x,.8,.9);} t.bench(2.3,.6,'x'); t.bench(7.5,.6,'x'); t.bench(12.6,.6,'x');
  t.crowd(.5,.4,15,.9,5);
  // between Sinatra & Washington
  t.b(.3,3.1,1.6,3.2,4.4,'#a8705a',{stoop:'L',colsL:2});
  t.pizza('bennys',2.0,3.1,2.8,3.2,3.9,'#f0e2c2',{front:'L',sign:"BENNY TUDINO'S",signSize:5.8,awn:['#2f6fb0','#fff6e8'],signBg:'#2f6fb0',signFg:'#fff6e8'});
  t.queue(2.2,6.7,'x',4,.45);
  t.b(6.2,3.1,1.4,3.2,4.6,'#b8806a',{stoop:'L',colsL:1});
  t.b(7.6,3.1,2.4,3.2,4.0,'#f3dfe0',{g0:2.75,extraFaces:(FL)=>storefront(FL,.12,2.28,{sign:'BAKERY',awn:['#e79bb3','#fff6f2'],signBg:'#fff6f2',signFg:'#c25b7c',wall:'#f3dfe0'})});
  t.queue(7.9,6.7,'x',4,.42);
  t.pizza('basiles',10.0,3.1,2.8,3.2,4.2,'#e9d9bf',{front:'LR',sign:"BASILE'S",awn:['#c8423a','#f6efe2'],signBg:'#c8423a',signFg:'#fff6e8'});
  // Hoboken Terminal clock tower
  {const X=t.X(14.3),Y=t.Y(2.9);
   let s=box(X-.1,Y+1.7,0,1.9,1.7,2.2,'#e3d6bd',{top:'#5f9e8a'});
   s+=box(X,Y,0,1.5,1.5,5.4,'#e8dcc3');
   const FL=faceL(X,Y,0,1.5,1.5),FR=faceR(X,Y,0,1.5,1.5);
   s+=windowsSVG(FL,2,3,.6,3.6,.3,.55,C_WIN);s+=windowsSVG(FR,2,3,.6,3.6,.3,.55,C_WIN);
   for(const F of [FL,FR]){const p=F.at(.75,4.5,.02);s+=`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="6.5" fill="#fffaf0" stroke-width="1"/>`+ln(p,[p[0],p[1]-4.5],INK,1)+ln(p,[p[0]+3,p[1]+1],INK,1);}
   s+=box(X-.08,Y-.08,5.4,1.66,1.66,.18,'#5f9e8a');
   s+=box(X+.25,Y+.25,5.58,1.0,1.0,.9,'#6fae98');
   const top=iso(X+.75,Y+.75,6.48);s+=`<path d="M${f1(top[0]-13.5)} ${f1(top[1]+2)}L${f1(top[0])} ${f1(top[1]-22)}L${f1(top[0]+13.5)} ${f1(top[1]+2)}Z" fill="#5f9e8a"/>`;
   t.add(14.2,2.9,16,6.3,s);}
  // Monroe Center + Panello
  t.pizza('panello',.4,9.2,4.4,4.6,5.6,'#a9553f',{front:'L',u0:.15,u1:2.7,sign:'PANELLO',awn:['#3f5a4c','#f3ead8'],signBg:'#f3ead8',signFg:'#3f5a4c',
    b:{fh:1.25,chimney:true},faces:(FL)=>frect(FL,2.9,.15,4.25,1.3,'#cfe3ee','stroke-width=".7"')+ftext(FL,2.2,4.95,'MONROE CENTER',7.5,'#f6ead6',{ls:1.6})});
  t.queue(.8,14.1,'x',3,.45);
  // rowhouses + park
  const rc=['#b8705c','#9c6a55','#c48a62','#a8705a'];
  for(let i=0;i<4;i++) t.b(6.2+i*1.6,11.8,1.6,2.2,4.0+((i*7)%3)*.3,rc[i],{colsL:2,colsR:2,fire:i===1?'L':undefined});
  t.grass(6.4,9.1,6.2,2.4);
  t.tree(7.0,9.7); t.tree(9.2,10.9,.9); t.tree(11.8,9.8); t.bench(10.3,9.9,'x'); t.crowd(7.4,9.5,4.6,1.6,5);
  t.tree(14.6,9.6,.9); t.tree(15.4,12.0); t.tree(14.6,14.0,.9);
  for(let x=1;x<15;x+=3.2) t.tree(x,15.75,.75);
  t.lamp(4.7,6.7); t.lamp(12.7,8.7); t.hydrant(6.3,8.7);
  t.parked(14.6,11.5,'y','#3f7fbf');
  t.car('x',0,16,7.7,1.3,'#f08a4b'); t.car('x',0,16,7.7,1.3,'#e8e4dc');
  t.car('x',16,0,2.0,1.2,'#5aa469'); t.car('y',2.5,16,13.5,1.0,'#2f3a48');
  t.walker('x',.3,15.7,1.1,.4); t.walker('x',.3,15.7,.5,.5); t.walker('x',.3,15.7,6.55,.45); t.walker('x',.3,15.7,8.75,.4); t.walker('x',.3,15.7,14.1,.4);
  return t;
}
