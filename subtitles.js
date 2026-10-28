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
  function release(value){var text=String(value||'').toLowerCase().replace(/\.(mkv|mp4|avi|srt|vtt|ass|ssa)$/i,''),ep=/\bs(\d{1,2})[ ._-]*e(\d{1,3})\b/i.exec(text)||/\b(\d{1,2})x(\d{1,3})\b/.exec(text),year=/\b((?:19|20)\d{2})\b/.exec(text),group=/-([a-z0-9]{2,24})$/i.exec(text),tokens=text.replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/);return {text:text.replace(/[^a-z0-9]+/g,' ').trim(),tokens:tokens,season:ep?Number(ep[1]):null,episode:ep?Number(ep[2]):null,year:year&&year[1],group:group&&group[1],source:/blu[ ._-]?ray|bdrip|brrip/.test(text)?'bluray':/web[ ._-]?(dl|rip)|webrip/.test(text)?'web':/hdtv/.test(text)?'hdtv':/dvd/.test(text)?'dvd':''};}
  function matchScore(subtitle,context,associated){context=context||{};var file=extras(context.stream||{}),video=release(file.filename||''),name=subtitle.movieReleaseName||subtitle.releaseName||subtitle.subtitleFileName||subtitle.filename||subtitle.label||'',sub=release(name),expected=/^(tt\d+)(?::(\d+):(\d+))?$/.exec(context.videoId||''),season=context.episode&&context.episode.season,episode=context.episode&&context.episode.episode;
    if(season==null)season=expected&&expected[2]!=null?Number(expected[2]):video.season;if(episode==null)episode=expected&&expected[3]!=null?Number(expected[3]):video.episode;
    var subSeason=subtitle.season==null?sub.season:Number(subtitle.season),subEpisode=subtitle.episode==null?sub.episode:Number(subtitle.episode),imdb=String(subtitle.imdbId||subtitle.imdb_id||'');
    if(expected&&/^tt\d+$/.test(imdb)&&imdb!==expected[1]||season!=null&&subSeason!=null&&Number(season)!==subSeason||episode!=null&&subEpisode!=null&&Number(episode)!==subEpisode)return -1000;
    var hash=String(subtitle.videoHash||subtitle.movieHash||subtitle.moviehash||'').toLowerCase();if(file.videoHash&&/^[a-f0-9]{16}$/.test(hash))return hash===file.videoHash.toLowerCase()?1200:-1000;
    var score=associated?600:0;if(video.text&&sub.text===video.text)return 900;
    if(video.group&&sub.group)score+=video.group===sub.group?180:-50;
    if(video.source&&sub.source)score+=video.source===sub.source?45:-40;
    if(video.year&&sub.year)score+=video.year===sub.year?10:-80;
    if(season!=null&&subSeason!=null&&episode!=null&&subEpisode!=null)score+=60;
    var title=String(context.meta&&context.meta.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(function(t){return t.length>1&&!/^(the|and|of)$/.test(t);});if(title.length&&title.every(function(t){return sub.tokens.indexOf(t)>=0;}))score+=35;
    return score;
  }
  function toVTT(value){
    var text=String(value||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    if(text.length>2000000)throw new Error('Datoteka titlova je prevelika.');
    if(/^WEBVTT(?:[ \t\n]|$)/.test(text))return text;
    if(/\[Events\]/i.test(text)){
      var fields=null,ass=[];text.split('\n').forEach(function(line){if(/^Format:/i.test(line))fields=line.slice(7).split(',').map(function(f){return f.trim().toLowerCase();});if(!/^Dialogue:/i.test(line)||!fields)return;var parts=line.slice(9).trim().split(','),values=parts.slice(0,fields.length-1);values.push(parts.slice(fields.length-1).join(','));var start=values[fields.indexOf('start')],end=values[fields.indexOf('end')],body=values[fields.indexOf('text')];
        if(!start||!end||!body||/\{[^}]*\\p[1-9]/.test(body))return;function stamp(t){return t.replace(/^(\d):/,'0$1:').replace(/\.(\d{2})$/,'.$10');}body=body.replace(/\{[^}]*\}/g,'').replace(/\\[Nn]/g,'\n').replace(/\\h/g,' ');ass.push(stamp(start)+' --> '+stamp(end)+'\n'+body);});
      if(!ass.length)throw new Error('Prijevod nema čitljivih redaka.');return 'WEBVTT\n\n'+ass.join('\n\n')+'\n';
    }
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
  function parseCues(value){var vtt=toVTT(value),out=[];function seconds(t){var parts=t.split(':').map(Number),n=0;parts.forEach(function(p){n=n*60+p;});return n;}
    vtt.split(/\n[ \t]*\n/).forEach(function(block){var lines=block.split('\n'),at=lines.findIndex(function(line){return line.indexOf('-->')>=0;});if(at<0)return;var m=/^\s*((?:\d+:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d+:)?\d{2}:\d{2}\.\d{3})/.exec(lines[at]);if(!m)return;var start=seconds(m[1]),end=seconds(m[2]),body=lines.slice(at+1).join('\n').replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|apos|nbsp);/g,function(_,e){return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e];}).replace(/&#(\d{1,5});/g,function(_,n){return String.fromCharCode(Number(n));});body=body.trim();if(end>start&&body)out.push({start:start,end:end,text:body});});
    if(!out.length)throw new Error('Prijevod nema čitljivih redaka.');out.sort(function(a,b){return a.start-b.start;});var end=0;out.forEach(function(c){end=Math.max(end,c.end);c.maxEnd=end;});return out;
  }
  function cueText(cues,time){var lo=0,hi=cues.length;while(lo<hi){var mid=(lo+hi)>>1;if(cues[mid].start<=time)lo=mid+1;else hi=mid;}var out=[];for(var i=lo-1;i>=0;i--){if(cues[i].maxEnd<=time)break;if(cues[i].end>time)out.unshift(cues[i].text);}return out.join('\n');}
  function create(options){
    var video=options.video,hls=null,external=[],tracks=[],requests=[],urls=[],closed=false,pending=0,failedProviders=0;
    var automatic=options.preferred!=='off',selected=null,busy=null,revision=0,error='',refreshTimer,trackTimers=[],offset=0;
    var failed=Object.create(null),known=Object.create(null),owned=[],cueTracks=[],cuePositions=new WeakMap(),controlsVisible=true,controlsLine=76,lastCue='';
    var cueTimes=new WeakMap(),timedCues=[],nativeShifted=false;
    function writeTimes(c,start,end){if(start>=c.endTime)c.endTime=end;c.startTime=start;c.endTime=end;}
    function restoreTimes(){if(!nativeShifted)return;timedCues.forEach(function(c){var original=cueTimes.get(c);try{writeTimes(c,original.start,original.end);}catch(_){}});nativeShifted=false;}
    function shiftNative(){if(!offset){restoreTimes();return;}if(!selected||selected.kind==='external')return;for(var i=0;i<video.textTracks.length;i++){var track=video.textTracks[i];if(selected.kind==='native'?track!==selected.track:track.mode!=='showing')continue;var cues=track.cues||[];for(var j=0;j<cues.length;j++){var c=cues[j];if(!isFinite(c.startTime)||!isFinite(c.endTime))continue;if(!offset&&!cueTimes.has(c))continue;try{if(!cueTimes.has(c)){cueTimes.set(c,{start:c.startTime,end:c.endTime});timedCues.push(c);}var original=cueTimes.get(c),start=Math.max(0,original.start+offset),end=Math.max(start+.01,original.end+offset);if(c.startTime!==start||c.endTime!==end)writeTimes(c,start,end);nativeShifted=true;}catch(_){}}}}
    function renderExternal(){if(!options.onCue||closed)return;var text=selected&&selected.cues?cueText(selected.cues,(Number(video.currentTime)||0)-offset):'';if(text!==lastCue){lastCue=text;options.onCue(text);}}
    function positionCues(){if(closed)return;shiftNative();for(var i=0;i<video.textTracks.length;i++){var track=video.textTracks[i];if(track.mode!=='showing')continue;var cues=track.activeCues||[];for(var j=0;j<cues.length;j++){var cue=cues[j];try{if(!cuePositions.has(cue))cuePositions.set(cue,{line:cue.line,snap:cue.snapToLines,align:cue.lineAlign});var original=cuePositions.get(cue);if(controlsVisible){cue.snapToLines=false;cue.line=controlsLine;cue.lineAlign='end';}else {cue.line=original.line;cue.snapToLines=original.snap;cue.lineAlign=original.align;}}catch(_){}}}}
    function inventory(){var list=[];
      if(hls)(hls.subtitleTracks||[]).forEach(function(t,i){list.push({id:'hls-'+i,kind:'hls',index:i,lang:t.lang,label:t.name||t.lang||'HLS titlovi'});});
      for(var i=0;i<video.textTracks.length;i++){var t=video.textTracks[i];if(cueTracks.indexOf(t)<0&&t.addEventListener){cueTracks.push(t);t.addEventListener('cuechange',positionCues);}if(owned.indexOf(t)>=0||['subtitles','captions'].indexOf(t.kind)<0)continue;
        if(hls&&(hls.subtitleTracks||[]).some(function(s){return s.name===t.label||s.lang===t.language;}))continue;
        list.push({id:'native-'+i,kind:'native',track:t,lang:t.language,label:t.label||t.language||'Ugrađeni titlovi'});
      }
      tracks=list.concat(external);return tracks;
    }
    function emit(){if(closed)return;options.onChange({automatic:automatic,off:!automatic&&!selected&&!busy,selected:selected&&selected.id,label:selected?selected.label:'',offset:offset,loading:!!busy||pending>0,error:error,failedProviders:failedProviders,choices:inventory().slice().sort(function(a,b){return Number(isCroatian(b.lang,b.label))-Number(isCroatian(a.lang,a.label))||priority(b)-priority(a);}).map(function(t){return {id:t.id,label:(isCroatian(t.lang,t.label)?'Hrvatski'+(t.label&&!/^(hr|hrv|cro|croatian|hrvatski)$/i.test(t.label)?' · '+t.label:''):t.label)+(t.provider?' · '+t.provider:''),croatian:isCroatian(t.lang,t.label),failed:!!failed[t.id]};})});}
    function disable(){restoreTimes();if(hls){hls.subtitleTrack=-1;hls.subtitleDisplay=false;}for(var i=0;i<video.textTracks.length;i++)video.textTracks[i].mode='disabled';if(options.onCue){lastCue='';options.onCue('');}}
    function priority(t){return t.kind==='external'?t.match:2000;}
    function refresh(){if(closed)return;inventory();if(!selected&&!busy)disable();else if(selected&&selected.kind!=='hls'){for(var i=0;i<video.textTracks.length;i++){if(video.textTracks[i]!==selected.track&&owned.indexOf(video.textTracks[i])<0)video.textTracks[i].mode='disabled';}}if(automatic){var candidates=tracks.filter(function(t){return isCroatian(t.lang,t.label)&&!failed[t.id]&&priority(t)>-500;}).sort(function(a,b){return priority(b)-priority(a);}),candidate=candidates[0],current=busy||selected;if(candidate&&(!current||candidate!==current&&priority(candidate)>priority(current))){choose(candidate,false);return;}}positionCues();emit();}
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
    function load(t){if(t.track||t.cues)return Promise.resolve(t.track);return (options.loadText||requestText)(t.url,t.encoding).then(function(text){if(closed)throw new Error('Player je zatvoren.');if(options.onCue){t.cues=parseCues(text);return null;}var data=toVTT(text);return new Promise(function(resolve,reject){var element=document.createElement('track'),url=URL.createObjectURL(new Blob([data],{type:'text/vtt'}));urls.push(url);element.kind='subtitles';element.label=t.label;element.srclang=isCroatian(t.lang,t.label)?'hr':t.lang||'und';element.src=url;var timer;
        function finish(err){clearTimeout(timer);element.onload=element.onerror=null;if(err){element.remove();reject(err);}else {t.track=element.track;resolve(t.track);}}
        element.onload=function(){finish();};element.onerror=function(){finish(new Error('TV ne može učitati ovaj prijevod.'));};video.appendChild(element);owned.push(element.track);element.track.mode='hidden';timer=setTimeout(function(){finish(new Error('Titlovi nisu učitani na vrijeme.'));},12000);trackTimers.push(timer);
      });});}
    function choose(t,manual){if(closed)return;if(manual)automatic=false;var run=++revision;busy=t;error='';emit();
      function commit(track){if(closed||run!==revision){if(track&&(!selected||selected.track!==track))track.mode='disabled';return;}disable();if(!selected||selected.id!==t.id)offset=0;selected=t;busy=null;delete failed[t.id];error='';if(t.kind==='hls'){hls.subtitleTrack=t.index;hls.subtitleDisplay=true;}else if(track)track.mode='showing';renderExternal();positionCues();emit();}
      if(t.kind==='external')load(t).then(commit).catch(function(e){if(closed||run!==revision)return;busy=null;failed[t.id]=true;error=e.message;refresh();});
      else commit(t.track);
    }
    function add(items,provider,associated){(Array.isArray(items)?items:[]).slice(0,1000).map(function(s,i){return {item:s,score:matchScore(s||{},options,associated),hr:isCroatian(s&&s.lang,s&&s.label),order:i};}).sort(function(a,b){return Number(b.hr)-Number(a.hr)||b.score-a.score||a.order-b.order;}).slice(0,300).forEach(function(entry){var s=entry.item;if(!s||typeof s.url!=='string')return;var u;try{u=new URL(s.url);if(!/^https?:$/.test(u.protocol)||u.username||u.password||options.protocol==='https:'&&u.protocol!=='https:')return;}catch(_){return;}var score=entry.score;if(known[u.href]){known[u.href].match=Math.max(known[u.href].match,score);return;}
        var label=String(s.label||s.movieReleaseName||s.subtitleFileName||s.lang||'Titlovi'),edition=s.movieReleaseName||s.releaseName||s.subtitleFileName;if(edition&&label.indexOf(edition)<0)label+=' · '+edition;
        var item={id:'external-'+external.length,kind:'external',lang:s.lang||'und',label:label.slice(0,220),encoding:s.SubEncoding,provider:provider,url:u.href,match:score};known[u.href]=item;external.push(item);});refresh();}
    function select(id){if(id==='auto'){revision++;busy=null;selected=null;offset=0;automatic=true;failed=Object.create(null);error='';disable();refresh();return;}if(id==='off'){revision++;automatic=false;busy=null;selected=null;offset=0;error='';disable();emit();return;}var t=inventory().find(function(t){return t.id===id;});if(t)choose(t,true);}
    function setOffset(value){if(closed||!selected||!isFinite(value))return false;revision++;busy=null;automatic=false;offset=Math.max(-120,Math.min(120,Math.round(value*2)/2));shiftNative();renderExternal();emit();return true;}
    if(video.textTracks.addEventListener)video.textTracks.addEventListener('addtrack',schedule);
    video.addEventListener('loadedmetadata',schedule);
    video.addEventListener('timeupdate',renderExternal);video.addEventListener('seeked',renderExternal);
    return {add:add,select:select,refresh:refresh,setOffset:setOffset,setControlsVisible:function(value,line){controlsVisible=value;if(isFinite(line))controlsLine=line;positionCues();},setHls:function(value){hls=value;refresh();},providers:function(jobs){pending=jobs.length;emit();jobs.forEach(function(job){job.then(function(result){if(!closed)add(result.items,result.provider);}).catch(function(){failedProviders++;}).then(function(){if(closed)return;pending--;refresh();});});},destroy:function(){closed=true;revision++;restoreTimes();if(options.onCue)options.onCue('');clearTimeout(refreshTimer);trackTimers.forEach(clearTimeout);requests.forEach(function(x){x.abort();});if(video.textTracks.removeEventListener)video.textTracks.removeEventListener('addtrack',schedule);video.removeEventListener('loadedmetadata',schedule);video.removeEventListener('timeupdate',renderExternal);video.removeEventListener('seeked',renderExternal);cueTracks.forEach(function(t){t.removeEventListener('cuechange',positionCues);});urls.forEach(function(u){URL.revokeObjectURL(u);});}};
  }
  return {isCroatian:isCroatian,extras:extras,release:release,matchScore:matchScore,toVTT:toVTT,parseCues:parseCues,cueText:cueText,create:create};
}));
