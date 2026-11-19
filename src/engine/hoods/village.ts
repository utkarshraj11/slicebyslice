import { Tile } from '../tile';

export function buildVillage(): Tile {
  const t=new Tile('village',20,22,16,{hood:'village',top:6});
  t.road(0,7.4,16,1.4,'x');
  t.cobble(6.8,0,1.4,7.4); t.cobble(6.8,8.8,1.4,7.2);
  t.road(13.8,8.8,1.2,7.2,'y',{line:false});
  t.xwalk(6.2,7.4,.5,1.4); t.xwalk(8.3,7.4,.5,1.4); t.xwalk(13.8,9.0,1.2,.45);
  // Mama's Too corner (NE of Christopher & Bleecker)
  t.b(.4,.4,2.7,3.0,5.4,'#cdb79c',{tower:true}); t.b(3.2,.4,2.8,3.0,4.9,'#b5806b',{fire:'R'});
  t.b(.4,3.6,1.5,2.9,4.6,'#a8705a',{stoop:'L',colsL:2});
  t.b(1.9,3.6,1.5,2.9,4.3,'#c0634c',{stoop:'L',colsL:2});
  t.pizza('mamas',3.4,3.6,2.6,2.9,4.0,'#f1e6d0',{front:'LR',sign:"MAMA'S TOO!",awn:['#c8423a','#f6efe2'],signBg:'#f6efe2',signFg:'#c8423a'});
  t.queue(.5,7.05,'x',6,.45); t.queue(6.45,4.0,'y',4,.5);
  // L'Industrie, John's
  t.b(9.0,.4,3.2,3.0,5.2,'#d2c2a8',{tower:true}); t.b(12.4,.4,3.2,3.0,5.8,'#b98a6e',{fire:'L'});
  t.pizza('lindustrie',9.0,3.6,2.6,2.9,4.2,'#3f5a4c',{front:'L',sign:"L'INDUSTRIE",awn:['#f3ead8','#3f5a4c'],signBg:'#f3ead8',signFg:'#3f5a4c',b:{win:'#d7e6dc'}});
  t.b(11.6,3.6,1.4,2.9,4.6,'#a8705a',{stoop:'L',colsL:1});
  t.pizza('johns',13.0,3.6,2.6,2.9,4.4,'#b9533f',{front:'L',sign:"JOHN'S of Bleecker St",signSize:6,awn:['#2f4a3a','#f3ead8'],signBg:'#2f4a3a',signFg:'#f6d77a'});
  t.queue(9.15,7.05,'x',9,.42);
  // Christopher Park
  t.grass(.6,9.6,5.4,3.6);
  t.tree(1.2,10.2); t.tree(3.0,10.0,1.1); t.tree(5.3,10.4,.9); t.tree(1.6,12.5,.9); t.tree(4.6,12.6);
  t.bench(2.4,11.4,'x'); t.bench(4.0,11.4,'x');
  t.flagpole(5.7,9.9,2.4,['#e24b3b','#f39a3b','#f6d24a','#4fa65a','#3f7fbf','#8b5fb8']);
  t.crowd(1.2,10.7,3.8,1.6,5);
  t.b(.4,13.6,1.9,2.2,4.2,'#b8705c'); t.b(2.3,13.6,1.9,2.2,4.5,'#9c6a55',{fire:'L'}); t.b(4.2,13.6,1.9,2.2,4.0,'#c48a62');
  // Joe's
  t.b(9.0,9.6,1.6,2.6,4.4,'#c97b5e');
  t.pizza('joes',10.6,9.6,2.4,2.6,3.8,'#f3ebdc',{front:'R',sign:"JOE'S PIZZA",awn:['#d6403a','#f8f2e6'],signBg:'#f8f2e6',signFg:'#d6403a'});
  t.b(9.0,12.6,4.0,3.2,5.0,'#d5c7ae',{tower:true,fire:'R'});
  t.queue(13.4,12.5,'y',6,.5);
  t.tree(15.5,10.0,.9); t.tree(15.5,13.4,.9); t.tree(9.5,9.2,.8); t.tree(12.3,9.2,.8); t.tree(.8,9.2,.8);
  t.lamp(6.35,9.1); t.lamp(8.6,6.8); t.hydrant(13.2,9.15);
  t.parked(15.45,15.0,'y','#8e6cc2');
  t.car('x',0,16,8.1,1.3,'#d9473a'); t.car('x',0,16,8.1,1.3,'#f4c430',{taxi:true});
  t.car('y',0,16,7.5,1.0,'#58b5c9');
  t.walker('x',.5,15.5,9.25,.45); t.walker('x',9,15.5,9.3,.4); t.walker('y',.5,15.5,6.45,.35); t.walker('y',9,15.5,8.6,.4); t.walker('y',.5,6.5,8.55,.35);
  return t;
}
