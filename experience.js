/* Device preferences are isolated by Stremio account. Stream URLs are never persisted. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.LumaExperience=factory(root.LumaCore);}(typeof window!=='undefined'?window:this,function(C){
  'use strict';
  function quality(stream){var text=[stream.name,stream.description,stream.title,stream.behaviorHints&&stream.behaviorHints.filename].join(' ').slice(0,4000);if(/4320|\b8k\b/i.test(text))return 4320;if(/2160|\b4k\b|\buhd\b/i.test(text))return 2160;if(/1080/i.test(text))return 1080;if(/720/i.test(text))return 720;if(/480/i.test(text))return 480;return 0;}
  // Release labels are hints, not proof of the tracks inside the file. Never block manual selection.
  function audioCodecs(stream){var text=[stream.name,stream.title,stream.description,stream.behaviorHints&&stream.behaviorHints.filename].join(' ').slice(0,4000),out=[];
    if(/\b(?:true[ ._-]?hd|mlpa)\b/i.test(text))out.push('mlpa');
    if(/\bdts(?:[ ._-]?(?:hd|ma|x))?\b/i.test(text))out.push(/\bdts[ ._-]?hd\b/i.test(text)?'dtsl':'dtsc');
    if(/\b(?:e[ ._-]?ac[ ._-]?3|ddp)(?=\W|\d|$)|\bdd\+|\bdolby[ ._-]?digital[ ._-]?plus\b/i.test(text))out.push('ec-3');
    else if(/\b(?:ac[ ._-]?3|dd)(?=\W|\d|$)|\bdolby[ ._-]?digital\b/i.test(text))out.push('ac-3');
    if(/\b(?:he[ ._-]?)?aac(?=\W|\d|$)|\bmp4a\.40\./i.test(text))out.push(/\bhe[ ._-]?aac\b/i.test(text)?'mp4a.40.5':'mp4a.40.2');
    if(/\bopus\b/i.test(text))out.push('opus');if(/\bflac\b/i.test(text))out.push('flac');return out;}
  function language(value){
    var v=String(value||'').toLowerCase().trim().replace(/_/g,'-'),aliases={eng:'en',english:'en',hrv:'hr',cro:'hr',croatian:'hr',hrvatski:'hr',rus:'ru',russian:'ru',jpn:'ja',japanese:'ja',kor:'ko',korean:'ko',fre:'fr',fra:'fr',french:'fr',ger:'de',deu:'de',german:'de',spa:'es',spanish:'es',ita:'it',italian:'it',por:'pt',portuguese:'pt',hin:'hi',hindi:'hi',chi:'zh',zho:'zh',chinese:'zh',ara:'ar',arabic:'ar',tur:'tr',turkish:'tr',pol:'pl',polish:'pl',ukr:'uk',ukrainian:'uk',swe:'sv',swedish:'sv',dan:'da',danish:'da',nor:'no',norwegian:'no',dut:'nl',nld:'nl',dutch:'nl',tha:'th',thai:'th',ind:'id',indonesian:'id'};
    v=v.split(/[,;/]/)[0].trim();return aliases[v]||(/^[a-z]{2}(?:-[a-z]{2})?$/.test(v)?v.slice(0,2):'');
  }
  function originalLanguage(meta){return language(meta&&(meta.originalLanguage||meta.original_language||meta.language));}
  function streamText(stream){return [stream.name,stream.title,stream.description,stream.behaviorHints&&stream.behaviorHints.filename].join('\n').slice(0,6000);}
  function audioLanguages(stream){
    var out=[],h=stream.behaviorHints||{};function add(value){var l=language(value);if(l&&out.indexOf(l)<0)out.push(l);}
    [].concat(stream.audioLanguages||[],stream.language||[],h.audioLanguages||[]).slice(0,20).forEach(add);
    var text=streamText(stream).split('\n').filter(function(line){return !/\b(?:subtitles?|subs|titlovi)\s*[:：]|💬/i.test(line);}).join('\n');
    var hints={en:/\b(?:ENG|English)\b|🇬🇧|🇺🇸/i,ru:/\b(?:RUS|Russian)\b|🇷🇺|русский|русская|русское/i,ja:/\b(?:JPN|Japanese)\b|🇯🇵/i,ko:/\b(?:KOR|Korean)\b|🇰🇷/i,fr:/\b(?:FRE|FRA|French)\b|🇫🇷/i,de:/\b(?:GER|DEU|German)\b|🇩🇪/i,es:/\b(?:SPA|Spanish|Castellano|Latino)\b|🇪🇸/i,it:/\b(?:ITA|Italian)\b|🇮🇹/i,pt:/\b(?:POR|Portuguese|Dublado)\b|🇵🇹|🇧🇷/i,hi:/\b(?:HIN|Hindi)\b|🇮🇳/i,zh:/\b(?:CHI|ZHO|Chinese|Mandarin)\b|🇨🇳/i,hr:/\b(?:HRV|Croatian|Hrvatski)\b|🇭🇷/i,pl:/\b(?:POL|Polish)\b|🇵🇱/i,tr:/\b(?:TUR|Turkish)\b|🇹🇷/i,uk:/\b(?:UKR|Ukrainian)\b|🇺🇦/i};
    Object.keys(hints).forEach(function(l){if(hints[l].test(text))add(l);});
    var tokens=text.match(/(?:^|[.\[\](+ /_-])(?:EN|RU|JA|KO|FR|DE|ES|IT|PT|HI|ZH|HR|PL|TR|UK)(?=$|[.\[\]) +/_-])/g)||[];tokens.forEach(function(token){add(token.replace(/[^A-Z]/g,''));});return out;
  }
  function sourceIssue(stream,options){
    options=options||{};var text=streamText(stream),langs=audioLanguages(stream),wanted=options.audioLanguage==='en'?'en':originalLanguage(options.meta),original=/\b(?:original[ ._-]?audio|original|orig|OV)\b/i.test(text),dubbed=/\b(?:dubbed|dubbing|dub|dublado|MVO|DVO|AVO)\b|дубляж|дублирован|озвуч/i.test(text);
    if(/\b(?:HDCAM|CAMRIP|TELESYNC|HDTS|TSRIP|SCREENER|DVDSCR)\b/i.test(text))return 'Snimka iz kina';
    if(wanted&&langs.length&&langs.indexOf(wanted)<0&&!original)return 'Drugi jezik zvuka';
    if(!wanted&&dubbed&&!original)return 'Sinkronizirani zvuk';return '';
  }
  function sizeBytes(stream){var n=Number(stream.behaviorHints&&stream.behaviorHints.videoSize);if(isFinite(n)&&n>0)return n;var m=/(\d+(?:[.,]\d+)?)\s*(GiB|GB|MiB|MB)\b/i.exec(streamText(stream));return m?Number(m[1].replace(',','.'))*Math.pow(1024,/^G/i.test(m[2])?3:2):0;}
  function runtimeSeconds(meta){var text=String(meta&&meta.runtime||''),hours=/(\d+(?:[.,]\d+)?)\s*(?:h|sati?)/i.exec(text),mins=/(\d+(?:[.,]\d+)?)\s*(?:m|min|minute?)/i.exec(text);if(hours||mins)return (hours?Number(hours[1].replace(',','.'))*3600:0)+(mins?Number(mins[1].replace(',','.'))*60:0);return 0;}
  function networkCost(stream,options){if(!options.lowData)return 0;var size=sizeBytes(stream),seconds=runtimeSeconds(options.meta);if(!size)return 2;var mbps=seconds?size*8/seconds/1000000:0,budget=options.downlink>0?Math.max(.4,options.downlink*.65):3;return mbps?Math.min(30,mbps/budget*5):Math.min(30,size/(1024*1024*1024)*3);}
  function selectAudio(tracks,meta,preference){var wanted=preference==='en'?'en':originalLanguage(meta),best=-1;for(var i=0;i<tracks.length;i++){var t=tracks[i],label=t.label||t.name||'',lang=language(t.language||t.lang)||language(label)||audioLanguages({name:label})[0];if(wanted&&lang===wanted&&!/description|commentary|audio ?description/i.test(label))return i;if(best<0&&/\b(original|orig)\b/i.test(label))best=i;}if(best>=0)return best;for(var j=0;j<tracks.length;j++)if(tracks[j].enabled)return j;return tracks.length?0:-1;}
  function rank(entries,options){options=options||{};var max=options.maxQuality||2160,support=Object.create(null),costs=new WeakMap();function canPlay(type){if(!options.canPlay)return true;if(!(type in support)){var value;try{value=options.canPlay(type);}catch(_){value='';}support[type]=value===true||value==='probably'||value==='maybe';}return support[type];}
    function cost(entry){if(costs.has(entry))return costs.get(entry);var text=streamText(entry.stream),cost=entry.plan.kind==='torrent'?100:0,codecs=audioCodecs(entry.stream);if(entry.stream.behaviorHints&&entry.stream.behaviorHints.notWebReady)cost+=8;
      if(sourceIssue(entry.stream,options))cost+=500;
      if(codecs.length&&options.canPlay&&!codecs.some(function(codec){return canPlay('audio/mp4; codecs="'+codec+'"')||(codec==='opus'&&canPlay('audio/webm; codecs="opus"'))||(codec==='flac'&&canPlay('audio/flac'));}))cost+=60;
      if(/\b(?:hevc|h[ ._-]?265|x265)\b/i.test(text)&&!canPlay('video/mp4; codecs="hvc1.1.6.L153.B0"'))cost+=40;
      if(/\bav1\b/i.test(text)&&!canPlay('video/mp4; codecs="av01.0.08M.08"'))cost+=40;
      if(/\b(?:dv|dolby[ ._-]?vision|truehd|dts[ ._-]?hd)\b/i.test(text))cost+=2;
      if(options.tv&&options.compatibility!==false){if(!codecs.length)cost+=3;if(codecs.length&&!codecs.some(function(c){return /^mp4a/.test(c);}))cost+=6;if(/\b(?:remux|bdremux)\b/i.test(text))cost+=12;var size=sizeBytes(entry.stream);if(size>25*1024*1024*1024)cost+=10;else if(size>12*1024*1024*1024)cost+=3;}
      cost+=networkCost(entry.stream,options);costs.set(entry,cost);return cost;}
    return entries.filter(function(e){return e&&e.plan&&!e.plan.error&&quality(e.stream)<=max;}).slice().sort(function(a,b){return cost(a)-cost(b)||quality(b.stream)-quality(a.stream)||Number(b.addon===options.preferredAddon)-Number(a.addon===options.preferredAddon)||a.order-b.order;});
  }
  function nextEpisode(meta,id){if(meta.type!=='series')return null;var list=(meta.videos||[]).filter(function(e){return Number(e.season)>0&&Number(e.episode)>0;}).slice().sort(function(a,b){return Number(a.season)-Number(b.season)||Number(a.episode)-Number(b.episode);}),index=list.findIndex(function(e){return e.id===id;});if(index<0)return null;for(var i=index+1;i<list.length;i++){var e=list[i];if(e.available===false||e.released&&isFinite(Date.parse(e.released))&&Date.parse(e.released)>Date.now())return null;return e;}return null;}
  function create(options){var scope='',data=null;function read(){var current=String(options.scope());if(scope!==current||!data){scope=current;data=options.store.read('experience:'+scope,{});if(!data||typeof data!=='object'||Array.isArray(data))data={};if(!Array.isArray(data.order))data.order=[];if(!Array.isArray(data.hidden))data.hidden=[];if(!data.ratings||typeof data.ratings!=='object'||Array.isArray(data.ratings))data.ratings={};if(!data.labels||typeof data.labels!=='object')data.labels={};}return data;}function save(){options.store.write('experience:'+scope,data);}
    function opinions(){return read().ratings;}
    function rating(meta){var v=opinions()[C.key(meta)];return v&&v.value===1?1:v&&v.value===-1?-1:0;}
    function rate(meta,value){var d=read(),key=C.key(meta);if(rating(meta)===value)value=0;if(!value)delete d.ratings[key];else d.ratings[key]={value:value,at:Date.now(),meta:{id:meta.id,type:meta.type,name:meta.name,genres:(meta.genres||[]).slice(0,5),poster:meta.poster||'',background:meta.background||''}};var keys=Object.keys(d.ratings).sort(function(a,b){return d.ratings[b].at-d.ratings[a].at;});keys.slice(300).forEach(function(k){delete d.ratings[k];});save();return value;}
    function arrange(specs,includeHidden){var d=read();specs.forEach(function(s){d.labels[s.id]=s.title;});return specs.slice().sort(function(a,b){var ai=d.order.indexOf(a.id),bi=d.order.indexOf(b.id);return (ai<0?10000+specs.indexOf(a):ai)-(bi<0?10000+specs.indexOf(b):bi);}).filter(function(s){return includeHidden||d.hidden.indexOf(s.id)<0;});}
    return {opinions:opinions,rating:rating,rate:rate,arrange:arrange,hidden:function(id){return read().hidden.indexOf(id)>=0;},toggleRow:function(id){var d=read(),i=d.hidden.indexOf(id);if(i<0)d.hidden.push(id);else d.hidden.splice(i,1);save();},moveRow:function(id,delta,ids){var d=read(),order=ids.slice(),i=order.indexOf(id),j=i+delta;if(i<0||j<0||j>=order.length)return;order.splice(i,1);order.splice(j,0,id);d.order=order;save();},resetRows:function(){var d=read();d.order=[];d.hidden=[];save();},preferredAddon:function(){return String(read().preferredAddon||'');},rememberAddon:function(name){read().preferredAddon=String(name||'').slice(0,200);save();}};
  }
  return {create:create,rank:rank,quality:quality,audioCodecs:audioCodecs,language:language,originalLanguage:originalLanguage,audioLanguages:audioLanguages,sourceIssue:sourceIssue,selectAudio:selectAudio,sizeBytes:sizeBytes,networkCost:networkCost,runtimeSeconds:runtimeSeconds,nextEpisode:nextEpisode};
}));
