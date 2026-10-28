const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('../core.js');
function fixture(){
 const nodes=[],reports=[],sources=[],calls=[],timers=new Map();let sequence=0,events;
 const document={createElement(tag){const n={tag,attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},addEventListener(k,v){this.listeners[k]=v;},remove(){},pause(){},load(){},play(){calls.push(['video',this.muted]);return Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'}));},canPlayType(){return ''}};nodes.push(n);return n;}};
 const mount={textContent:'',appendChild(){}},window={YT:{Player:function(frame,opts){events=opts.events;return {mute(){calls.push('mute');},unMute(){calls.push('unmute');},playVideo(){calls.push('play');},pauseVideo(){},destroy(){calls.push('destroy');}};}}};
 const box={module:{exports:{}},require:()=>C,window,document,location:{origin:'https://app.example',protocol:'https:'},setTimeout(fn){const n=++sequence;timers.set(n,fn);return n;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../trailers.js'),'utf8'),box);
 return {nodes,reports,sources,calls,timers,events:()=>events,start(items){return box.module.exports.createPlayer({mount,items,muted:false,preview:true,onSource:x=>sources.push(x.kind),onState:x=>reports.push(x)});}};
}
test('sound-on YouTube preview waits for gesture when blocked and never silently mutes',async()=>{
 const f=fixture(),p=f.start([{kind:'youtube',ytId:'w0HgHet0sxg'}]);await Promise.resolve();
 f.events().onReady();f.events().onAutoplayBlocked();assert.equal(f.reports.at(-1).state,'blocked');assert.equal(f.reports.at(-1).muted,false);assert.deepEqual(f.calls,['unmute','play']);assert.equal(f.timers.size,0);
 p.play();assert.deepEqual(f.calls,['unmute','play','unmute','play']);assert.match(f.nodes[0].src,/controls=0/);p.destroy();
});
test('blocked direct preview remains unmuted and waits rather than advancing to another source',async()=>{
 const f=fixture(),p=f.start([{kind:'video',url:'https://app.example/trailer.mp4'},{kind:'youtube',ytId:'w0HgHet0sxg'}]);await Promise.resolve();
 assert.equal(f.reports.at(-1).state,'blocked');assert.equal(f.reports.at(-1).muted,false);assert.deepEqual(f.sources,['video']);assert.deepEqual(f.calls,[['video',false]]);p.destroy();assert.equal(f.timers.size,0);
});
test('a failed direct source announces YouTube layout before the fallback player loads',async()=>{
 const f=fixture(),p=f.start([{kind:'video',url:'https://app.example/trailer.mp4'},{kind:'youtube',ytId:'w0HgHet0sxg'}]);f.nodes[0].listeners.error();await Promise.resolve();
 assert.deepEqual(f.sources,['video','youtube']);assert.equal(f.nodes[1].tag,'iframe');assert.equal(f.reports.at(-1).state,'loading');p.destroy();
});
