import { Tile } from '../tile';
import { cyl } from '../iso';
import { storefront } from '../parts';
import { lot } from '../../data/lots';
import V from '../../data/lots/village';

/* West Village. Every building along the four pizzerias' streets is a real lot (src/data/lots/village.ts):
   real floors, roof height, frontage, depth and era/class → style. The street grid is a composite:
   Bleecker along x, Christopher (cobbles) crossing at x≈7.5, Carmine on the right.
   Near-side (larger x/y) buildings start a couple of units back from Bleecker so they don't hide
   the far side's storefronts; the corners in front are open (Christopher Park, Father Demo Square). */
export function buildVillage(): Tile {
  const t=new Tile('village',20,22,16,{hood:'village',top:9});
  t.road(0,7.4,16,1.4,'x');
  t.cobble(6.8,0,1.4,7.4); t.cobble(6.8,8.8,1.4,7.2);
  t.road(13.8,8.8,1.2,7.2,'y',{line:false});
  t.xwalk(6.2,7.4,.5,1.4); t.xwalk(8.3,7.4,.5,1.4); t.xwalk(13.8,9.0,1.2,.45);

  // North side of Bleecker, west of Christopher: 317 · Mama's Too (323–325) · 327 on the corner (1833 rowhouse)
  const q1=t.row('x',6.5,6.2,.3,[
    {lot:lot(V.mamas,'327'),front:'LR'},
    {lot:lot(V.mamas,'323'),pizza:{id:'mamas',sign:"MAMA'S TOO!",awn:['#c8423a','#f6efe2'],signBg:'#f6efe2',signFg:'#c8423a',base:'#efe3cc'}},
    {lot:lot(V.mamas,'317')},
  ],6.1);
  t.queue(q1[1].x+.25,7.05,'x',6,.45);

  // North side, east of Christopher: 282 (1830) · 280 (1848) · John's of Bleecker in 272–278 (1904, corner)
  const q2=t.row('x',6.5,15.8,8.6,[
    {lot:lot(V.johns,'272'),front:'LR',pizza:{id:'johns',u1:2.45,sign:"JOHN'S of Bleecker St",signSize:6,awn:['#2f4a3a','#f3ead8'],signBg:'#2f4a3a',signFg:'#f6d77a',base:'#7a2e2a',
      faces:(FL,FR)=>storefront(FL,2.6,FL.L-.12,{h:1.2,base:'#2f3a48',awn:['#2f3a48','#f2c230']})+storefront(FR,.12,FR.L-.12,{h:1.2,base:'#2f3a48'})}},
    {lot:lot(V.johns,'280')},
    {lot:lot(V.johns,'282')},
  ],6.1);
  t.queue(q2[0].x+.2,7.05,'x',5,.45);
  // backdrop: a prewar elevator building like 2 Cornelia St (12 floors, 1907) in the back-right corner
  t.b(12.4,.4,3.4,2.5,1.3+11*.85+.12,'#d7c19b',{style:'prewar',floors:12,g0:1.3,fh:.85,fronts:'LR',ground:'door',tower:true,key:'2 CORNELIA STREET'});

  // rear yards behind the Bleecker rows
  for(const p of [...q1,...q2].filter(p=>p.y>1.4&&p.x<12)){t.grass(p.x+.1,.5,p.w-.2,p.y-.6);t.tree(p.x+p.w/2,.5+(p.y-.6)/2,.8);}

  // Christopher Park (composite: the real park is a block east on Christopher)
  t.grass(.6,9.3,5.4,1.6);
  t.tree(1.1,9.8,.9); t.tree(3.2,9.7); t.tree(4.9,10.4,.85);
  t.bench(2.2,10.4,'x'); t.flagpole(5.6,9.6,2.4,['#e24b3b','#f39a3b','#f6d24a','#4fa65a','#3f7fbf','#8b5fb8']);
  t.crowd(1.4,9.9,3,.8,3);

  // South side, on Christopher: L'Industrie in 100–104 Christopher (1912 walk-up)
  const q3=t.row('y',6.2,11.4,15.8,[
    {lot:lot(V.lindustrie,'100'),ghost:true,pizza:{id:'lindustrie',u1:2.4,sign:"L'INDUSTRIE",awn:['#f3ead8','#3f5a4c'],signBg:'#f3ead8',signFg:'#3f5a4c',base:'#3f5a4c',
      faces:(_FL,FR)=>storefront(FR,2.55,FR.L-.12,{h:1.2,base:'#5b3d2e',awn:['#7a2e2a','#efe1c8']})}},
  ],3.8);
  t.grass(.6,q3[0].y+.1,q3[0].x-.8,q3[0].d-.2); t.tree(1.4,12.6,.85); t.tree(1.3,14.6,.8);
  t.queue(6.5,11.6,'y',7,.48);

  // Father Demo Square (paved, fountain, plane trees) across from Joe's
  t.plaza(8.7,9.2,4.6,1.6);
  {const X=t.X(11),Y=t.Y(10);t.add(10.6,9.6,11.4,10.4,fountainSVG(X,Y));}
  t.tree(9.2,9.6,.9); t.tree(12.8,10.4,.85); t.bench(9.8,10.5,'x');

  // Carmine St: Joe's (7 Carmine, 1894) · 11 Carmine (1891)
  const q4=t.row('y',13.2,11,15.8,[
    {lot:lot(V.joes,'7'),pizza:{id:'joes',sign:"JOE'S PIZZA",awn:['#d6403a','#f8f2e6'],signBg:'#f8f2e6',signFg:'#d6403a',base:'#efe6d6'}},
    {lot:lot(V.joes,'11'),ghost:true},
  ],2.6);
  t.grass(8.8,q4[0].y+.1,q4[0].x-9,4.6); t.tree(9.4,12.4,.8); t.tree(9.5,14.6,.85);
  t.queue(13.5,11.2,'y',6,.5);

  t.lamp(6.35,9.1); t.lamp(8.55,6.8); t.lamp(13.45,10.9); t.hydrant(13.5,15.6); t.hydrant(.6,7.2);
  t.parked(15.45,13.6,'y','#8e6cc2');
  t.car('x',0,16,8.1,1.3,'#d9473a'); t.car('x',0,16,8.1,1.3,'#f4c430',{taxi:true});
  t.car('y',0,16,7.5,1.0,'#58b5c9'); t.car('y',16,8.8,14.4,.9,'#e8e4dc');
  t.walker('x',.5,15.5,7.3,.45); t.walker('x',.3,15.7,9.0,.4); t.walker('y',.3,6.3,6.45,.35); t.walker('y',.3,6.3,8.55,.4); t.walker('y',11,15.6,8.55,.35); t.walker('y',9,15.6,15.45,.4);
  return t;
}

/** Small round fountain: basin + jet. */
function fountainSVG(X:number,Y:number){
  return cyl(X,Y,0,.38,.16,'#d8d0c0','#a7d0ec')+cyl(X,Y,.16,.06,.35,'#d8d0c0','#e6f3fb');
}
