/* Trailer metadata and playback. Trailer views never write to viewing history. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.LumaTrailers=factory(root.LumaCore);}(typeof window!=='undefined'?window:this,function(C){
  'use strict';
  function createResolver(options){
    var cache=Object.create(null),inflight=Object.create(null),epoch=0;
    function resolve(meta){
      var local=C.trailerSources(meta);if(local.length)return Promise.resolve(local);
      var providers=options.providers(meta).slice(0,8),key=C.key(meta)+'\n'+providers.join('\n'),now=Date.now(),version=epoch;
      if(cache[key]&&cache[key].expires>now)return Promise.resolve(cache[key].items);
      if(inflight[key])return inflight[key];
      function next(i){if(i>=providers.length)return Promise.resolve([]);return options.json(providers[i]).then(function(data){var returned=data&&data.meta,items=returned&&returned.id===meta.id&&returned.type===meta.type?C.trailerSources(returned):[];return items.length?items:next(i+1);},function(){return next(i+1);});}
      var request=next(0).then(function(items){if(version===epoch){var keys=Object.keys(cache);if(keys.length>=60)delete cache[keys[0]];cache[key]={items:items,expires:Date.now()+(items.length?600000:30000)};delete inflight[key];}return items;});inflight[key]=request;return request;
    }
    return {resolve:resolve,clear:function(){epoch++;cache=Object.create(null);inflight=Object.create(null);}};
  }
  // A small cancellable scheduler prevents stale responses from starting a different title.
  function createScheduler(options){var timer=null,generation=0,active=null;
    function stop(){generation++;if(timer!==null)(options.clearTimer||clearTimeout)(timer);timer=null;if(active)active.destroy();active=null;}
    function select(meta){stop();var run=generation;timer=(options.setTimer||setTimeout)(function(){timer=null;if(!options.allowed(meta)){if(options.skipped)options.skipped(meta);return;}
      options.resolve(meta).then(function(items){if(run!==generation)return;if(!options.allowed(meta)){if(options.skipped)options.skipped(meta);return;}if(items.length)active=options.start(meta,items);else if(options.empty)options.empty(meta);},function(){if(run===generation&&options.empty)options.empty(meta);});
    },options.delay==null?2000:options.delay);}
    return {select:select,stop:stop};
  }
  var youtubeAPI=null;
  function loadYouTube(){
    if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
    if(youtubeAPI)return youtubeAPI;
    youtubeAPI=new Promise(function(resolve,reject){var done=false,tag=document.createElement('script'),timer,ready,previous=window.onYouTubeIframeAPIReady;
      function finish(error){if(done)return;done=true;clearTimeout(timer);tag.onerror=null;if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previous;if(error){tag.remove();youtubeAPI=null;reject(error);}else resolve(window.YT);}
      ready=window.onYouTubeIframeAPIReady=function(){if(typeof previous==='function')previous();finish();};
      tag.src='https://www.youtube.com/iframe_api';tag.referrerPolicy='origin';tag.onerror=function(){finish(new Error('YouTube player nije dostupan.'));};timer=setTimeout(function(){finish(new Error('YouTube nije odgovorio na vrijeme.'));},12000);document.head.appendChild(tag);
    });return youtubeAPI;
  }
  function createPlayer(options){
    var mount=options.mount,items=options.items.slice(0,3),index=-1,player=null,video=null,hls=null,timer=null,playRetry=null,closed=false,run=0,muted=options.muted!==false,playing=false,started=false;
    function report(state,message){if(!closed)options.onState({state:state,message:message||'',muted:muted});}
    function clear(){run++;clearTimeout(timer);clearTimeout(playRetry);playRetry=null;if(hls){hls.destroy();hls=null;}if(player){try{player.destroy();}catch(_){}player=null;}if(video){video.pause();video.removeAttribute('src');video.load();video=null;}mount.textContent='';playing=false;started=false;}
    function watchdog(id){clearTimeout(timer);timer=setTimeout(function(){if(!closed&&id===run)advance('Trailer se ne može pokrenuti na ovom uređaju.');},18000);}
    function blocked(){clearTimeout(timer);playing=false;report('blocked','Pritisni Pokreni trailer. TV nije dopustio automatsku reprodukciju.');}
    function play(){if(closed)return;var playRun=run;clearTimeout(playRetry);playRetry=null;if(options.allowed&&!options.allowed()){playRetry=setTimeout(function(){if(!closed&&playRun===run)play();},120);return;}if(player){try{muted?player.mute():player.unMute();player.playVideo();}catch(_){blocked();}}else if(video){video.muted=muted;var p=video.play();if(p&&p.catch)p.catch(function(e){if(closed||playRun!==run||e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError')blocked();else advance('Format trailera nije podržan.');});}}
    function advance(reason){clear();if(closed)return;index++;if(index>=items.length){report('unavailable',reason||'Trailer nije dostupan za ovaj naslov.');return;}var item=items[index],id=run;if(options.onSource)options.onSource(item);report('loading','Učitavam trailer…');watchdog(id);
      if(item.kind==='youtube'){
        loadYouTube().then(function(YT){if(closed||id!==run)return;
          var frame=document.createElement('iframe');frame.title='Trailer · '+(options.title||item.title);frame.tabIndex=-1;frame.setAttribute('allow','autoplay; encrypted-media; fullscreen');frame.setAttribute('allowfullscreen','');frame.setAttribute('referrerpolicy','origin');frame.setAttribute('frameborder','0');
          frame.src='https://www.youtube-nocookie.com/embed/'+item.ytId+'?enablejsapi=1&autoplay=0&playsinline=1&controls='+(options.preview?'0':'1')+'&disablekb=1&rel=0&origin='+encodeURIComponent(location.origin);mount.appendChild(frame);
          player=new YT.Player(frame,{events:{onReady:function(){if(closed||id!==run)return;play();},onStateChange:function(e){if(closed||id!==run)return;playing=e.data===1;if(playing){started=true;clearTimeout(timer);report('playing',muted?'Trailer · bez zvuka':'Trailer · zvuk uključen');}else if(e.data===0){clearTimeout(timer);report('ended','Trailer je završio.');}else if(e.data===2&&started)report('paused','Trailer je pauziran.');},onAutoplayBlocked:function(){if(!closed&&id===run)blocked();},onError:function(e){if(closed||id!==run)return;advance(e.data===153?'YouTube nije prihvatio identitet TV aplikacije.':'YouTube ne dopušta ovaj trailer u ugrađenom playeru.');}}});
        }).catch(function(e){if(!closed&&id===run)advance(e.message);});
      }else {
        var plan=C.playbackPlan(item,{},location.protocol);if(plan.error){advance(plan.error);return;}
        video=document.createElement('video');video.muted=muted;video.defaultMuted=muted;video.playsInline=true;video.setAttribute('playsinline','');video.preload='metadata';mount.appendChild(video);
        video.addEventListener('playing',function(){if(closed||id!==run)return;playing=true;started=true;clearTimeout(timer);report('playing',muted?'Trailer · bez zvuka':'Trailer · zvuk uključen');});
        video.addEventListener('pause',function(){if(closed||id!==run||!started)return;playing=false;report('paused','Trailer je pauziran.');});
        video.addEventListener('ended',function(){if(closed||id!==run)return;playing=false;clearTimeout(timer);report('ended','Trailer je završio.');});
        video.addEventListener('error',function(){if(!closed&&id===run)advance('Format trailera nije podržan.');});
        if(plan.hls&&!video.canPlayType('application/vnd.apple.mpegurl')){
          if(window.Hls&&window.Hls.isSupported()){hls=new window.Hls({maxBufferLength:10,maxMaxBufferLength:20,backBufferLength:0,capLevelToPlayerSize:true});hls.on(window.Hls.Events.MEDIA_ATTACHED,function(){if(!closed&&id===run)hls.loadSource(plan.url);});hls.on(window.Hls.Events.MANIFEST_PARSED,play);hls.on(window.Hls.Events.ERROR,function(_,data){if(!closed&&id===run&&data.fatal)advance('HLS trailer nije dostupan.');});hls.attachMedia(video);}else advance('TV ne podržava ovaj HLS trailer.');
        }else {video.src=plan.url;play();}
      }
    }
    advance();
    return {play:play,toggle:function(){if(playing){if(player)player.pauseVideo();if(video)video.pause();}else play();},pause:function(){if(player)player.pauseVideo();if(video)video.pause();},sound:function(){muted=!muted;if(player){muted?player.mute():player.unMute();}if(video)video.muted=muted;report(playing?'playing':'paused',muted?'Trailer · bez zvuka':'Trailer · zvuk uključen');},destroy:function(){closed=true;clear();}};
  }
  function visibleEnough(rect,width,height){var w=Math.max(0,Math.min(rect.right,width)-Math.max(rect.left,0)),h=Math.max(0,Math.min(rect.bottom,height)-Math.max(rect.top,0));return rect.width>=200&&rect.height>=200&&w*h>rect.width*rect.height*.5;}
  return {createResolver:createResolver,createScheduler:createScheduler,createPlayer:createPlayer,visibleEnough:visibleEnough};
}));
