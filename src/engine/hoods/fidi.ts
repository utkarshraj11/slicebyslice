import { Tile } from '../tile';
import { C_STONE, C_WIN, iso, f1, pts, poly, ln, dk, box, faceL, faceR, frect, cyl } from '../iso';
import { windowsSVG } from '../parts';
import { cableZ } from '../bridge';

export function buildFidi(): Tile {
  const t=new Tile('fidi',40,22,16,{hood:'fidi',top:9});
  t.road(7.0,0,1.2,16,'y',{line:false});
  t.road(0,3.6,7.0,1.2,'x',{line:false});
  t.plaza(9.0,9.4,7.0,3.3);
  t.xwalk(7.0,9.6,1.2,.45); t.xwalk(6.35,3.6,.5,1.2);
  // bridge anchorage + ramp (bridge at world x 41.5–43.5)
  {const X=t.X(1.5),Y=t.Y(0);
   let s=box(X-.2,Y,0,2.4,1.6,2.3,C_STONE);
   const F=faceL(X-.2,Y,0,2.4,1.6);s+=frect(F,.5,.25,1.9,1.5,dk(C_STONE,.1));
   s+=poly([iso(X,Y,2.31),iso(X+2,Y,2.31),iso(X+2,Y+1.6,2.31),iso(X,Y+1.6,2.31)],'#8d8478');
   // ramp
   s+=poly([iso(X+2,Y+1.6,0),iso(X+2,Y+1.6,2.3),iso(X+2,Y+3.6,0)],dk(C_STONE,.12));
   s+=poly([iso(X,Y+1.6,2.3),iso(X+2,Y+1.6,2.3),iso(X+2,Y+3.6,0),iso(X,Y+3.6,0)],'#8d8478');
   s+=ln(iso(X+1,Y+1.6,2.32),iso(X+1,Y+3.6,.02),'#f6efe2',1.2,'stroke-dasharray="5 5"');
   for(const cx of [X+.2,X+1.8]){const pts2=[];for(let yy=22;yy<=23.4;yy+=.2)pts2.push(iso(cx,yy,cableZ(yy)));s+=`<polyline points="${pts(pts2)}" fill="none" stroke-width="1.6"/>`;}
   t.add(1.3,0,3.7,3.6,s);}
  t.grass(.1,.2,1.0,3.2); t.grass(4.0,.2,2.6,3.2);
  t.tree(.6,1.0,.8); t.tree(.6,2.7,.8); t.tree(4.6,.9); t.tree(5.9,2.4,.9); t.bench(5.2,1.7,'y'); t.crowd(4.3,1.4,2,1.6,3);
  // Upside + towers + Federal Hall
  t.b(.4,5.2,3.0,3.2,10.5,'#a9c3d6',{glass:true,roof:'#d9e4ea'});
  t.pizza('upside',3.6,5.3,2.6,2.7,3.8,'#f0d9cf',{front:'R',sign:'UPSIDE PIZZA',awn:['#e06c9f','#2f3a48'],signBg:'#2f3a48',signFg:'#f7a8c8'});
  t.queue(6.55,5.5,'y',3,.5);
  t.b(.4,8.8,2.2,3.6,3.4,'#cfc6b6');
  {const X=t.X(2.8),Y=t.Y(9.0),w=3.4,d=3.3,h=3.9;
   let s=box(X,Y,0,w,d,h,'#f1ede4',{top:'#e6e0d4'});
   const F=faceR(X,Y,0,w,d);
   s+=frect(F,.2,.5,d-.2,h-1.0,'#d5cebf');
   for(let i=0;i<6;i++){const u=.35+i*(d-.7)/5;s+=frect(F,u-.13,.5,u+.13,h-1.0,'#fbf9f4');}
   s+=frect(F,.1,h-1.0,d-.1,h-.7,'#ece6da');
   s+=poly([F.at(.1,h-.7),F.at(d-.1,h-.7),F.at(d/2,h-.05)],'#f4f0e8');
   for(let k=0;k<3;k++) s+=box(X+w+.0,Y+.4,.17*k,.75-.25*k,d-.8,.17,'#e3ddd0',{top:'#efe9de'});
   const p=iso(X+w+.45,Y+d/2,.5);s+=`<g transform="translate(${f1(p[0])},${f1(p[1])})"><rect x="-4" y="-4" width="8" height="5" fill="#e3ddd0"/><path d="M-2.4 -4l.4 -8h4l.4 8z" fill="#7d8a8a"/><circle cx="0" cy="-14" r="2.2" fill="#7d8a8a"/></g>`;
   t.add(2.8,9.0,6.95,12.3,s);}
  t.b(.4,12.9,2.6,2.8,3.2,'#d9cdb8'); t.b(3.2,12.9,2.8,2.8,3.4,'#c9a98a');
  // NYSE
  {const X=t.X(9.4),Y=t.Y(4.4),w=3.8,d=4.6,h=4.8;
   let s=box(X,Y,0,w,d,h,'#efebe2',{top:'#e7e1d4'});
   const F=faceL(X,Y,0,w,d),FR=faceR(X,Y,0,w,d);
   s+=frect(F,0,0,w,.55,'#e2dccf');
   s+=frect(F,.25,.55,w-.25,h-1.05,'#cfc8ba');
   for(let i=0;i<6;i++){const u=.4+i*(w-.8)/5;s+=frect(F,u-.14,.55,u+.14,h-1.05,'#fbf9f4');}
   s+=frect(F,.1,h-1.05,w-.1,h-.75,'#ece6da');
   s+=poly([F.at(.1,h-.75),F.at(w-.1,h-.75),F.at(w/2,h-.08)],'#f4f0e8');
   const fu0=.55,fu1=w-.55,fv0=1.15,fv1=3.35,n=7;
   for(let i=0;i<n;i++){const v0=fv0+(fv1-fv0)*i/n,v1=fv0+(fv1-fv0)*(i+1)/n;s+=frect(F,fu0,v0,fu1,v1,i%2?'#f7f3ea':'#c8423a','stroke="none"');}
   s+=frect(F,fu0,fv0+(fv1-fv0)*.45,fu0+(fu1-fu0)*.42,fv1,'#2f4f86','stroke="none"');
   for(let i=0;i<4;i++)for(let j=0;j<3;j++){const p=F.at(fu0+.15+i*.28,fv1-.18-j*.32);s+=`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r=".9" fill="#fff" stroke="none"/>`;}
   s+=frect(F,fu0,fv0,fu1,fv1,'none','stroke-width="1"');
   s+=windowsSVG(FR,4,3,.6,h-.6,.34,.6,C_WIN);
   t.add(9.4,4.4,13.2,9.0,s);}
  t.b(9.4,.4,3.4,3.4,9.6,'#b7c9d6',{glass:true,roof:'#dfe7ec'}); t.b(13.2,.4,2.6,3.8,8.0,'#cbc3b4',{tower:true});
  t.b(13.6,4.6,2.2,4.4,6.0,'#dacfbd',{fire:'L'});
  t.b(9.4,13.1,3.0,2.7,3.3,'#d3c3a8',{door:'L'}); t.b(12.8,13.1,3.0,2.7,3.0,'#bfae96',{door:'L'}); t.tree(10.2,12.4,.8); t.tree(14.6,12.4,.8); t.bench(12.4,12.3,'x');
  t.crowd(9.4,9.6,6.2,2.4,13); t.cart(14.9,10.9,['#f2c230','#d9473a']);
  for(let i=0;i<6;i++){const p=[9.2+i*.25,12.55];t.add(p[0]-.05,p[1]-.05,p[0]+.05,p[1]+.05,cyl(t.X(p[0]),t.Y(p[1]),0,.07,.3,'#8a8178'));}
  t.lamp(6.4,8.6); t.lamp(8.5,13.0); t.hydrant(8.45,5.0);
  t.car('y',16,0,7.6,1.2,'#f4c430',{taxi:true}); t.car('y',16,0,7.6,1.2,'#2f3a48');
  t.car('x',0,7,4.2,1.0,'#e8e4dc');
  t.walker('x',9.2,15.8,10.1,.45); t.walker('x',9.4,15.6,10.8,.5); t.walker('y',.3,15.6,6.55,.4); t.walker('y',.3,15.6,8.55,.45);
  return t;
}
