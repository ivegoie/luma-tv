const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
test('configured addon paths and query tokens survive resource requests',()=>{
  const u=C.resourceURL('https://addon.example/private%2Fconfig/manifest.json?token=abc','stream','series','tt123:1:2');
  assert.equal(u,'https://addon.example/private%2Fconfig/stream/series/tt123%3A1%3A2.json?token=abc');
});
test('search encoding cannot inject extras or routes',()=>{
  assert.equal(C.resourceURL('https://a.test/manifest.json','catalog','movie','top',{search:'a/b &skip=9',skip:0}),'https://a.test/catalog/movie/top/search=a%2Fb%20%26skip%3D9&skip=0.json');
});
test('stremio installation URLs convert to HTTPS manifests',()=>assert.equal(C.manifestURL('stremio://a.test/key/manifest.json'),'https://a.test/key/manifest.json'));
test('reject script URLs, credential URLs and malformed addon paths',()=>{
  for(const u of ['javascript:alert(1)','file:///tmp/manifest.json','https://user:pass@a.test/manifest.json','https://a.test/notmanifest.json'])assert.throws(()=>C.manifestURL(u));
});
test('resource-specific prefixes override global restrictions',()=>{
  const m={types:['movie'],idPrefixes:['tt'],resources:['meta',{name:'stream',types:['series']}]};
  assert.equal(C.supports(m,'meta','movie','tt1'),true);assert.equal(C.supports(m,'meta','series','tt1'),false);
  assert.equal(C.supports(m,'stream','series','custom:1'),true);assert.equal(C.supports(m,'stream','movie','tt1'),false);
});
test('catalog IDs do not inherit metadata idPrefixes',()=>assert.equal(C.supports({resources:['catalog'],idPrefixes:['tt']},'catalog','movie','top'),true));
test('required search catalogs are not requested on home',()=>assert.equal(C.catalogArgs({extra:[{name:'search',isRequired:true}]}),null));
test('required genre gets first advertised option',()=>assert.deepEqual(C.catalogArgs({extra:[{name:'genre',isRequired:true,options:['2026','2025']}]}),{genre:'2026'}));
test('search skips catalogs that do not advertise search',()=>assert.equal(C.catalogArgs({extra:[{name:'skip'}]},'sintel'),null));
test('legacy extra declarations supported',()=>assert.deepEqual(C.catalogArgs({extraSupported:['search'],extraRequired:['search']},'sintel'),{search:'sintel'}));
test('unsupported required parameters are not silently ignored',()=>assert.equal(C.catalogArgs({extra:[{name:'calendarVideosIds',isRequired:true}]}),null));
test('catalog entries sanitized and deduplicated with type in key',()=>{
  const x=C.uniqueMetas([{id:'x',type:'movie',name:'A',poster:'javascript:alert(1)'},{id:'x',type:'movie',name:'A'},{id:'x',type:'series',name:'B'},null]);assert.equal(x.length,2);assert.equal(x[0].poster,'');
});
test('direct HTTPS video works without server',()=>assert.equal(C.playbackPlan({url:'https://cdn.test/movie.mp4'},{},'https:').kind,'direct'));
test('direct debrid links stay direct even when the addon also includes a torrent hash',()=>{
  const p=C.playbackPlan({url:'https://cdn.test/stream.mp4',infoHash:'a'.repeat(40)},{torrents:false},'https:');
  assert.equal(p.kind,'direct');assert.equal(p.error,undefined);
});
test('TorBox direct results are not buried behind earlier torrent providers',()=>{
  const torrent={name:'Torrentio',infoHash:'a'.repeat(40)},direct={name:'[TB] Comet',url:'https://cdn.test/play.mp4'};
  const result=C.planSources([{addon:'Torrentio',streams:Array(103).fill(torrent)},{addon:'Comet',streams:[direct]}],{},'https:');
  assert.deepEqual(result.available.map(x=>x.stream),[direct]);assert.equal(result.unavailable.length,103);
  assert.ok(result.unavailable.every(x=>x.plan.reason==='torrent-needs-service'));
});
test('source grouping prefers direct links even with a server and preserves errors and provider order',()=>{
  const result=C.planSources([{addon:'Torrents',streams:[{name:'torrent',infoHash:'b'.repeat(40)}]},{addon:'Direct',streams:[null,[],{name:'first',url:'https://cdn.test/1'},{name:'second',url:'https://cdn.test/2'},{ytId:'id'}]},{addon:'Unavailable addon',error:'timeout',streams:[]}],{torrents:true,server:'https://server.test'},'https:');
  assert.deepEqual(result.available.map(x=>x.stream.name),['first','second','torrent']);assert.equal(result.unavailable.length,1);assert.equal(result.failed[0].addon,'Unavailable addon');
  assert.deepEqual(C.planSources([],{},'https:'),{available:[],unavailable:[],failed:[]});
});
test('HLS URL with signed query is detected without rewriting',()=>{const url='https://cdn.test/movie.m3u8?sig=abc';const p=C.playbackPlan({url},{},'https:');assert.equal(p.url,url);assert.equal(p.hls,true);});
test('MIME can identify an extensionless HLS stream',()=>assert.equal(C.playbackPlan({url:'https://cdn.test/play',mimeType:'application/vnd.apple.mpegurl'},{},'https:').hls,true));
test('HTTPS blocks insecure streams instead of downgrading',()=>assert.match(C.playbackPlan({url:'http://lan.test/movie.mp4'},{},'https:').error,/HTTPS/));
test('proxy headers are never silently ignored',()=>assert.match(C.playbackPlan({url:'https://a.test/a.mp4',behaviorHints:{proxyHeaders:{request:{Authorization:'private'}}}},{},'https:').error,/zaglavlja/));
test('external and YouTube sources are not treated as video',()=>{
  assert.match(C.playbackPlan({externalUrl:'https://netflix.com'},{},'https:').error,/poveznica/);assert.match(C.playbackPlan({ytId:'abcdef'},{},'https:').error,/YouTube/);
});
test('torrent requires both server and explicit enabled setting',()=>{const s={infoHash:'a'.repeat(40)};assert.ok(C.playbackPlan(s,{server:'https://s.test',torrents:false},'https:').error);assert.ok(C.playbackPlan(s,{torrents:true},'https:').error);});
test('torrent uses official file index, -1 fallback and tracker parameters',()=>{
  const p=C.playbackPlan({infoHash:'A'.repeat(40),sources:['tracker:https://tracker.test/announce']},{server:'https://s.test/stremio/',torrents:true},'https:');
  assert.equal(p.url,'https://s.test/stremio/'+'a'.repeat(40)+'/-1?tr=tracker%3Ahttps%3A%2F%2Ftracker.test%2Fannounce');assert.equal(p.kind,'torrent');assert.ok(p.warning);
});
test('invalid torrent hashes and file indexes rejected',()=>{
  const opts={server:'https://s.test',torrents:true};assert.ok(C.playbackPlan({infoHash:'../settings'},opts,'https:').error);assert.ok(C.playbackPlan({infoHash:'a'.repeat(40),fileIdx:1.3},opts,'https:').error);
});
test('loopback server address is rejected, preserving remote root paths',()=>{
  for(const x of ['http://localhost:11470','http://127.0.0.1:11470','http://[::1]:11470','http://0.0.0.0:11470'])assert.throws(()=>C.serverURL(x));assert.equal(C.serverURL('https://host.test/stremio'),'https://host.test/stremio/');
});
test('storage never clears another app and uses its own namespace',()=>{
  const map=new Map([['stremio','untouched']]);const s=C.storageAdapter({setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k),removeItem:k=>map.delete(k)});s.write('bookmarks',[1]);assert.deepEqual(s.read('bookmarks',[]),[1]);assert.equal(map.get('stremio'),'untouched');assert.ok(map.has('luma-tv:v1:bookmarks'));
});
test('storage unavailable is recoverable for the session',()=>{const s=C.storageAdapter(null);s.write('settings',{a:1});assert.equal(s.available(),false);assert.deepEqual(s.read('settings',{}),{a:1});});
test('invalid saved JSON falls back safely',()=>{const s=C.storageAdapter({setItem(){},removeItem(){},getItem(){return '{broken';}});assert.deepEqual(s.read('bookmarks',[]),[]);});
test('resume ignores completed, invalid and very short sessions',()=>{assert.equal(C.resumePoint({time:42},300),42);assert.equal(C.resumePoint({time:282},300),0);assert.equal(C.resumePoint({time:2},300),0);assert.equal(C.resumePoint({time:NaN},300),0);});
test('short videos resume beyond their midpoint',()=>{assert.equal(C.resumePoint({time:39},65),39);assert.equal(C.resumePoint({time:63},65),0);});
