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
  function rank(entries,options){options=options||{};var max=options.maxQuality||2160,support=Object.create(null);function canPlay(type){if(!options.canPlay)return true;if(!(type in support)){var value;try{value=options.canPlay(type);}catch(_){value='';}support[type]=value===true||value==='probably'||value==='maybe';}return support[type];}
    function cost(entry){var text=[entry.stream.name,entry.stream.title,entry.stream.description,entry.stream.behaviorHints&&entry.stream.behaviorHints.filename].join(' '),cost=entry.plan.kind==='torrent'?100:0,codecs=audioCodecs(entry.stream);if(entry.stream.behaviorHints&&entry.stream.behaviorHints.notWebReady)cost+=8;
      if(codecs.length&&options.canPlay&&!codecs.some(function(codec){return canPlay('audio/mp4; codecs="'+codec+'"')||(codec==='opus'&&canPlay('audio/webm; codecs="opus"'))||(codec==='flac'&&canPlay('audio/flac'));}))cost+=30;
      if(/\b(?:hevc|h[ ._-]?265|x265)\b/i.test(text)&&!canPlay('video/mp4; codecs="hvc1.1.6.L153.B0"'))cost+=4;
      if(/\bav1\b/i.test(text)&&!canPlay('video/mp4; codecs="av01.0.08M.08"'))cost+=4;
      if(/\b(?:dv|dolby[ ._-]?vision|truehd|dts[ ._-]?hd)\b/i.test(text))cost+=2;return cost;}
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
  return {create:create,rank:rank,quality:quality,audioCodecs:audioCodecs,nextEpisode:nextEpisode};
}));
