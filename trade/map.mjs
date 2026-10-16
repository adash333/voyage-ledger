import {PORTS,route} from './accounting.mjs';

// Harbor anchors match the illustrated background in its 960 × 600 viewBox.
const ports={
 venice:{point:[426,94],label:[448,115],align:'start'},
 alexandria:{point:[774,535],label:[752,573],align:'end'},
 constantinople:{point:[764,225],label:[743,181],align:'end'},
 barcelona:{point:[184,211],label:[204,247],align:'start'}
};
// Schematic sea waypoints between the illustrated harbors.
const legs=[
 ['venice','alexandria',[[465,150],[500,195],[535,245],[550,295],[555,350],[610,425],[714,465]]],
 ['alexandria','constantinople',[[803,458],[787,386],[736,338],[713,281],[732,251]]],
 ['constantinople','barcelona',[[732,251],[713,281],[712,340],[680,399],[596,410],[527,377],[465,355],[373,348],[284,297]]]
];
const pointString=points=>points.map(p=>p.join(',')).join(' ');

export function renderMap(state){
 const $=id=>document.getElementById(id);
 const sequence=route(state.voyage),current=sequence[state.stop];
 $('routeLine').innerHTML=sequence.slice(0,-1).map((from,i)=>{
  const to=sequence[i+1];
  const leg=legs.find(([a,b])=>(a===from&&b===to)||(a===to&&b===from));
  const waypoints=leg[0]===from?leg[2]:[...leg[2]].reverse();
  const status=i<state.stop?'complete':i===state.stop?'next':'future';
  return '<polyline class="route-leg '+status+'" points="'+pointString([ports[from].point,...waypoints,ports[to].point])+'"/>';
 }).join('');
 // Names are trusted constants; only the current port changes with game state.
 $('portDots').innerHTML=PORTS.map(p=>{
  const {point:[x,y],label:[lx,ly],align}=ports[p.id],selected=p.id===current;
  return '<g data-port="'+p.id+'"><circle cx="'+x+'" cy="'+y+'" r="7" class="port-dot'+(selected?' active':'')+'"/><text x="'+lx+'" y="'+ly+'" text-anchor="'+align+'" class="map-city'+(selected?' active':'')+'">'+p.name+'</text></g>';
 }).join('');
 const [x,y]=ports[current].point,name=PORTS.find(p=>p.id===current).name;
 $('shipMarker').setAttribute('transform','translate('+x+' '+y+')');
 $('shipMarker').setAttribute('data-port',current);
 $('shipTitle').textContent='現在地の船：'+name;
 $('voyageMap').setAttribute('aria-label','地中海の航海地図。現在地：'+name+'。航海順：'+sequence.map(id=>PORTS.find(p=>p.id===id).name).join('、'));
 $('mapLocation').textContent='⛵ 現在地：'+name+' ／ 第'+state.voyage+'航海（'+(state.voyage%2?'往路':'復路')+'）';
 $('routeSteps').innerHTML=sequence.map((id,i)=>{
  const selected=id===current;
  return '<li class="map-step'+(selected?' current':'')+(i<state.stop?' visited':'')+'"'+(selected?' aria-current="location"':'')+'><span class="step-number" aria-hidden="true">'+(i<state.stop?'✓':i+1)+'</span><span>'+PORTS.find(p=>p.id===id).name+(selected?'<small>現在地</small>':'')+'</span></li>';
 }).join('');
}
