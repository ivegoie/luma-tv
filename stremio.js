/* Stremio account protocol: fixed official endpoints; no password collection. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./vendor/pako-2.1.0.min.js'));
  else root.LumaStremio=factory(root.LumaCore,root.pako,function(){return root.LumaRuntime.load('compression');});
}(typeof self!=='undefined'?self:this,function(C,pako,loadCodec){
  'use strict';
  var codecPromise=null;
  function ready(){if(pako)return Promise.resolve();if(codecPromise)return codecPromise;if(!loadCodec)return Promise.reject(new Error('Stremio zapis epizoda nije dostupan.'));codecPromise=loadCodec().then(function(codec){pako=codec;},function(error){codecPromise=null;throw error;});return codecPromise;}
  var API='https://api.strem.io/api/',LINK='https://link.stremio.com/api/v2/';
  function copy(x){return JSON.parse(JSON.stringify(x));}
  function stamp(x){var n=typeof x==='number'?x:Date.parse(x||'');return isFinite(n)?n:0;}
  function amount(x){return typeof x==='number'&&isFinite(x)&&x>=0?Math.round(x):0;}
  function err(message,code){var e=new Error(message);e.code=code;return e;}
  function request(method,url,body){return new Promise(function(resolve,reject){
    var x=new XMLHttpRequest();x.open(method,url,true);x.timeout=15000;
    if(body)x.setRequestHeader('Content-Type','application/json');
    x.onload=function(){if(x.status<200||x.status>=300){reject(err('Stremio nije dostupan (HTTP '+x.status+').',x.status));return;}
      if(x.responseText.length>16*1024*1024){reject(err('Stremio odgovor je prevelik.'));return;}
      try{resolve(JSON.parse(x.responseText));}catch(_){reject(err('Stremio nije vratio čitljiv odgovor.'));}};
    x.onerror=function(){reject(err('Veza sa Stremiom nije dostupna. Provjeri internet i pokušaj ponovno.'));};
    x.ontimeout=function(){reject(err('Stremio nije odgovorio. Pokušaj ponovno.'));};x.send(body?JSON.stringify(body):null);
  });}
  function result(data){if(data&&data.error)throw err('Stremio nije prihvatio zahtjev (kod '+data.error.code+').',data.error.code);
    if(!data||!Object.prototype.hasOwnProperty.call(data,'result'))throw err('Nepotpun Stremio odgovor.');return data.result;}
  function episodeIds(meta){return (meta.videos||[]).slice().sort(function(a,b){return (a.season==null?-1:a.season)-(b.season==null?-1:b.season)||(a.episode==null?-1:a.episode)-(b.episode==null?-1:b.episode)||stamp(a.released)-stamp(b.released);}).map(function(v){return v.id;});}
  function unpackWatched(value,ids){
    if(!value)return ids.map(function(){return false;});
    var parts=value.split(':'),encoded=parts.pop(),length=Number(parts.pop()),anchor=parts.join(':'),index=ids.indexOf(anchor);
    if(index<0||!Number.isInteger(length)||length<1||encoded.length>20000)throw err('Neprepoznat zapis odgledanih epizoda.');
    var binary=typeof atob==='function'?atob(encoded):Buffer.from(encoded,'base64').toString('binary');
    var bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    // Bound decompression before collecting output from an account-controlled field.
    var inflate=new pako.Inflate({chunkSize:1024}),chunks=[],size=0;
    inflate.onData=function(chunk){size+=chunk.length;if(size>65536)throw err('Prevelik zapis odgledanih epizoda.');chunks.push(chunk);};
    inflate.push(bytes,true);if(inflate.err)throw err('Nečitljiv zapis odgledanih epizoda.');
    var raw=new Uint8Array(size),cursor=0;chunks.forEach(function(c){raw.set(c,cursor);cursor+=c.length;});
    var offset=length-index-1;
    return ids.map(function(_,i){var old=i+offset;return old>=0&&old<raw.length*8&&!!(raw[Math.floor(old/8)]&(1<<(old%8)));});
  }
  function packWatched(bits,ids){var bytes=new Uint8Array(Math.ceil(ids.length/8)),last=0;
    bits.forEach(function(bit,i){if(bit){bytes[Math.floor(i/8)]|=1<<(i%8);last=i;}});
    var compressed=pako.deflate(bytes,{level:6}),binary='';for(var i=0;i<compressed.length;i++)binary+=String.fromCharCode(compressed[i]);
    return (ids[last]||'undefined')+':'+(last+1)+':'+(typeof btoa==='function'?btoa(binary):Buffer.from(binary,'binary').toString('base64'));
  }
  function safeId(id){return typeof id==='string'&&id.length>0&&['__proto__','constructor','prototype'].indexOf(id)<0;}
  function validItem(x){return x&&safeId(x._id)&&typeof x.type==='string'&&typeof x.name==='string'&&x.state&&typeof x.state==='object'&&!Array.isArray(x.state);}
  function blank(meta,at){var date=new Date(at).toISOString();return {_id:meta.id,name:meta.name,type:meta.type,poster:meta.poster||null,posterShape:meta.posterShape||'poster',removed:true,temp:true,_ctime:date,_mtime:date,behaviorHints:copy(meta.behaviorHints||{}),state:{lastWatched:null,timeWatched:0,timeOffset:0,overallTimeWatched:0,timesWatched:0,flaggedWatched:0,duration:0,video_id:null,watched:null,noNotif:false}};}
  function mergeItem(remote,edit){
    var item=validItem(remote)?copy(remote):blank(edit.meta,edit.at),state=item.state,changed=!validItem(remote);
    if(edit.bookmark&&edit.bookmark.at>=stamp(item._mtime)){item.removed=!edit.bookmark.value;item.temp=false;changed=true;}
    var p=edit.progress;
    if(p&&p.at>stamp(state.lastWatched)){
      var same=state.video_id===p.videoId,flagged=same?amount(state.flaggedWatched):0;
      state.video_id=p.videoId;state.timeOffset=p.finished?0:amount(p.time*1000);state.duration=amount(p.duration*1000);
      state.timeWatched=Math.max(same?amount(state.timeWatched):0,amount(p.timeWatched*1000));
      state.overallTimeWatched=Math.max(amount(state.overallTimeWatched),amount(p.overallTimeWatched*1000));
      state.flaggedWatched=flagged;state.lastWatched=new Date(p.at).toISOString();
      if(state.duration>0&&state.timeWatched>state.duration*.7){
        if(!flagged){state.timesWatched=amount(state.timesWatched)+1;state.flaggedWatched=1;}
        var ids=episodeIds(edit.meta),idx=ids.indexOf(p.videoId);
        if(idx>=0){try{var bits=unpackWatched(state.watched,ids);bits[idx]=true;state.watched=packWatched(bits,ids);}catch(_){/* Keep unfamiliar remote watched data intact. */}}
      }
      if(p.finished&&p.nextId){state.video_id=p.nextId;state.timeOffset=1;state.duration=0;state.timeWatched=0;state.flaggedWatched=0;}
      if(item.removed)item.temp=true;changed=true;
    }
    if(changed)item._mtime=new Date(Math.max(stamp(item._mtime),edit.at)).toISOString();
    return item;
  }
  function addonList(descriptors){var urls=[],unsupported=[];
    descriptors.forEach(function(d){try{var url=C.manifestURL(d.transportUrl);if(urls.indexOf(url)<0)urls.push(url);}catch(_){unsupported.push(String(d.manifest&&d.manifest.name||'Dodatak'));}});
    return {urls:urls,unsupported:unsupported};
  }
  function views(items){var saved=[],history={};Object.keys(items).forEach(function(id){var item=items[id];if(!validItem(item))return;
    var meta=C.cleanMeta({id:item._id,type:item.type,name:item.name,poster:item.poster,posterShape:item.posterShape,behaviorHints:item.behaviorHints});if(!meta)return;
    if(!item.removed&&!item.temp)saved.push({meta:meta,at:stamp(item._ctime)||stamp(item._mtime)});
    var s=item.state,vid=s.video_id||(item.type==='series'?null:item._id);
    if(vid&&(!item.removed||item.temp)&&amount(s.timeOffset)>0)history[item.type+':'+vid]={meta:meta,videoId:vid,time:amount(s.timeOffset)/1000,duration:amount(s.duration)/1000,at:stamp(s.lastWatched)||stamp(item._mtime),cloud:true};
  });return {bookmarks:saved.sort(function(a,b){return b.at-a.at;}).map(function(x){return x.meta;}),history:history};}
  function createClient(options){
    options=options||{};var store=options.store||C.storageAdapter(null),send=options.request||request,clock=options.now||Date.now,notify=options.onChange||function(){};
    var session=store.read('stremio-session',null),cache=store.read('stremio-cache',null),epoch=0,serial=Promise.resolve(),syncing=null,flushing=null,lastTime=0;
    if(!session||typeof session.authKey!=='string'||!session.user||typeof session.user.id!=='string')session=null;
    var data=session&&cache&&cache.userId===session.user.id?cache:{userId:session?session.user.id:null,addons:[],items:{},pending:{},lastSync:0};
    if(!Array.isArray(data.addons))data.addons=[];if(!data.items||typeof data.items!=='object')data.items={};if(!data.pending||typeof data.pending!=='object')data.pending={};
    var error='';
    function time(){lastTime=Math.max(clock(),lastTime+1);return lastTime;}
    function persist(){if(session&&session.remember){store.write('stremio-session',session);store.write('stremio-cache',data);}}
    function status(){var list=addonList(data.addons);return {connected:!!session,persistent:!!(session&&session.remember),user:session?copy(session.user):null,syncing:!!syncing,pending:Object.keys(data.pending).length,lastSync:data.lastSync||0,error:error,addonCount:data.addons.length,unsupported:list.unsupported};}
    function afterCodec(work){var version=epoch;return ready().then(function(){if(version!==epoch)throw err('Račun je promijenjen.');return work();});}
    function emit(kind){notify(kind,status());}
    function ticket(){if(!session)throw err('Prijavi se u Stremio.');return {epoch:epoch,key:session.authKey};}
    function assert(t){if(t.epoch!==epoch||!session||t.key!==session.authKey)throw err('Prijava se promijenila.');}
    function post(path,body,t){assert(t);return send('POST',API+path,Object.assign({},body,{authKey:t.key})).then(result).then(function(r){assert(t);return r;});}
    function queue(fn){var p=serial.then(fn);serial=p.catch(function(){});return p;}
    function effective(){var items=copy(data.items);Object.keys(data.pending).forEach(function(id){items[id]=mergeItem(items[id],data.pending[id]);});return items;}
    function getViews(){return views(effective());}
    function watched(){var items=effective(),out=[];Object.keys(items).forEach(function(id){var item=items[id];if(!validItem(item)||item.removed&&!item.temp)return;var s=item.state,at=stamp(s.lastWatched);if(!at&&!amount(s.timeWatched)&&!amount(s.overallTimeWatched)&&!amount(s.timesWatched))return;var meta=C.cleanMeta({id:item._id,type:item.type,name:item.name,poster:item.poster,posterShape:item.posterShape,behaviorHints:item.behaviorHints});if(meta)out.push({meta:meta,at:at||stamp(item._mtime)});});return out.sort(function(a,b){return b.at-a.at;}).slice(0,40);}
    function getItem(id){var edit=data.pending[id],item=data.items[id];return edit?mergeItem(item,edit):item?copy(item):null;}
    function flushInside(t){var edits=copy(data.pending),ids=Object.keys(edits);if(!ids.length)return Promise.resolve();
      var chain=Promise.resolve();for(var start=0;start<ids.length;start+=100)(function(batch){chain=chain.then(function(){return post('datastoreGet',{collection:'libraryItem',ids:batch,all:false},t);}).then(function(remote){
        if(!Array.isArray(remote)||remote.some(function(x){return !validItem(x);}))throw err('Biblioteka nije vraćena u očekivanom obliku. Ništa nije prepisano.');
        var map=Object.create(null);remote.forEach(function(x){map[x._id]=x;});var changes=batch.map(function(id){return mergeItem(map[id],edits[id]);});
        return post('datastorePut',{collection:'libraryItem',changes:changes},t).then(function(ok){if(!ok||ok.success!==true)throw err('Stremio nije potvrdio spremanje.');
          changes.forEach(function(item){data.items[item._id]=item;if(JSON.stringify(data.pending[item._id])===JSON.stringify(edits[item._id]))delete data.pending[item._id];});persist();});
      });}(ids.slice(start,start+100)));return chain;
    }
    function flush(){if(!session)return Promise.resolve();if(!pako)return afterCodec(flush);if(flushing)return flushing;var t=ticket();
      flushing=queue(function(){return flushInside(t);}).then(function(){if(t.epoch===epoch){error='';emit('saved');}},function(e){if(t.epoch===epoch){error=e.message;emit('error');}throw e;}).then(function(){if(t.epoch===epoch)flushing=null;},function(e){if(t.epoch===epoch)flushing=null;throw e;});return flushing;
    }
    function sync(){if(!session)return Promise.resolve();if(!pako)return afterCodec(sync);if(syncing)return syncing;var t=ticket();
      syncing=queue(function(){return flushInside(t).then(function(){return Promise.all([post('addonCollectionGet',{type:'AddonCollectionGet',update:true},t),post('datastoreMeta',{collection:'libraryItem'},t)]);}).then(function(res){
        var addons=res[0],meta=res[1];if(!addons||!Array.isArray(addons.addons)||!Array.isArray(meta))throw err('Sinkronizacija nije vratila potpun odgovor.');
        data.addons=addons.addons;var present=Object.create(null),ids=[];
        meta.forEach(function(pair){if(!Array.isArray(pair)||!safeId(pair[0])||!isFinite(Number(pair[1])))throw err('Neprepoznat popis biblioteke.');present[pair[0]]=true;var local=data.items[pair[0]];if(!local||stamp(local._mtime)<Number(pair[1]))ids.push(pair[0]);});
        var pulled=copy(data.items),chain=Promise.resolve();for(var start=0;start<ids.length;start+=100)(function(batch){chain=chain.then(function(){return post('datastoreGet',{collection:'libraryItem',ids:batch,all:false},t);}).then(function(items){if(!Array.isArray(items))throw err('Biblioteka nije dostupna.');items.forEach(function(x){if(validItem(x))pulled[x._id]=x;});});}(ids.slice(start,start+100)));
        return chain.then(function(){assert(t);Object.keys(pulled).forEach(function(id){if(!present[id]&&!data.pending[id])delete pulled[id];});data.items=pulled;data.lastSync=clock();error='';persist();});
      });}).then(function(){if(t.epoch===epoch){syncing=null;emit('synced');}},function(e){if(t.epoch===epoch){syncing=null;error=e.message;emit('error');}throw e;});emit('syncing');return syncing;
    }
    function connect(authKey,remember,stillValid){
      if(typeof authKey!=='string'||!authKey||authKey.length>4096)return Promise.reject(err('Stremio nije vratio valjanu prijavu.'));
      if(!pako)return afterCodec(function(){if(stillValid&&!stillValid())throw err('Prijava je otkazana.');return connect(authKey,remember,stillValid);});
      var start=epoch;return send('POST',API+'getUser',{type:'GetUser',authKey:authKey}).then(result).then(function(user){
        if(start!==epoch||stillValid&&!stillValid())throw err('Prijava je otkazana.');if(!user||typeof user._id!=='string')throw err('Stremio nije potvrdio račun.');
        epoch++;session={authKey:authKey,user:{id:user._id,email:String(user.email||'Stremio račun')},remember:remember!==false};
        var saved=store.read('stremio-cache',null);data=saved&&saved.userId===user._id?saved:{userId:user._id,addons:[],items:{},pending:{},lastSync:0};
        store.write('stremio-session',null);store.write('stremio-cache',null);error='';persist();emit('connected');return sync();
      });
    }
    function disconnect(){epoch++;session=null;syncing=null;flushing=null;data={userId:null,addons:[],items:{},pending:{},lastSync:0};error='';store.write('stremio-session',null);store.write('stremio-cache',null);emit('disconnected');}
    function edit(meta,part){if(!session||!safeId(meta.id)||meta._sample||meta.id==='custom-direct')return;var at=time(),prev=data.pending[meta.id]||{meta:copy(meta)};
      var next=Object.assign({},prev,{meta:copy(meta),at:at});if(part.bookmark!==undefined)next.bookmark={value:part.bookmark,at:at};
      if(part.progress)next.progress=Object.assign({},part.progress,{at:at});data.pending[meta.id]=next;persist();emit('local');}
    function setBookmark(meta,value){edit(meta,{bookmark:!!value});return flush();}
    function recordProgress(meta,videoId,progress){edit(meta,{progress:Object.assign({},progress,{videoId:videoId})});}
    function changeAddon(url,manifest,remove){var t=ticket();return queue(function(){return post('addonCollectionGet',{type:'AddonCollectionGet',update:true},t).then(function(res){
      if(!res||!Array.isArray(res.addons))throw err('Popis dodataka nije dostupan. Ništa nije promijenjeno.');
      var list=res.addons,index=list.findIndex(function(d){return d.transportUrl===url;});
      if(remove){if(index>=0&&list[index].flags&&list[index].flags.protected)throw err('Ovaj službeni dodatak zaštićen je od uklanjanja.');list=list.filter(function(d){return d.transportUrl!==url;});}
      else if(index<0)list.push({transportUrl:url,manifest:C.validateManifest(manifest),flags:{}});
      return post('addonCollectionSet',{type:'AddonCollectionSet',addons:list},t).then(function(ok){if(!ok||ok.success!==true)throw err('Stremio nije potvrdio promjenu dodataka.');data.addons=list;persist();emit('addons');});
    });});}
    function createLink(){return send('GET',LINK+'create?type=Create').then(result).then(function(r){
      var u;try{u=new URL(r.link);}catch(_){throw err('Stremio nije vratio poveznicu za prijavu.');}
      if(typeof r.code!=='string'||!/^[a-z0-9]{4,16}$/i.test(r.code)||u.origin!=='https://link.stremio.com')throw err('Neprepoznata Stremio poveznica.');
      var qr='';try{var q=new URL(r.qrcode);if(q.origin==='https://link.stremio.com')qr=q.href;}catch(_){}
      return {code:r.code,link:u.href,qrcode:qr};
    });}
    function readLink(code){if(!/^[a-z0-9]{4,16}$/i.test(code))return Promise.reject(err('Nevaljan kod.'));
      return send('GET',LINK+'read?type=Read&code='+encodeURIComponent(code)).then(function(r){
        // The live v2 service returns 101 for a newly created, not-yet-linked code too.
        // It is not proof of expiry; the UI bounds polling with its own timeout.
        if(r&&r.error){if(r.error.code===101)return null;throw err('Stremio povezivanje nije dostupno (kod '+r.error.code+').',r.error.code);}
        var v=result(r);return v&&typeof v.authKey==='string'?v.authKey:null;
      });}
    return {status:status,connect:connect,disconnect:disconnect,sync:sync,flush:flush,views:getViews,watched:watched,item:getItem,addons:function(){return addonList(data.addons);},descriptors:function(){return copy(data.addons);},setBookmark:setBookmark,recordProgress:recordProgress,changeAddon:changeAddon,createLink:createLink,readLink:readLink};
  }
  return {ready:ready,codecReady:function(){return !!pako;},createClient:createClient,mergeItem:mergeItem,views:views,addonList:addonList,unpackWatched:unpackWatched,packWatched:packWatched,episodeIds:episodeIds};
}));
