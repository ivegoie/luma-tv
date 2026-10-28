const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../experience.js');
function entry(name,order=0){return {stream:{name},plan:{kind:'direct',url:'https://example.test/'+order},order};}
const aacOnly=type=>type.includes('mp4a.40.')?'probably':'';
test('unsupported movie audio loses to a playable source, without removing manual choices',()=>{
  const silent=entry('2160p DTS-HD MA',0),audible=entry('1080p AAC 2.0',1),input=[silent,audible];
  assert.deepEqual(E.rank(input,{canPlay:aacOnly}),[audible,silent]);
  assert.deepEqual(input,[silent,audible]);
});
test('highest resolution up to 4K wins when the device reports audio support',()=>{
  const items=[entry('1080p AAC',0),entry('2160p EAC3',1),entry('4320p AAC',2)];
  assert.deepEqual(E.rank(items,{canPlay:()=> 'probably'}),[items[1],items[0]]);
});
test('unknown audio labels are not treated as a confirmed incompatible codec',()=>{
  const items=[entry('1080p AAC',0),entry('2160p WEB-DL',1)];
  assert.equal(E.rank(items,{canPlay:aacOnly})[0],items[1]);
});
test('Dolby Digital Plus release labels are distinguished from AC3',()=>{
  for(const name of ['EAC3 5.1','E-AC-3','DDP5.1','DD+ 5.1','Dolby Digital Plus'])assert.deepEqual(E.audioCodecs({name}),['ec-3'],name);
  for(const name of ['AC3','AC-3','DD5.1','Dolby Digital'])assert.deepEqual(E.audioCodecs({name}),['ac-3'],name);
});
test('AAC, lossless audio and multiple track labels are recognized',()=>{
  assert.deepEqual(E.audioCodecs({name:'AAC2.0'}),['mp4a.40.2']);
  assert.deepEqual(E.audioCodecs({name:'HE-AAC'}),['mp4a.40.5']);
  assert.deepEqual(E.audioCodecs({behaviorHints:{filename:'Film.TrueHD.7.1.DTS-HD.AAC.mkv'}}),['mlpa','dtsl','mp4a.40.2']);
  assert.deepEqual(E.audioCodecs({name:'Atmos 5.1 2160p'}),[]);
});
test('legacy negative capability answers and thrown probes do not count as support',()=>{
  const items=[entry('2160p DTS',0),entry('1080p AAC',1)];
  for(const unsupported of ['no',false])assert.equal(E.rank(items,{canPlay:type=>type.includes('mp4a')?'maybe':unsupported})[0],items[1]);
  assert.equal(E.rank(items,{canPlay:type=>{if(type.includes('dts'))throw Error('Unsupported probe');return 'probably';}})[0],items[1]);
});
test('capability calls are cached within one ranking, not across different devices',()=>{
  const items=Array.from({length:20},(_,i)=>entry(i%2?'2160p DTS':'1080p AAC',i)),calls=[];
  E.rank(items,{canPlay:type=>{calls.push(type);return aacOnly(type);}});
  assert.equal(new Set(calls).size,calls.length);
  assert.equal(E.rank(items,{canPlay:()=> 'probably'})[0].stream.name,'2160p DTS');
});
test('without a capability probe, selection retains the existing quality preference',()=>{
  const items=[entry('1080p AAC',0),entry('2160p EAC3',1)];assert.equal(E.rank(items)[0],items[1]);
});
test('The Day of the Jackal original English outranks and flags Russian-only dubs',()=>{
  const ru=entry('The Day of the Jackal 2160p AAC RUS DUB',0),en=entry('The Day of the Jackal 1080p AAC ENG',1),options={meta:{language:'English'},audioLanguage:'original',tv:true,canPlay:()=> 'probably'};
  assert.equal(E.rank([ru,en],options)[0],en);assert.equal(E.sourceIssue(ru.stream,options),'Drugi jezik zvuka');
});
test('original-language preference keeps Japanese and Russian originals',()=>{
  assert.equal(E.sourceIssue({name:'Film.JPN.AAC'},{meta:{originalLanguage:'ja'}}),'');
  assert.equal(E.sourceIssue({name:'Film.RUS.AAC'},{meta:{language:'Russian'}}),'');
  assert.equal(E.sourceIssue({name:'Film.ENG.DUB.AAC'},{meta:{language:'Japanese'}}),'Drugi jezik zvuka');
});
test('subtitle languages do not masquerade as audio and unknown language is not guessed',()=>{
  assert.deepEqual(E.audioLanguages({name:'1080p AAC',description:'Subtitles: RUS, ENG'}),[]);
  assert.equal(E.sourceIssue({name:'Film RUS AAC'},{meta:{name:'Unknown language'}}),'');
  assert.equal(E.sourceIssue({name:'Film ENG+RUS AAC'},{meta:{language:'English'}}),'');
});
test('TV safety prefers AAC 1080p over an expensive 4K remux, even if the API reports support',()=>{
  const large=entry('Warfare 2160p REMUX TrueHD 65 GB',0),small=entry('Warfare 1080p H264 AAC 2 GB',1);
  assert.equal(E.rank([large,small],{tv:true,compatibility:true,canPlay:()=> 'probably'})[0],small);
});
test('track selection chooses original audio and preserves an explicitly chosen track',()=>{
  const tracks=[{language:'rus',enabled:true},{language:'eng',enabled:false},{language:'eng',label:'Audio description'}];
  assert.equal(E.selectAudio(tracks,{language:'English'},'original'),1);
  assert.equal(E.selectAudio(tracks,{language:'Russian'},'original'),0);
  assert.equal(E.selectAudio(tracks,{},'original'),0);
});
test('weak connection ranking prefers a smaller compatible source over a huge 1080p release',()=>{const large=entry('1080p AAC 12 GB',0),small=entry('1080p AAC 1.5 GB',1);assert.equal(E.rank([large,small],{lowData:true,maxQuality:1080,meta:{runtime:'120 min'},canPlay:aacOnly})[0],small);assert.equal(E.rank([large,small],{maxQuality:1080,canPlay:aacOnly})[0],large);});
test('weak mode still favours playable original audio and keeps torrent sources available',()=>{const dubbed=entry('1080p AAC RUS 100 MB',0),original=entry('720p AAC ENG 1 GB',1),torrent=entry('720p AAC ENG 500 MB',2);torrent.plan.kind='torrent';const result=E.rank([dubbed,original,torrent],{lowData:true,meta:{originalLanguage:'en',runtime:'90 min'},canPlay:aacOnly});assert.equal(result[0],original);assert.ok(result.includes(torrent));});
test('bitrate estimates only use reported runtime and sizes',()=>{assert.equal(E.runtimeSeconds({runtime:'1h 45m'}),6300);assert.equal(E.runtimeSeconds({runtime:'120 min'}),7200);assert.equal(E.runtimeSeconds({runtime:'unknown'}),0);assert.ok(E.networkCost({name:'1080p 10 GB'},{lowData:true,meta:{runtime:'120 min'}})>E.networkCost({name:'1080p 1 GB'},{lowData:true,meta:{runtime:'120 min'}}));});

test('bandwidth savings never outrank known audio incompatibility',()=>{const silent=entry('720p DTS-HD 100 MB',0),audible=entry('1080p AAC 80 GB',1);assert.equal(E.rank([silent,audible],{lowData:true,downlink:1,meta:{runtime:'90 min'},canPlay:aacOnly})[0],audible);});
