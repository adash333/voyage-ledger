import {PORTS,route} from './accounting.mjs';

// Anchors match the approved illustrated atlas, not a geographic projection.
const ports={
 venice:{point:[794,315],label:[816,332],align:'start',ship:[35,82],flag:[92,46]},
 alexandria:{point:[1038,744],label:[1010,752],align:'end',ship:[-75,-66],flag:[-130,-155]},
 constantinople:{point:[1086,472],label:[1110,512],align:'end',ship:[-55,100],flag:[-180,52]},
 barcelona:{point:[482,429],label:[502,420],align:'start',ship:[73,54],flag:[132,25]}
};
const legs=[
 ['venice','alexandria',[[815,375],[849,442],[901,520],[949,605],[985,660]]],
 ['alexandria','constantinople',[[1046,675],[1034,596],[1039,541]]],
 ['constantinople','barcelona',[[1024,526],[957,566],[902,594],[823,576],[749,554],[665,541],[580,516],[519,477]]]
];
const pointString=points=>points.map(p=>p.join(',')).join(' ');
const icons={pepper:'🧺',silk:'🧵',glass:'🏺'};

// Japanese is the default; the English page overrides these with configureMap().
const japanese={
 portName:port=>port.name,
 descriptions:{venice:'水の都から、航海のはじまり。',alexandria:'海と陸の交易をつなぐ港。',constantinople:'東と西の文化が出会う港。',barcelona:'地中海の西にひらく、にぎやかな港。'},
 goods:{pepper:'コショウ',silk:'絹織物',glass:'ガラス製品'},
 coinUnit:' 金貨',
 shipTitle:name=>'現在地の船：'+name,
 currentText:name=>'現在地：'+name,
 mapAria:(name,names)=>'4つの港をめぐる交易の旅。現在地：'+name+'。航海順：'+names.join('、'),
 location:(name,voyage)=>'⛵ 現在地：'+name+' ／ 第'+voyage+'航海（'+(voyage%2?'往路':'復路')+'）',
 stepCurrent:'現在地',
 zoomIn:'地図の文字を拡大',
 zoomOut:'全体を見る'
};
let labels=japanese;
export function configureMap(custom){labels={...japanese,...custom};}

export function renderMap(state){
 const $=id=>document.getElementById(id);
 const sequence=route(state.voyage),current=sequence[state.stop];
 const port=PORTS.find(p=>p.id===current),config=ports[current];
 const nameOf=id=>labels.portName(PORTS.find(p=>p.id===id));
 $('routeLine').innerHTML=sequence.slice(0,-1).map((from,i)=>{
  const to=sequence[i+1];
  const leg=legs.find(([a,b])=>(a===from&&b===to)||(a===to&&b===from));
  const waypoints=leg[0]===from?leg[2]:[...leg[2]].reverse();
  const status=i<state.stop?'complete':i===state.stop?'next':'future';
  return '<polyline class="route-leg '+status+'" points="'+pointString([ports[from].point,...waypoints,ports[to].point])+'"/>';
 }).join('');
 // Names, descriptions and prices come from trusted game constants.
 $('portDots').innerHTML=PORTS.map(p=>{
  const {point:[x,y],label:[lx,ly],align}=ports[p.id],selected=p.id===current;
  return '<g data-port="'+p.id+'"><circle cx="'+x+'" cy="'+y+'" r="12" class="port-dot'+(selected?' active':'')+'"/><text x="'+lx+'" y="'+ly+'" text-anchor="'+align+'" class="map-city'+(selected?' active':'')+'">'+labels.portName(p)+'</text></g>';
 }).join('');
 const [x,y]=config.point,[sx,sy]=config.ship,[fx,fy]=config.flag,name=labels.portName(port);
 $('shipMarker').setAttribute('transform','translate('+x+' '+y+')');
 $('shipMarker').setAttribute('data-port',current);
 $('shipHarborLink').setAttribute('d','M0 0L'+sx+' '+sy);
 $('shipSprite').setAttribute('x',sx-56);
 $('shipSprite').setAttribute('y',sy-56);
 $('shipFlag').setAttribute('transform','translate('+fx+' '+fy+')');
 $('shipTitle').textContent=labels.shipTitle(name);
 const currentText=labels.currentText(name);
 $('mapCurrentText').textContent=currentText;
 $('mapCurrentText').setAttribute('font-size',currentText.length>12?'16':'20');
 $('voyageMap').setAttribute('aria-label',labels.mapAria(name,sequence.map(nameOf)));
 $('mapLocation').textContent=labels.location(name,state.voyage);
 $('mapPortName').textContent=name;
 $('mapPortDescription').textContent=labels.descriptions[current];
 $('mapPortPrices').innerHTML=Object.entries(labels.goods).map(([good,label])=>'<div><dt><span class="map-good-icon" aria-hidden="true">'+icons[good]+'</span>'+label+'</dt><dd>'+port.prices[good]+'<small>'+labels.coinUnit+'</small></dd></div>').join('');
 $('routeSteps').innerHTML=sequence.map((id,i)=>{
  const selected=id===current;
  return '<li class="map-step'+(selected?' current':'')+(i<state.stop?' visited':'')+'"'+(selected?' aria-current="location"':'')+'><span class="step-number" aria-hidden="true">'+(i<state.stop?'✓':i+1)+'</span><span>'+nameOf(id)+(selected?'<small>'+labels.stepCurrent+'</small>':'')+'</span></li>';
 }).join('');
 if($('mapViewport').classList.contains('zoomed'))centerShip();
}

function centerShip(){
 const viewport=document.getElementById('mapViewport');
 const scale=document.getElementById('voyageMap').getBoundingClientRect().width/1536;
 const marker=document.getElementById('shipMarker');
 const {point:[x,y],ship:[sx,sy]}=ports[marker.dataset.port];
 viewport.scrollTo({left:Math.max(0,(x+sx)*scale-viewport.clientWidth/2),top:Math.max(0,(y+sy)*scale-viewport.clientHeight/2)});
}

document.getElementById('mapZoom').addEventListener('click',()=>{
 const viewport=document.getElementById('mapViewport');
 const zoomed=viewport.classList.toggle('zoomed');
 const button=document.getElementById('mapZoom');
 button.setAttribute('aria-pressed',String(zoomed));
 button.textContent=zoomed?labels.zoomOut:labels.zoomIn;
 if(zoomed)centerShip();else viewport.scrollTo({left:0,top:0});
});
