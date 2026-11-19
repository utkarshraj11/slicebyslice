import { Tile } from '../tile';
import { INK, iso, f1, poly, ln, box, faceL, frect } from '../iso';
import { storefront } from '../parts';

export function buildMidwood(): Tile {
  const t=new Tile('midwood',60,-4,10,{hood:'midwood',top:4});
  t.road(4.6,0,1.2,10,'y');
  t.road(0,3.4,4.6,1.0,'x',{line:false}); t.road(5.8,3.4,4.2,1.0,'x',{line:false});
  t.xwalk(4.6,4.5,1.2,.45);
  t.house(.5,.4,2.2,2.4,2.1,'#e9d6b8','#b9583f'); t.house(6.5,.4,2.3,2.4,2.1,'#cfe0d6','#5a6e7a'); t.house(6.6,5.0,2.4,2.3,2.0,'#f0dcc8','#8a4f3a');
  t.tree(3.4,1.2,.9); t.tree(9.3,1.4,.8); t.tree(9.4,6.0,.8);
  // Di Fara + neighbor shop
  t.b(.2,4.9,1.1,2.4,2.8,'#d7c3a3',{g0:2.75,extraFaces:(_FL,FR)=>storefront(FR,.12,2.28,{sign:'DELI',signSize:5.6,awn:['#3f7fbf','#f4efe3'],wall:'#d7c3a3'})});
  t.pizza('difara',1.4,4.9,2.4,2.4,2.9,'#efe6d3',{front:'R',sign:'DI FARA PIZZA',signSize:6,awn:['#3d7a4f','#f4efe3'],signBg:'#c8423a',signFg:'#fff8ea'});
  t.queue(4.2,4.7,'y',6,.45); t.queue(4.4,7.4,'x',1);
  // Q train embankment (along x)
  const emb=(x0:number,x1:number)=>{const X0=t.X(x0),X1=t.X(x1),Y0=t.Y(7.8),Y1=t.Y(9.4),z=1.0;
    let s=poly([iso(X0,Y1,0),iso(X1,Y1,0),iso(X1,Y1-.5,z),iso(X0,Y1-.5,z)],'#9ccb7d');
    s+=poly([iso(X0,Y0+.5,z),iso(X1,Y0+.5,z),iso(X1,Y1-.5,z),iso(X0,Y1-.5,z)],'#b9a78e');
    s+=ln(iso(X0,Y0+.65,z+.02),iso(X1,Y0+.65,z+.02),'#6b625a',1)+ln(iso(X0,Y1-.65,z+.02),iso(X1,Y1-.65,z+.02),'#6b625a',1);
    s+=poly([iso(X1,Y0,0),iso(X1,Y1,0),iso(X1,Y1-.5,z),iso(X1,Y0+.5,z)],'#86b96a');
    return s;};
  t.add(0,7.8,4.6,9.4,emb(0,4.6));
  {const X=t.X(4.6),Y0=t.Y(8.2),Y1=t.Y(9.0);let s=box(X,Y0,.75,1.2,.8,.25,'#5a6e7a',{top:'#b9a78e'});s+=ln(iso(X,Y0+.15,1.02),iso(X+1.2,Y0+.15,1.02),'#6b625a',1)+ln(iso(X,Y1-.15,1.02),iso(X+1.2,Y1-.15,1.02),'#6b625a',1);t.add(4.6,7.8,5.8,9.4,s,{above:true});}
  t.add(5.8,7.8,10,9.4,emb(5.8,10));
  t.tree(1.0,9.8,.75); t.tree(8.6,9.8,.75);
  t.parked(3.0,3.9,'x','#d9473a');
  t.car('y',0,10,5.2,.9,'#3f7fbf');
  t.movers.push({kind:'car',axis:'x',a:0,b:10,c:8.6,speed:1.6,z:1.0,onTop:true,hw:1.4,hd:.4,p:3,svg:trainSVG(),x0:0,y0:0,x1:0,y1:0});
  t.walker('y',.3,9.7,6.2,.35); t.walker('x',.3,4.2,4.65,.35);
  return t;
}
function trainSVG(){let s='';for(let k=-1;k<=1;k+=2){s+=box(k*.72-.68,-.36,0,1.36,.72,.62,'#b9c2c8',{top:'#d6dce0'});
  const F=faceL(k*.72-.68,-.36,0,1.36,.72);for(let u=.15;u<1.25;u+=.3)s+=frect(F,u,.28,u+.2,.5,'#2f3a48','stroke-width=".4"');
  s+=frect(F,0,.12,1.36,.2,'#f2c230','stroke="none"');}
  const p=iso(.7,.36,.45);s+=`<circle cx="${f1(p[0]+6)}" cy="${f1(p[1]-1)}" r="3.2" fill="#f2c230" stroke-width=".6"/><text x="${f1(p[0]+6)}" y="${f1(p[1]+.2)}" font-size="4.6" text-anchor="middle" dominant-baseline="central" stroke="none" fill="${INK}" font-weight="700" font-family="DM Sans, Arial">Q</text>`;
  return s;}
