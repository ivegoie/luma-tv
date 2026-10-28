/* Small playback state machines. No network, account data or frame loops. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaPlayback=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function isTV(agent){return /VIDAA|Hisense|Smart[ -]?TV|HbbTV|Tizen|Web0S|WebOS|NetCast|Android.*(?:TV|AFT)|BRAVIA|Viera|Opera TV|TV Store/i.test(String(agent||''));}
  var hlsLoads=new WeakMap();
  function ensureHls(options){options=options||{};var env=options.environment||(typeof window!=='undefined'?window:null);if(!env||!env.document)return Promise.reject(new Error('HLS preglednik nije dostupan.'));if(env.Hls)return Promise.resolve(env.Hls);if(hlsLoads.has(env))return hlsLoads.get(env);
    var promise=new Promise(function(resolve,reject){var script=env.document.createElement('script'),timer,done=false;function finish(error){if(done)return;done=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){hlsLoads.delete(env);script.remove();reject(error);}else resolve(env.Hls);}script.src='vendor/hls-1.7.3.min.js';script.onload=function(){finish(env.Hls?null:new Error('HLS player nije učitan.'));};script.onerror=function(){finish(new Error('HLS player nije dostupan.'));};timer=setTimeout(function(){finish(new Error('Isteklo je učitavanje HLS playera.'));},options.timeout||30000);env.document.head.appendChild(script);});hlsLoads.set(env,promise);return promise;
  }
  function hlsConfig(slow,preview){var result={maxBufferLength:preview?10:slow?30:20,maxMaxBufferLength:preview?20:45,maxBufferSize:preview?10000000:24000000,backBufferLength:preview?0:5,capLevelToPlayerSize:true,enableWorker:true};if(slow){result.startLevel=0;result.abrEwmaDefaultEstimate=600000;}return result;}
  function capHls(hls,quality){var levels=hls.levels||[],cap=-1;for(var i=0;i<levels.length;i++){if(Number(levels[i].height)>quality)break;cap=i;}if(levels.length&&cap<0)return false;if(cap>=0)hls.autoLevelCapping=cap;return true;}
  function controls(options){
    var visible=true,closed=false,timer=null,set=options.setTimeout||setTimeout,clear=options.clearTimeout||clearTimeout;
    function hide(){if(closed)return;clear(timer);timer=null;visible=false;options.visibility(false);}
    function arm(){clear(timer);timer=null;if(!closed&&visible&&!options.paused()&&!options.menuOpen())timer=set(hide,options.delay||3000);}
    function show(){if(closed)return;var changed=!visible;visible=true;options.visibility(true);arm();if(changed&&options.focus)options.focus();}
    return {show:show,hide:hide,visible:function(){return visible;},playing:function(){if(timer==null)arm();},pause:show,ok:function(){if(closed)return;if(!visible){show();return;}options.toggle();arm();},destroy:function(){closed=true;clear(timer);}};
  }
  function clampSeek(video,point){
    var duration=Number(video.duration);if(!isFinite(duration)||duration<=0)return null;
    point=Math.max(0,Math.min(Math.max(0,duration-.1),point));var ranges=video.seekable;
    if(ranges&&ranges.length){var nearest=null,distance=Infinity;for(var i=0;i<ranges.length;i++){var lo=ranges.start(i),end=ranges.end(i);if(end<=lo+.01)continue;var hi=Math.max(lo,end-.1),candidate=Math.max(lo,Math.min(hi,point));if(Math.abs(candidate-point)<distance){nearest=candidate;distance=Math.abs(candidate-point);}}if(nearest!=null)return nearest;}
    return point;
  }
  function seeker(options){
    var target=null,timer=null,closed=false,set=options.setTimeout||setTimeout,clear=options.clearTimeout||clearTimeout;
    function commit(){clear(timer);timer=null;if(closed||target==null)return;var point=target;target=null;try{options.video.currentTime=point;if(options.commit)options.commit(point);}catch(_){if(options.error)options.error();}options.preview(null);}
    function to(point,immediate){if(closed)return false;var next=clampSeek(options.video,point);if(next==null)return false;target=next;options.preview(target);clear(timer);if(immediate)commit();else timer=set(commit,350);return true;}
    return {by:function(amount){return to((target==null?Number(options.video.currentTime)||0:target)+amount);},to:to,commit:commit,pending:function(){return target;},destroy:function(){closed=true;clear(timer);target=null;}};
  }
  function watchdog(options){
    var now=options.now||Date.now,lastAt=now(),lastTime=0,started=false,progressed=false,active=true,failed=false,waitingAt=null,episodes=[],buffering=false;
    function show(value){if(value===buffering)return;buffering=value;if(options.buffering)options.buffering(value);}
    function reset(){lastAt=now();lastTime=Number(options.video.currentTime)||0;waitingAt=null;show(false);}
    return {playing:function(){started=true;active=true;},pause:function(){active=false;waitingAt=null;show(false);},resume:function(){active=true;reset();},seek:reset,
      tick:function(){if(failed||!active||options.video.ended)return;var stamp=now(),time=Number(options.video.currentTime)||0;
        if(time>lastTime+.04){progressed=true;if(waitingAt!=null){episodes.push({at:stamp,ms:stamp-waitingAt});waitingAt=null;}lastAt=stamp;lastTime=time;show(false);}
        else {if(time<lastTime-.5)reset();if(started&&options.video.paused)return;if(waitingAt==null)waitingAt=stamp;show(stamp-lastAt>900);}
        episodes=episodes.filter(function(e){return stamp-e.at<60000;});var stalled=stamp-lastAt>=(progressed?(options.timeout||20000):(options.startupTimeout||options.timeout||20000)),repeated=episodes.length>=3&&episodes.reduce(function(n,e){return n+e.ms;},0)>=(options.repeatThreshold||12000);
        if(stalled||repeated){failed=true;show(false);options.fail(repeated?'repeated-buffering':'stalled');}
      },destroy:function(){active=false;failed=true;show(false);}};
  }
  return {isTV:isTV,ensureHls:ensureHls,hlsConfig:hlsConfig,capHls:capHls,controls:controls,seeker:seeker,watchdog:watchdog,clampSeek:clampSeek};
}));
