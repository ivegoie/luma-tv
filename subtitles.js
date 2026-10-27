/* LUMA subtitles: direct, native/HLS and Stremio addon tracks. No streaming server required. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaSubtitles=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function isCroatian(language,label){
    var lang=String(language||'').toLowerCase().trim().replace(/_/g,'-');
    if(/^(hr|hrv|cro|croatian|hrvatski)(-|$)/.test(lang))return true;
    return (!lang||lang==='und')&&/\b(hrvatski|croatian|hrv|hr)\b/i.test(label||'');
  }
  function extras(stream){var h=stream&&stream.behaviorHints||{},out={};
    if(typeof h.videoHash==='string'&&/^[a-f0-9]{16}$/i.test(h.videoHash))out.videoHash=h.videoHash;
    if(Number(h.videoSize)>0&&isFinite(Number(h.videoSize)))out.videoSize=String(h.videoSize);
    if(typeof h.filename==='string'&&h.filename.length<=2048)out.filename=h.filename;
    return out;
  }
  function toVTT(value){
    var text=String(value||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    if(text.length>2000000)throw new Error('Datoteka titlova je prevelika.');
    if(/^WEBVTT(?:[ \t\n]|$)/.test(text))return text;
    // SRT cues: accept numeric cue IDs and comma or dot milliseconds. No HTML document conversion.
    var blocks=text.trim().split(/\n[ \t]*\n/),cues=[];
    blocks.forEach(function(block){var lines=block.split('\n');if(/^\d+$/.test(lines[0].trim()))lines.shift();
      var time=/^(\d{1,3}:\d{2}:\d{2})[,.](\d{3})\s*-->\s*(\d{1,3}:\d{2}:\d{2})[,.](\d{3})(?:\s.*)?$/.exec((lines.shift()||'').trim());
      if(!time||!lines.length)return;
      var body=lines.join('\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<(?!\/?(?:b|i|u)>)[^>]*>/gi,'').replace(/-->/g,'→');
      cues.push(time[1]+'.'+time[2]+' --> '+time[3]+'.'+time[4]+'\n'+body);
    });
    if(!cues.length)throw new Error('Podržani su SRT i WebVTT titlovi.');
    return 'WEBVTT\n\n'+cues.join('\n\n')+'\n';
  }
  function create(options){
    var video=options.video,hls=null,external=[],tracks=[],requests=[],urls=[],closed=false,pending=0,failedProviders=0;
    var automatic=options.preferred!=='off',selected=null,busy=null,revision=0,error='',refreshTimer,trackTimers=[];
    var failed=Object.create(null),known=Object.create(null),owned=[],cueTracks=[],cuePositions=new WeakMap(),controlsVisible=true;
    function positionCues(){if(closed)return;for(var i=0;i<video.textTracks.length;i++){var track=video.textTracks[i];if(track.mode!=='showing')continue;var cues=track.activeCues||[];for(var j=0;j<cues.length;j++){var cue=cues[j];try{if(!cuePositions.has(cue))cuePositions.set(cue,{line:cue.line,snap:cue.snapToLines,align:cue.lineAlign});var original=cuePositions.get(cue);if(controlsVisible){cue.snapToLines=false;cue.line=76;cue.lineAlign='end';}else {cue.line=original.line;cue.snapToLines=original.snap;cue.lineAlign=original.align;}}catch(_){}}}}
    function inventory(){var list=[];
      if(hls)(hls.subtitleTracks||[]).forEach(function(t,i){list.push({id:'hls-'+i,kind:'hls',index:i,lang:t.lang,label:t.name||t.lang||'HLS titlovi'});});
      for(var i=0;i<video.textTracks.length;i++){var t=video.textTracks[i];if(cueTracks.indexOf(t)<0&&t.addEventListener){cueTracks.push(t);t.addEventListener('cuechange',positionCues);}if(owned.indexOf(t)>=0||['subtitles','captions'].indexOf(t.kind)<0)continue;
        if(hls&&(hls.subtitleTracks||[]).some(function(s){return s.name===t.label||s.lang===t.language;}))continue;
        list.push({id:'native-'+i,kind:'native',track:t,lang:t.language,label:t.label||t.language||'Ugrađeni titlovi'});
      }
      tracks=list.concat(external);return tracks;
    }
    function emit(){if(closed)return;options.onChange({automatic:automatic,off:!automatic&&!selected&&!busy,selected:selected&&selected.id,label:selected?selected.label:'',loading:!!busy||pending>0,error:error,failedProviders:failedProviders,choices:inventory().map(function(t){return {id:t.id,label:(isCroatian(t.lang,t.label)?'Hrvatski'+(t.label&&!/^(hr|hrv|cro|croatian|hrvatski)$/i.test(t.label)?' · '+t.label:''):t.label)+(t.provider?' · '+t.provider:''),croatian:isCroatian(t.lang,t.label),failed:!!failed[t.id]};})});}
    function disable(){if(hls){hls.subtitleTrack=-1;hls.subtitleDisplay=false;}for(var i=0;i<video.textTracks.length;i++)video.textTracks[i].mode='disabled';}
    function refresh(){if(closed)return;inventory();if(!selected&&!busy)disable();else if(selected&&selected.kind!=='hls'){for(var i=0;i<video.textTracks.length;i++){if(video.textTracks[i]!==selected.track&&owned.indexOf(video.textTracks[i])<0)video.textTracks[i].mode='disabled';}}if(automatic&&!selected&&!busy){var candidate=tracks.find(function(t){return isCroatian(t.lang,t.label)&&!failed[t.id];});if(candidate){choose(candidate,false);return;}}emit();}
    function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,0);}
    function requestText(url,encoding){return new Promise(function(resolve,reject){var x=new XMLHttpRequest();requests.push(x);x.open('GET',url,true);x.timeout=12000;x.responseType='arraybuffer';
      x.onprogress=function(e){if(e.loaded>2000000){x.abort();reject(new Error('Datoteka titlova je prevelika.'));}};
      x.onload=function(){if(x.status<200||x.status>=300){reject(new Error('Titlovi nisu dostupni.'));return;}try{var bytes=x.response;if(!bytes||bytes.byteLength>2000000)throw new Error('Neispravna datoteka titlova.');var text;
        if(typeof TextDecoder!=='undefined'){var charset=String(encoding||'utf-8').toLowerCase().replace(/^cp(\d+)$/,'windows-$1'),u8=new Uint8Array(bytes);
          if(u8[0]===255&&u8[1]===254)charset='utf-16le';else if(u8[0]===254&&u8[1]===255)charset='utf-16be';else if(u8[0]===239&&u8[1]===187&&u8[2]===191)charset='utf-8';
          try{text=new TextDecoder(charset).decode(bytes);}catch(_){text=new TextDecoder('utf-8').decode(bytes);}
          if(text.indexOf('\uFFFD')>=0)text=new TextDecoder('windows-1250').decode(bytes);}
        else {var u=new Uint8Array(bytes),raw='';for(var i=0;i<u.length;i++)raw+=String.fromCharCode(u[i]);try{text=decodeURIComponent(escape(raw));}catch(_){text=raw;}}
        resolve(text);
      }catch(e){reject(e);}};
      x.onerror=x.ontimeout=function(){reject(new Error('Titlovi se ne mogu dohvatiti. Provjeri vezu ili odaberi drugi prijevod.'));};x.onabort=function(){reject(new Error('Dohvat je prekinut.'));};x.send();
    });}
    function load(t){if(t.track)return Promise.resolve(t.track);return (options.loadText||requestText)(t.url,t.encoding).then(function(text){if(closed)throw new Error('Player je zatvoren.');var data=toVTT(text);return new Promise(function(resolve,reject){var element=document.createElement('track'),url=URL.createObjectURL(new Blob([data],{type:'text/vtt'}));urls.push(url);element.kind='subtitles';element.label=t.label;element.srclang=isCroatian(t.lang,t.label)?'hr':t.lang||'und';element.src=url;var timer;
        function finish(err){clearTimeout(timer);element.onload=element.onerror=null;if(err){element.remove();reject(err);}else {t.track=element.track;resolve(t.track);}}
        element.onload=function(){finish();};element.onerror=function(){finish(new Error('TV ne može učitati ovaj prijevod.'));};video.appendChild(element);owned.push(element.track);element.track.mode='hidden';timer=setTimeout(function(){finish(new Error('Titlovi nisu učitani na vrijeme.'));},12000);trackTimers.push(timer);
      });});}
    function choose(t,manual){if(closed)return;if(manual)automatic=false;var run=++revision;busy=t;error='';emit();
      function commit(track){if(closed||run!==revision){if(track&&(!selected||selected.track!==track))track.mode='disabled';return;}disable();selected=t;busy=null;delete failed[t.id];if(t.kind==='hls'){hls.subtitleTrack=t.index;hls.subtitleDisplay=true;}else track.mode='showing';positionCues();emit();}
      if(t.kind==='external')load(t).then(commit).catch(function(e){if(closed||run!==revision)return;busy=null;failed[t.id]=true;error=e.message;refresh();});
      else commit(t.track);
    }
    function add(items,provider){(Array.isArray(items)?items:[]).slice().sort(function(a,b){return Number(isCroatian(b&&b.lang,b&&b.label))-Number(isCroatian(a&&a.lang,a&&a.label));}).slice(0,300).forEach(function(s){if(!s||typeof s.url!=='string')return;var u;try{u=new URL(s.url);if(!/^https?:$/.test(u.protocol)||u.username||u.password||options.protocol==='https:'&&u.protocol!=='https:')return;}catch(_){return;}if(known[u.href])return;known[u.href]=true;
        external.push({id:'external-'+external.length,kind:'external',lang:s.lang||'und',label:String(s.label||s.movieReleaseName||s.subtitleFileName||s.lang||'Titlovi').slice(0,160),encoding:s.SubEncoding,provider:provider,url:u.href});});refresh();}
    function select(id){if(id==='auto'){revision++;busy=null;selected=null;automatic=true;failed=Object.create(null);error='';disable();refresh();return;}if(id==='off'){revision++;automatic=false;busy=null;selected=null;error='';disable();emit();return;}var t=inventory().find(function(t){return t.id===id;});if(t)choose(t,true);}
    if(video.textTracks.addEventListener)video.textTracks.addEventListener('addtrack',schedule);
    video.addEventListener('loadedmetadata',schedule);
    return {add:add,select:select,refresh:refresh,setControlsVisible:function(value){controlsVisible=value;positionCues();},setHls:function(value){hls=value;refresh();},providers:function(jobs){pending=jobs.length;emit();jobs.forEach(function(job){job.then(function(result){if(!closed)add(result.items,result.provider);}).catch(function(){failedProviders++;}).then(function(){if(closed)return;pending--;refresh();});});},destroy:function(){closed=true;revision++;clearTimeout(refreshTimer);trackTimers.forEach(clearTimeout);requests.forEach(function(x){x.abort();});if(video.textTracks.removeEventListener)video.textTracks.removeEventListener('addtrack',schedule);video.removeEventListener('loadedmetadata',schedule);cueTracks.forEach(function(t){t.removeEventListener('cuechange',positionCues);});urls.forEach(function(u){URL.revokeObjectURL(u);});}};
  }
  return {isCroatian:isCroatian,extras:extras,toVTT:toVTT,create:create};
}));
