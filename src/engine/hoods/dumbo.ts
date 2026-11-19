import { Tile } from '../tile';
import { INK, C_STONE, S, iso, f1, poly, ln, dk, box, faceL, faceR, frect, ftext, cyl } from '../iso';
import { storefront } from '../parts';
import { deckSVG, cablesSVG } from '../bridge';

export function buildDumbo(): Tile {
  const t=new Tile('dumbo',40,-2,16,{hood:'dumbo',top:8});
  t.cobble(0,10.4,16,1.2);
  t.road(4.6,0,1.2,10.4,'y',{line:false});
  t.plaza(0,12.4,4.6,3.6,'#e5dccb');
  t.grass(6.6,12.4,9.4,3.0);
  t.rect(0,15.3,16,.7,'#e2d3b7');
  t.xwalk(4.6,9.8,1.2,.45);
  // anchorage + deck over DUMBO (world x 41.5–43.5)
  {const X=t.X(1.2),Y=t.Y(6.0);
   let s=box(X,Y,0,2.6,3.0,2.3,C_STONE);
   const F=faceL(X,Y,0,2.6,3.0),FR=faceR(X,Y,0,2.6,3.0);
   s+=frect(F,.6,.0,2.0,1.4,dk(C_STONE,.12));s+=frect(FR,.5,.3,2.5,.5,dk(C_STONE,.06),'stroke="none"');s+=frect(FR,.5,1.0,2.5,1.2,dk(C_STONE,.06),'stroke="none"');
   s+=poly([iso(X+.3,Y,2.31),iso(X+2.3,Y,2.31),iso(X+2.3,Y+3,2.31),iso(X+.3,Y+3,2.31)],'#8d8478');
   t.add(1.2,6.0,3.8,9.0,s);}
  t.add(1.5,9.0,3.5,10.4,deckSVG(t.X(1.5),t.Y(9.0),t.Y(10.4)));
  t.add(1.5,10.4,3.5,11.6,deckSVG(t.X(1.5),t.Y(10.4),t.Y(11.6)),{above:true});
  {let s=box(t.X(1.65),t.Y(12.6),0,1.7,.6,1.9,C_STONE);
   s+=deckSVG(t.X(1.5),t.Y(11.6),t.Y(16));
   s+=cablesSVG(41.7,43.3,5.5,14,t.Y(9.0));
   t.add(1.5,11.6,3.5,16,s,{above:true});}
  // Grimaldi's (1 Front St)
  t.pizza('grimaldis',1.6,1.2,2.2,3.0,3.6,'#b4523e',{front:'R',sign:"GRIMALDI'S",awn:['#f4efe3','#2c5a3e'],signBg:'#f4efe3',signFg:'#2c5a3e',b:{tower:true,tu:.3,tv:.3}});
  t.b(.2,.3,1.3,4.0,4.4,'#9b5a48');
  t.queue(4.25,.9,'y',8,.48);
  // Ignazio's (4 Water St)
  t.pizza('ignazios',7.4,6.9,2.8,2.8,3.4,'#e8dcc4',{front:'L',sign:"IGNAZIO'S",awn:['#2f6b4f','#f4efe3'],signBg:'#2f6b4f',signFg:'#f4efe3'});
  // warehouses
  t.grass(6.6,.6,2.0,5.4); t.tree(7.1,1.3,.9); t.tree(8.1,2.9,.8); t.tree(7.2,4.6,.9); t.bench(8.2,4.4,'y'); t.crowd(6.8,2.2,1.6,1.8,2);
  t.b(8.9,.5,3.3,5.6,5.8,'#b8664f',{tower:true,tu:.6,fh:1.2,extraFaces:(FL)=>ftext(FL,1.65,5.05,'EST. 1898',7,'#f3e6d0',{ls:1.5})});
  t.b(12.4,.5,3.3,5.6,6.6,'#9b5a48',{fh:1.2});
  t.b(10.4,6.9,5.4,2.8,4.2,'#c98a62',{g0:2.75,extraFaces:(FL)=>storefront(FL,.15,2.65,{sign:'BOOKS',awn:['#5a6e7a','#f4efe3'],wall:'#c98a62'})+storefront(FL,2.75,5.25,{sign:'COFFEE',awn:['#f2c230','#2f3a48'],signBg:'#2f3a48',signFg:'#f2c230',wall:'#c98a62'})});
  // carousel pavilion
  {const X=t.X(9.6),Y=t.Y(12.7),w=3.0,d=2.2;
   let s=box(X,Y,0,w,d,.18,'#e6ddc9');
   const cx=X+w/2,cy=Y+d/2;
   s+=cyl(cx,cy,.18,.85,.18,'#f2d9a6','#f7e7c4');
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const px=cx+Math.cos(a)*.62,py=cy+Math.sin(a)*.62;s+=ln(iso(px,py,.36),iso(px,py,1.25),'#d4a23a',1);}
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3;const p=iso(cx+Math.cos(a)*.62,cy+Math.sin(a)*.62,.62);s+=`<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="3.6" ry="2.2" fill="${['#f7f3ea','#e8b04f','#e07aa0','#7fb2d9','#f7f3ea'][i]}" stroke-width=".6"/>`;}
   const b=iso(cx,cy,1.25),rx=1.2247*.95*S,ry=.7071*.95*S;
   s+=`<path d="M${f1(b[0]-rx)} ${f1(b[1])}L${f1(b[0])} ${f1(b[1]-14)}L${f1(b[0]+rx)} ${f1(b[1])}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(b[0]-rx)} ${f1(b[1])}Z" fill="#d9473a"/>`;
   for(let i=0;i<4;i++){const xa=b[0]-rx+i*rx/2+rx*.15;s+=`<path d="M${f1(xa)} ${f1(b[1]+ry*.6)}L${f1(b[0])} ${f1(b[1]-14)}L${f1(xa+rx*.22)} ${f1(b[1]+ry*.75)}Z" fill="#fff4e4" stroke="none"/>`;}
   s+=box(X,Y,.18,w,d,1.85,'#d6ebf5',{top:'#e2f1f8',ex:'fill-opacity=".38"'});
   const F=faceL(X,Y,.18,w,d),FR=faceR(X,Y,.18,w,d);
   for(let u=.5;u<w;u+=.5)s+=ln(F.at(u,0),F.at(u,1.85),INK,.6);
   for(let u=.55;u<d;u+=.55)s+=ln(FR.at(u,0),FR.at(u,1.85),INK,.6);
   t.add(9.6,12.7,12.6,14.9,s);}
  t.tree(7.2,13.0); t.tree(8.4,14.6,.9); t.tree(13.6,13.0,1.05); t.tree(15.2,14.2,.9); t.tree(14.4,12.9,.8);
  t.bench(7.6,14.2,'x'); t.bench(13.8,14.5,'x');
  t.crowd(.6,13.0,3.4,2.0,6); t.crowd(7.0,13.3,2.2,1.6,3); t.crowd(12.9,13.6,2.6,1.4,3);
  t.lamp(6.4,11.9); t.lamp(10.3,10.0); t.lamp(14.0,11.9); t.hydrant(6.5,9.85);
  t.parked(13.0,10.0,'x','#5aa469');
  t.car('x',0,16,11.0,1.1,'#f4c430',{taxi:true}); t.car('x',0,16,11.0,1.1,'#e8e4dc');
  t.car('y',0,10.4,5.2,1.0,'#d9473a');
  t.walker('x',.4,15.6,15.65,.4); t.walker('x',.4,15.6,15.65,.5); t.walker('x',6.2,15.6,12.0,.45); t.walker('y',.4,10,6.2,.4);
  return t;
}
