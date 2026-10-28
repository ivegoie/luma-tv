const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../search.js'),C=require('../core.js');
const meta=(id,name,type='movie',extra={})=>({id,type,name,...extra});
test('Hardcore Henry is first even when earlier providers return unrelated popular titles',()=>{
  const target=meta('tt3072482','Hardcore Henry','movie',{releaseInfo:'2016'}),rows=[{items:[meta('tt1','Coraline'),meta('tt2','Old Henry'),meta('tt3','Project Power')]},{items:[meta('tt4','Hardcore'),target,meta('tt5','Henry V')]}];
  assert.deepEqual(S.rank(rows,'Hardcore Henry'),[target]);
});
test('matches are merged across providers and duplicates keep useful posters',()=>{
  const empty=meta('tt1','Hardcore Henry'),rich=meta('tt1','Hardcore Henry','movie',{poster:'https://example.test/poster.jpg'});
  assert.deepEqual(S.rank([{items:[empty]},{items:[rich]}],'hardcore henry'),[rich]);
});
test('case, accents, punctuation, original titles and aliases are searchable',()=>{
  assert.ok(S.score(meta('a','Amélie'),'amelie'));assert.ok(S.score(meta('a','Spider-Man'),'spider man'));
  assert.ok(S.score(C.cleanMeta(meta('a','Lokalizirani naziv','movie',{originalTitle:'Hardcore Henry'})),'Hardcore Henry'));
  assert.ok(S.score(C.cleanMeta(meta('a','Local','movie',{aliases:['Hardcore Henry']})),'Hardcore Henry'));
});
test('year suffix narrows matching without breaking a numeric movie title',()=>{
  assert.ok(S.score(meta('a','Hardcore Henry','movie',{releaseInfo:'2016'}),'Hardcore Henry 2016'));
  assert.equal(S.score(meta('a','Hardcore Henry','movie',{releaseInfo:'2016'}),'Hardcore Henry 1990'),0);
  assert.ok(S.score(meta('a','1917'),'1917'));
});
test('small title typos work without accepting completely unrelated recommendations',()=>{
  assert.ok(S.score(meta('a','Hardcore Henry'),'Hardcor Henry'));
  assert.equal(S.score(meta('a','Project Power'),'Hardcore Henry'),0);
});
test('exact series matches rank ahead of partial movie titles',()=>{
  const series=meta('series','The 100','series'),film=meta('movie','The 100 Days');assert.equal(S.rank([{items:[film,series]}],'The 100')[0],series);
});
test('search planning reserves existing Cinemeta and shares the request budget',()=>{
  const noisy={url:'https://noisy.test/manifest.json',manifest:{id:'noisy',resources:['catalog'],types:['movie'],catalogs:Array.from({length:40},(_,i)=>({id:'list'+i,type:'movie',extra:[{name:'search'}]}))}},cinemeta={url:C.DEFAULT_ADDON,manifest:{id:'com.linvo.cinemeta',resources:['catalog'],types:['movie','series'],catalogs:[{id:'top',type:'movie',extra:[{name:'search'}]},{id:'top',type:'series',extra:[{name:'search'}]}]}};
  const jobs=S.jobs([noisy,cinemeta],'Hardcore Henry');assert.equal(jobs.length,24);assert.equal(jobs[0].addon,cinemeta);assert.equal(jobs.filter(j=>j.addon===cinemeta).length,2);assert.ok(jobs.every(j=>j.extra.search==='Hardcore Henry'));
});
test('search does not request catalogs that do not declare search support',()=>{
  assert.deepEqual(S.jobs([{url:C.DEFAULT_ADDON,manifest:{resources:['catalog'],types:['movie'],catalogs:[{id:'year',type:'movie',extra:[{name:'genre',isRequired:true,options:['2026']}]}]}}],'Henry'),[]);
});
test('five-second debounce survives a view rebind, cancels old input, and supports explicit submit',()=>{
  let now=0,id=0;const jobs=new Map(),calls=[],clock={setTimeout:(fn,delay)=>{jobs.set(++id,{fn,at:now+delay});return id;},clearTimeout:i=>jobs.delete(i)},d=S.debounce({...clock,submit:q=>calls.push(q)});
  const advance=ms=>{now+=ms;for(const [i,j] of [...jobs])if(j.at<=now){jobs.delete(i);j.fn();}};
  d.input('Hardcore');advance(4000);assert.equal(d.pending(),true);d.input('Hardcore Henry');advance(4999);assert.deepEqual(calls,[]);advance(1);assert.deepEqual(calls,['Hardcore Henry']);d.input('Other');d.cancel();advance(6000);assert.equal(calls.length,1);d.flush('The 100');assert.equal(calls.at(-1),'The 100');
});
