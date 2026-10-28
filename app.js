(function () {
  'use strict';
  var C = window.LumaCore, T = window.LumaTrailers, M = window.LumaMotion, R = window.LumaRecommendations, E = window.LumaExperience, app = document.getElementById('app'), overlay = document.getElementById('overlay');
  var local; try { local = window.localStorage; } catch (_) { local = null; }
  var store = C.storageAdapter(local);
  var config = store.read('settings', {addons:[C.DEFAULT_ADDON],server:'',torrents:false});
  if(!config||typeof config!=='object'||Array.isArray(config))config={addons:[C.DEFAULT_ADDON],server:'',torrents:false};
  config.autoTrailers=config.autoTrailers!==false;
  config.subtitleLanguage=config.subtitleLanguage==='off'?'off':'hr';
  config.oneClick=config.oneClick!==false;config.autoNext=config.autoNext!==false;config.nextDelay=[5,10,15].indexOf(Number(config.nextDelay))>=0?Number(config.nextDelay):15;config.maxQuality=[720,1080,2160].indexOf(Number(config.maxQuality))>=0?Number(config.maxQuality):2160;config.introDB=config.introDB!==false;
  config.server=typeof config.server==='string'?config.server:'';config.torrents=config.torrents===true;
  if (!Array.isArray(config.addons)) config.addons = [C.DEFAULT_ADDON];
  config.addons = config.addons.slice(0,12).filter(function(u){try{C.manifestURL(u);return true;}catch(_){return false;}});
  var bookmarks = C.uniqueMetas(store.read('bookmarks',[])).slice(0,150);
  var history = store.read('history',{}); if(!history || typeof history!=='object' || Array.isArray(history))history={};
  var state = {page:'home',addons:[],rows:[],errors:[],hero:null,ready:false,generation:0,searchGeneration:0,query:'',layers:[],player:null};
  var cardTrailer=null,cardTrailerKey='',cardTrailerBlocked=false,focusedCard=null,focusedCardMeta=null;
  var heroTrailer=null,heroTrailerKey='',heroTrailerBlocked=false;
  var recommendations=R.create({store:store}),homeHeroes=Object.create(null),heroEntries={home:true,movie:true,series:true},discoveryRows=[],discoverySignature='',discoveryRun=0,discoveryNamespace='',discoveryPending=false,genreCache=Object.create(null);
  var trailerResolver=T.createResolver({json:json,providers:function(meta){return state.addons.filter(function(a){return C.supports(a.manifest,'meta',meta.type,meta.id);}).sort(function(a,b){return Number(b.url===meta._source)-Number(a.url===meta._source);}).map(function(a){return C.resourceURL(a.url,'meta',meta.type,meta.id);});}});
  var trailerScheduler=T.createScheduler({delay:2000,resolve:trailerResolver.resolve,allowed:trailerAllowed,start:startCardTrailer,empty:function(){}});
  var heroTrailerScheduler=T.createScheduler({delay:2000,resolve:trailerResolver.resolve,allowed:heroTrailerAllowed,start:startHeroTrailer,empty:function(){},skipped:function(meta){if(heroTrailerKey===C.key(meta))heroTrailerKey='';}});
  var sample = C.cleanMeta({id:'luma:sample',type:'movie',name:'Provjera slike i zvuka',description:'Kratki test boja, pokreta i tihog zvučnog signala. Provjeri radi li player na tvom televizoru. Ovaj video dolazi uz aplikaciju i ne treba Stremio server.',runtime:'20 sekundi',genres:['Test playera'],background:new URL('assets/calibration.png',location.href).href,_sample:true},'builtin');
  var sampleStream = {name:'LUMA · probni video',description:'MP4 · H.264 Baseline / AAC · 640 × 360 · 20 sekundi',url:new URL('assets/luma-test.mp4',location.href).href};
  var requestQueue=[],inFlight=0,backgroundFlight=0,requestSequence=0,jsonCache=Object.create(null),jsonPending=Object.create(null),cacheBytes=0,shelfObserver=null,shelfObserverRoot=null,toastTimer,heroTimer;
  var activeAddonSignature='',activeViewSignature='',lastCloudPush=0;
  var experience=E.create({store:store,scope:viewerScope}),segments=window.LumaSegments.create({store:store,json:function(url){return json(url,{priority:0});}});
  var account=window.LumaStremio.createClient({store:store,onChange:accountChanged});
  function addonURLs(){return account.status().connected?account.addons().urls:config.addons;}
  function restoreGuest(){bookmarks=C.uniqueMetas(store.read('bookmarks',[])).slice(0,150);history=store.read('history',{});if(!history||typeof history!=='object'||Array.isArray(history))history={};}
  function accountViews(){if(account.status().connected){var view=account.views();bookmarks=view.bookmarks;history=view.history;}}
  function syncLabel(){var s=account.status();if(s.error)return 'Sinkronizacija nije uspjela. '+s.error;if(s.pending)return 'Čeka sinkronizaciju: '+s.pending;return '';}
  function accountChanged(kind){
    if(kind==='disconnected')restoreGuest();else accountViews();
    var status=document.getElementById('account-sync-status');if(status)status.textContent=syncLabel();
    if(kind==='syncing'||kind==='local'||kind==='saved')return;
    var accountState=account.status(),viewSignature=JSON.stringify([bookmarks,history,accountState.connected,accountState.error,accountState.pending]),viewChanged=viewSignature!==activeViewSignature;activeViewSignature=viewSignature;
    var signature=addonURLs().join('\n');if(signature!==activeAddonSignature){activeAddonSignature=signature;loadCatalogs();}
    else if(viewChanged&&!state.layers.length&&!state.player)render();
    if(kind==='error')toast('Stremio sinkronizacija nije dovršena. Promjene čekaju u LUMI.');
  }
  function syncAccount(){return account.sync().catch(function(){});}
  function openAccount(){if(account.status().connected){setPage('settings');return;}openLogin();}
  function openLogin(){
    var layer=pushLayer('account-login','Prijava u Stremio'),generation=0,timer,remember=true,closed=false;
    var wrap=el('div','login-layout'),copy=el('div','login-copy'),panel=el('div','login-code-panel');
    append(copy,el('div','hero-eyebrow','Tvoj Stremio, u LUMI'),el('h1','','Jedan račun.\nTvoja večer.'),el('p','','Poveži Stremio račun za svoje dodatke, Moju listu i nastavak gledanja na svim uređajima.'),el('p','note','Na mobitelu skeniraj QR ili otvori prikazanu Stremio poveznicu i potvrdi prijavu. Lozinku upisuješ samo u Stremiju.'));
    var keep=button('Ostani prijavljen na ovom TV-u: da',function(){remember=!remember;keep.textContent='Ostani prijavljen na ovom TV-u: '+(remember?'da':'ne');keep.setAttribute('aria-pressed',String(remember));},'quiet','remember-account');keep.setAttribute('aria-pressed','true');append(copy,keep,el('p','note','LUMA sprema prijavu na ovom uređaju ako odabereš ostati prijavljen. Dodaci i napredak razmjenjuju se izravno sa Stremiom.'));
    var status=el('p','note','');status.setAttribute('role','status');var codeArea=el('div'),retry=button('Novi kod',begin,'quiet','login-retry');append(panel,codeArea,status,retry);append(wrap,copy,panel);append(layer.body,wrap);
    layer.cleanup=function(){closed=true;generation++;clearTimeout(timer);};
    function begin(){clearTimeout(timer);var run=++generation,started=Date.now();codeArea.textContent='';status.textContent='Dohvaćam kod iz Stremija…';retry.disabled=true;
      account.createLink().then(function(data){if(closed||run!==generation)return;retry.disabled=false;
        if(data.qrcode){var qr=image(data.qrcode,'login-qr','QR za prijavu u Stremio');qr.loading='eager';append(codeArea,qr);}
        append(codeArea,el('p','pair-code',data.code),el('p','pair-link',data.link));status.textContent='Čekam potvrdu u Stremiju…';
        function poll(){if(closed||run!==generation)return;if(Date.now()-started>10*60*1000){status.textContent='Isteklo je vrijeme za povezivanje. Zatraži novi kod.';return;}
          account.readLink(data.code).then(function(key){if(closed||run!==generation)return;if(!key){timer=setTimeout(poll,3000);return;}
            status.textContent='Prijava potvrđena. Preuzimam tvoje dodatke i biblioteku…';retry.disabled=true;
            account.connect(key,remember,function(){return !closed&&run===generation;}).then(function(){if(closed||run!==generation)return;popLayer();render();toast('Stremio račun je povezan.');}).catch(function(e){if(closed||run!==generation)return;retry.disabled=false;status.textContent=e.message;if(account.status().connected){append(panel,button('Nastavi i ponovi sinkronizaciju',function(){popLayer();setPage('settings');syncAccount();},'primary','login-connected'));}});
          }).catch(function(e){if(closed||run!==generation)return;status.textContent=e.message;if(e.code!==101)timer=setTimeout(poll,5000);});
        }timer=setTimeout(poll,2500);
      }).catch(function(e){if(closed||run!==generation)return;retry.disabled=false;status.textContent=e.message;});
    }begin();focus(keep);
  }
  function latestProgress(meta){var entries=Object.keys(history).map(function(k){return history[k];}).filter(function(h){return h&&h.meta&&C.key(h.meta)===C.key(meta)&&h.time>0;});entries.sort(function(a,b){return b.at-a.at;});return entries[0]||null;}
  accountViews();

  function el(tag, cls, text) {var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
  function append(parent) {for(var i=1;i<arguments.length;i++){if(arguments[i])parent.appendChild(arguments[i]);}return parent;}
  function button(label, action, cls, id) {var b=el('button',cls||'',label);b.type='button';if(id)b.dataset.focus=id;if(action)b.addEventListener('click',action);return b;}
  function action(label,symbol,fn,cls,id){var b=button('',fn,cls,id);append(b,el('span','symbol',symbol),el('span','',label));return b;}
  function textBlock(title, text, cls){var n=el('div',cls||'message');if(title)append(n,el('strong','',title),el('br'));if(text)append(n,el('span','',text));return n;}
  function toast(text){clearTimeout(toastTimer);var t=document.getElementById('toast');t.textContent=text;t.className='visible';M.enter(t,{y:10,duration:.22});toastTimer=setTimeout(function(){M.leave(t,function(){t.className='';});},4500);}
  function saveSettings(){store.write('settings',config);warnStorage();}
  function warnStorage(){if(!store.available())toast('TV ne dopušta trajno spremanje. Promjene vrijede samo do zatvaranja aplikacije.');}
  function rawJSON(url) {
    return new Promise(function(resolve,reject){
      var x=new XMLHttpRequest();x.open('GET',url,true);x.timeout=14000;
      x.onload=function(){if(x.status<200||x.status>=300){reject(new Error('Poslužitelj je vratio HTTP '+x.status+'.'));return;}if(x.responseText.length>8*1024*1024){reject(new Error('Odgovor dodatka je prevelik.'));return;}try{resolve(JSON.parse(x.responseText));}catch(_){reject(new Error('Poslužitelj nije vratio čitljiv JSON.'));}};
      x.onerror=function(){reject(new Error('Veza nije dostupna. Provjeri adresu, HTTPS certifikat i CORS pristup.'));};
      x.ontimeout=function(){reject(new Error('Dodatak nije odgovorio unutar 14 sekundi.'));};x.send();
    });
  }
  function drain(){requestQueue.sort(function(a,b){return a.priority-b.priority||a.sequence-b.sequence;});while(inFlight<4&&requestQueue.length){var index=requestQueue.findIndex(function(job){return job.priority<2||backgroundFlight<3;});if(index<0)return;var job=requestQueue.splice(index,1)[0];inFlight++;if(job.priority>=2)backgroundFlight++;(function(j){rawJSON(j.url).then(j.resolve,j.reject).then(function(){inFlight--;if(j.priority>=2)backgroundFlight--;drain();});}(job));}}
  function json(url,options){options=options||{};var priority=options.priority==null?(/\/(stream|subtitles)\//.test(url)?0:/\/(meta|manifest)/.test(url)?1:2):options.priority,key=viewerScope()+'|'+url,ttl=/\/catalog\//.test(url)?180000:/\/meta\//.test(url)?600000:/manifest\.json(?:[?#]|$)/.test(url)?120000:0,cached=jsonCache[key];
    if(ttl&&cached&&cached.expires>Date.now()){cached.used=Date.now();return Promise.resolve(cached.data);}if(jsonPending[key]){if(priority<jsonPending[key].job.priority)jsonPending[key].job.priority=priority;drain();return jsonPending[key].promise;}
    var job,promise=new Promise(function(resolve,reject){job={url:url,priority:priority,sequence:++requestSequence,resolve:resolve,reject:reject};requestQueue.push(job);});jsonPending[key]={promise:promise,job:job};
    promise.then(function(data){delete jsonPending[key];if(!ttl)return;var bytes=JSON.stringify(data).length*2;if(bytes>700000)return;if(jsonCache[key])cacheBytes-=jsonCache[key].bytes;jsonCache[key]={data:data,expires:Date.now()+ttl,used:Date.now(),bytes:bytes};cacheBytes+=bytes;Object.keys(jsonCache).sort(function(a,b){return jsonCache[a].used-jsonCache[b].used;}).some(function(k){if(cacheBytes<=4000000&&Object.keys(jsonCache).length<=50)return true;cacheBytes-=jsonCache[k].bytes;delete jsonCache[k];return false;});},function(){delete jsonPending[key];});drain();return promise;
  }
  function hostName(url){try{return C.httpURL(url).host;}catch(_){return 'Nevaljana adresa';}}
  function currentScope(){if(state.player&&state.player.nextPanel&&!state.player.nextPanel.hidden)return state.player.nextPanel;if(state.player&&!state.player.subtitles.hidden)return state.player.subtitles;return state.layers.length?state.layers[state.layers.length-1].node:app;}
  function focusable(scope){return Array.prototype.slice.call((scope||currentScope()).querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(function(n){return n.getClientRects().length>0&&!n.closest('[hidden],[aria-hidden="true"]');});}
  var smoothFocus=false,lastNavigation=0;
  function focus(n){if(!n)return;try{n.focus({preventScroll:true});}catch(_){n.focus();}if(M.scrollFocus(n,!smoothFocus))return;try{n.scrollIntoView({block:'nearest',inline:'nearest',behavior:smoothFocus?'smooth':'auto'});}catch(_){n.scrollIntoView(false);}}
  function initialFocus(scope){focus(focusable(scope)[0]);}
  function navigate(direction){
    var active=document.activeElement,scope=currentScope(),rail=active&&active.closest('.rail'),horizontal=direction==='left'||direction==='right',hero=!state.layers.length&&document.getElementById('hero');
    if(direction==='down'&&hero&&hero.getClientRects().length&&active&&active.closest('.topbar')){focus(hero);return;}
    if(active===hero&&direction==='down'){var firstShelf=app.querySelector('.shelf');if(firstShelf&&firstShelf._lumaMount)firstShelf._lumaMount();focus(app.querySelector('.card'));return;}
    if(active===hero&&direction==='right'){if(hero._lumaPlayback)stopHeroTrailer();focus(hero.querySelector('[data-focus="hero-play"]'));return;}
    if(active===hero&&direction==='up'){focus(app.querySelector('[data-focus="nav-'+state.page+'"]'));return;}
    var now=Date.now();smoothFocus=now-lastNavigation>160&&!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);lastNavigation=now;
    // Horizontal rails have deterministic neighbours: avoid measuring every catalog card on every key.
    if(rail&&horizontal){var railItem=active.closest('.card-slot')||active,sibling=direction==='left'?railItem.previousElementSibling:railItem.nextElementSibling;
      while(sibling&&sibling.disabled)sibling=direction==='left'?sibling.previousElementSibling:sibling.nextElementSibling;
      focus(sibling&&(sibling.querySelector('.card')||sibling));smoothFocus=false;return;
    }
    if(!horizontal){if(!state.layers.length){var shelves=Array.prototype.slice.call(app.querySelectorAll('.shelf')),current=active&&active.closest('.shelf'),at=shelves.indexOf(current),near=shelves[at+(direction==='down'?1:-1)];if(near&&near._lumaMount)near._lumaMount();}M.settleLayout();}
    var nodes=Array.prototype.slice.call(scope.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]'));
    if(nodes.indexOf(active)<0){initialFocus();smoothFocus=false;return;}
    var a=active.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2,best=null,score=Infinity;
    nodes.forEach(function(n){if(n===active||n.closest('[hidden],[aria-hidden="true"]'))return;
      // In vertical navigation, only columns visible in each horizontal rail can be candidates.
      var r=n.getBoundingClientRect();if(!r.width||!r.height)return;
      if(!horizontal&&n.closest('.rail')&&(r.right<0||r.left>window.innerWidth))return;
      var dx=r.left+r.width/2-ax,dy=r.top+r.height/2-ay,primary=direction==='left'?-dx:direction==='right'?dx:direction==='up'?-dy:dy,secondary=horizontal?Math.abs(dy):Math.abs(dx);
      if(primary<5)return;var beam=horizontal?(r.bottom>a.top+3&&r.top<a.bottom-3):(r.right>a.left+3&&r.left<a.right-3);
      var scoreHere=primary+secondary*2+(beam?0:1200);if(scoreHere<score){score=scoreHere;best=n;}
    });focus(best);smoothFocus=false;
  }
  function pushLayer(kind,title){
    stopPreviews();
    var previous=state.layers[state.layers.length-1];if(previous)previous.node.hidden=true;
    var node=el('section','layer '+kind);node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label',title);
    var top=el('div','layer-top');append(top,button('‹ Natrag',popLayer,'quiet',kind+'-back'),el('h2','',title));node.appendChild(top);
    var body=el('div','layer-body');node.appendChild(body);overlay.appendChild(node);
    var layer={kind:kind,node:node,body:body,returnFocus:document.activeElement,cleanup:null};state.layers.push(layer);app.setAttribute('aria-hidden','true');M.enter(node,{y:16,duration:.3});initialFocus(node);return layer;
  }
  function popLayer(){
    var layer=state.layers.pop();if(!layer)return;
    if(layer.cleanup)layer.cleanup();layer.node.setAttribute('aria-hidden','true');layer.node.style.pointerEvents='none';M.leave(layer.node,function(){layer.node.remove();});
    var previous=state.layers[state.layers.length-1];if(previous){previous.node.hidden=false;if(previous.refresh)previous.refresh();}else app.removeAttribute('aria-hidden');
    if(layer.kind==='detail'&&!state.layers.length)render();
    if(layer.returnFocus&&layer.returnFocus.isConnected)focus(layer.returnFocus);else {var key=layer.returnFocus&&layer.returnFocus.dataset.focus,restored=key&&focusable().find(function(n){return n.dataset.focus===key;});if(restored)focus(restored);else initialFocus();}
  }
  function closeToDetail(){while(state.layers.length&&state.layers[state.layers.length-1].kind!=='detail')popLayer();}
  function isSaved(meta){return bookmarks.some(function(m){return C.key(m)===C.key(meta);});}
  function bookmark(meta,b){
    if(account.status().connected&&meta._sample){toast('Probni video ne sprema se u Stremio biblioteku.');return;}
    if(account.status().connected&&!meta._sample){var save=!isSaved(meta);account.setBookmark(meta,save).then(function(){toast(save?'Spremljeno u Stremio biblioteku.':'Uklonjeno iz Stremio biblioteke.');}).catch(function(){toast('Promjena je spremljena u LUMI i čeka sinkronizaciju.');});if(b)b.textContent=save?'✓ Na mojoj listi':'+ Moja lista';return;}
    if(isSaved(meta)){bookmarks=bookmarks.filter(function(m){return C.key(m)!==C.key(meta);});toast('Uklonjeno iz Moje liste.');}
    else {bookmarks.unshift(C.cleanMeta(meta));bookmarks=bookmarks.slice(0,150);toast('Spremljeno u Moju listu na ovom TV-u.');}
    store.write('bookmarks',bookmarks);warnStorage();if(b)b.textContent=isSaved(meta)?'✓ Na mojoj listi':'+ Moja lista';
  }
  function metaLine(meta){var n=el('div','meta-line');if(meta.imdbRating)append(n,el('span','rating','★ '+meta.imdbRating));if(meta.releaseInfo)append(n,el('span','',meta.releaseInfo));if(meta.runtime)append(n,el('span','',meta.runtime));append(n,el('span','tag',meta.type==='series'?'Serija':'Film'));if(meta.genres.length)append(n,el('span','',meta.genres.slice(0,2).join(' / ')));return n;}
  function image(url,cls,alt){var img=el('img',cls);img.alt=alt||'';img.referrerPolicy='no-referrer';img.loading='lazy';img.decoding='async';if(cls==='poster-fit'||cls==='detail-backdrop'){img.classList.add('motion-image');img.addEventListener('load',function(){img.classList.add('is-loaded');});}img.src=url;img.addEventListener('error',function(){img.remove();});return img;}
  function card(meta, id, progress){
    var slot=el('div','card-slot'),b=button('',function(){if(cardTrailerBlocked&&cardTrailer&&focusedCard===b){cardTrailer.play();return;}openDetails(meta,!!progress,progress&&progress.videoId);},'card',id),art=el('div','card-art'),status=el('span','card-preview-status');
    b.setAttribute('aria-label',meta.name+(meta._sample?' — probni video':''));status.setAttribute('role','status');status.hidden=true;
    append(art,el('span','card-fallback',meta.name));if(meta.background||meta.poster)append(art,image(meta.background||meta.poster,'poster-fit'));
    if(meta._sample)append(art,el('span','sample-badge','Probni video'));
    if(progress&&progress.duration){var p=el('div','progress'),bar=el('i');bar.style.width=Math.min(100,progress.time/progress.duration*100)+'%';append(p,bar);append(art,p);}
    append(b,art,el('span','card-title',meta.name),el('span','card-sub',meta.releaseInfo||(meta.type==='series'?'Serija':'Film')),status);append(slot,b);
    b.addEventListener('focus',function(){stopHeroTrailer();stopCardTrailer();focusedCard=b;focusedCardMeta=meta;M.layout(document.getElementById('main'),function(){slot.classList.add('is-focused');var screen=document.getElementById('main');if(screen)screen.classList.remove('is-editing');});M.scrollFocus(b,false);clearTimeout(heroTimer);if(config.autoTrailers&&!meta._sample){cardTrailerKey=C.key(meta);trailerScheduler.select(meta);}});
    slot.addEventListener('focusout',function(e){if(e.relatedTarget&&slot.contains(e.relatedTarget))return;if(focusedCard===b){stopCardTrailer();focusedCard=null;focusedCardMeta=null;clearTimeout(heroTimer);}M.layout(document.getElementById('main'),function(){slot.classList.remove('is-focused');status.hidden=true;status.textContent='';});});return slot;
  }
  function catalogVisible(catalog){return !!catalog&&!['id','name'].some(function(field){return String(catalog[field]||'').toLowerCase().replace(/[^a-z0-9]/g,'')==='publicdomainmovies';});}
  function rowTitle(row){if(row.sample)return 'Upoznaj svoj player';var c=row.catalog,name=c.name||c.id,type=c.type==='movie'?'Filmovi':c.type==='series'?'Serije':c.type;
    if(row.addon.manifest.id==='com.linvo.cinemeta')name=({top:'Popularno',year:'Novo',imdbRating:'Visoko ocijenjeno'})[c.id]||name;
    return type+' · '+name+(row.extra.genre?' · '+row.extra.genre:'');}
  function shelf(row,id){var section=el('section','shelf is-lazy'),head=el('div','shelf-head'),rail=el('div','rail'),shown=12,mounted=false,savedLeft=0;append(head,el('h2','',row.title||rowTitle(row)));append(section,head,rail);rail.dataset.rail=id;
    function fill(){var previous=rail.scrollLeft,items=(row.items||[]).filter(function(meta){return !row._filterOpinions||experience.rating(meta)!==-1;});rail.textContent='';items.slice(0,shown).forEach(function(meta,i){append(rail,card(meta,id+'-'+i,row.progress&&row.progress[C.key(meta)]));});
      if(shown<items.length)append(rail,button('Još',function(){var first=shown;shown+=12;fill();focus(rail.querySelector('[data-focus="'+id+'-'+first+'"]'));},'more-card',id+'-more'));
      else if(row.canMore){var more=button('Učitaj još',function(){loadMore(row,function(){shown=Math.min(row.items.length,shown+12);fill();},more);},'more-card',id+'-more');append(rail,more);}rail.dataset.shown=String(shown);rail.scrollLeft=previous;
    }
    section._lumaMount=function(){if(mounted)return;mounted=true;shown=Math.max(shown,Number(rail.dataset.restoreCount)||12);section.classList.remove('is-lazy');rail.style.minHeight='';fill();rail.scrollLeft=Number(rail.dataset.restoreLeft)||savedLeft;};
    section._lumaUnmount=function(){if(!mounted||section.contains(document.activeElement)||section.querySelector('.card-preview'))return;savedLeft=rail.scrollLeft;rail.dataset.restoreLeft=String(savedLeft);rail.style.minHeight=rail.offsetHeight+'px';rail.textContent='';mounted=false;section.classList.add('is-lazy');};return section;
  }
  function mountShelves(root,reset){var main=document.getElementById('main');if(!main||!root)return;if(reset||shelfObserverRoot!==main){if(shelfObserver)shelfObserver.disconnect();shelfObserver=null;shelfObserverRoot=main;}
    if(!window.IntersectionObserver){root.querySelectorAll('.shelf').forEach(function(n){n._lumaMount();});return;}
    if(!shelfObserver)shelfObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.target.isConnected)return;if(entry.isIntersecting)entry.target._lumaMount();else entry.target._lumaUnmount();});},{root:main,rootMargin:'90% 0px',threshold:0});
    root.querySelectorAll('.shelf').forEach(function(n){if(!n._lumaObserved){n._lumaObserved=true;shelfObserver.observe(n);}});
  }
  function loadMore(row,fill,buttonEl){
    if(row.loading)return;row.loading=true;buttonEl.textContent='Učitavam…';buttonEl.disabled=true;
    var extra=Object.assign({},row.extra,{skip:row.skip});
    json(C.resourceURL(row.addon.url,'catalog',row.catalog.type,row.catalog.id,extra)).then(function(data){
      var raw=Array.isArray(data.metas)?data.metas:[];var next=C.uniqueMetas(raw,row.addon.url);row.skip+=raw.length;
      var seen=Object.create(null);row.items.forEach(function(m){seen[C.key(m)]=true;});next=next.filter(function(m){return !seen[C.key(m)];});
      row.items=row.items.concat(next).slice(0,300);row.canMore=raw.length>0&&next.length>0&&row.items.length<300;row.loading=false;
      var id=buttonEl.dataset.focus;fill();var fresh=app.querySelector('[data-focus="'+id+'"]');focus(fresh||document.querySelector('[data-focus="'+id.replace('-more','-'+(row.items.length-1))+'"]'));
      if(!next.length)toast('Nema više naslova u ovom redu.');
    }).catch(function(e){row.loading=false;buttonEl.disabled=false;buttonEl.textContent='Pokušaj opet';toast(e.message);});
  }
  function createHero(){
    var h=el('section','hero'),preview=el('div','hero-preview');h.id='hero';h.dataset.focus='hero-banner';h.tabIndex=0;h.setAttribute('role','region');preview.hidden=true;append(h,el('div','hero-art'),preview,el('div','hero-shade'),el('div','hero-copy'));h.addEventListener('focusout',function(){setTimeout(function(){if(document.getElementById('hero')===h&&!h.contains(document.activeElement))stopHeroTrailer();},0);});h.addEventListener('mouseenter',function(){if(!state.layers.length&&!state.player&&state.ready&&!h.contains(document.activeElement))focus(h);});h.addEventListener('mouseleave',function(){if(document.activeElement===h)h.blur();});return h;
  }
  function updateHero(meta){
    stopHeroTrailer();var hero=document.getElementById('hero');if(!hero)return;state.hero=meta;hero.setAttribute('aria-label',meta.name);
    var focused=hero.contains(document.activeElement)?document.activeElement.dataset.focus:null;
    M.background(hero,meta.background||meta.poster?'url('+JSON.stringify(meta.background||meta.poster)+')':'');
    var copy=hero.querySelector('.hero-copy');copy.textContent='';
    append(copy,el('h1','',meta.name),metaLine(meta),el('p','hero-description',meta.description||''));
    function activate(fn){return function(){if(heroTrailerBlocked&&heroTrailer){heroTrailer.play();return;}fn();};}
    var acts=el('div','actions hero-actions');append(acts,action(config.oneClick?(latestProgress(meta)?'Nastavi':'Reproduciraj'):(meta.type==='series'?'Odaberi epizodu':'Prikaži izvore'),'▶',activate(function(){openDetails(meta,true);}), 'primary','hero-play'),action('Više informacija','ⓘ',activate(function(){openDetails(meta);}), 'quiet','hero-detail'));append(copy,acts);
    if(!meta._sample){append(acts,action('Trailer','▷',activate(function(){openTrailer(meta);}), 'quiet','hero-trailer'));}
    var status=el('p','hero-preview-status');status.hidden=true;status.setAttribute('role','status');append(copy,status);
    M.enter(copy,{y:8,duration:.28});
    if(focused)focus(hero.querySelector('[data-focus="'+focused+'"]'));
  }
  function cardTrailerStatus(text){var status=focusedCard&&focusedCard.querySelector('.card-preview-status');if(status){status.textContent=text||'';status.hidden=!text;}}
  function stopCardTrailer(){trailerScheduler.stop();cardTrailer=null;cardTrailerKey='';cardTrailerBlocked=false;cardTrailerStatus('');}
  function cardPreviewVisible(){var art=focusedCard&&focusedCard.querySelector('.card-art');if(!art||!focusedCard.isConnected)return false;var rect=art.getBoundingClientRect(),nav=app.querySelector('.topbar'),top=nav?Math.max(0,nav.getBoundingClientRect().bottom):0;return T.visibleEnough({left:rect.left,right:rect.right,top:rect.top-top,bottom:rect.bottom-top,width:rect.width,height:rect.height},window.innerWidth,window.innerHeight-top);}
  function trailerAllowed(meta){if(!config.autoTrailers||document.hidden||state.layers.length||state.player||!state.ready||meta._sample||!focusedCardMeta||C.key(meta)!==C.key(focusedCardMeta)||!cardPreviewVisible())return false;return focusedCard.parentElement.contains(document.activeElement);}
  function startCardTrailer(meta,items){if(!trailerAllowed(meta))return {destroy:function(){}};var card=focusedCard,slot=card.parentElement,panel=el('div','card-preview'),mount=el('div','trailer-media'),handle=null,finished=false;
    append(panel,mount);append(slot,panel);slot.classList.add('has-card-trailer');M.enter(panel,{y:0,duration:.24});
    function restorePoster(){var shown=panel.isConnected;panel.remove();slot.classList.remove('has-card-trailer','is-trailer-playing');Array.prototype.forEach.call(card.querySelectorAll('.card-title,.card-sub'),function(n){n.removeAttribute('aria-hidden');});if(shown)M.enter(card.querySelector('.card-art'),{y:0,duration:.2});}
    handle=T.createPlayer({mount:mount,items:items,title:meta.name,muted:false,preview:true,onState:function(view){if(focusedCard!==card||!card.isConnected)return;cardTrailerBlocked=view.state==='blocked';cardTrailerStatus(cardTrailerBlocked?'OK za trailer sa zvukom':'');
      if(view.state==='playing'){slot.classList.add('is-trailer-playing');Array.prototype.forEach.call(card.querySelectorAll('.card-title,.card-sub'),function(n){n.setAttribute('aria-hidden','true');});}
      if(view.state==='unavailable'||view.state==='ended'){finished=true;restorePoster();if(handle){handle.destroy();cardTrailer=null;}cardTrailerBlocked=false;}
    }});
    if(finished){handle.destroy();restorePoster();}else cardTrailer=handle;
    return {destroy:function(){handle.destroy();restorePoster();}};
  }
  function stopHeroTrailer(){heroTrailerScheduler.stop();heroTrailer=null;heroTrailerKey='';heroTrailerBlocked=false;var hero=document.getElementById('hero');if(!hero)return;M.heroPlayback(hero,false);hero.classList.remove('hero-with-trailer','hero-youtube');var panel=hero.querySelector('.hero-preview'),status=hero.querySelector('.hero-preview-status');if(panel){panel.hidden=true;panel.textContent='';}if(status){status.hidden=true;status.textContent='';}}
  function stopPreviews(){stopCardTrailer();stopHeroTrailer();}
  function heroVisible(){var hero=document.getElementById('hero');if(!hero)return false;var panel=hero.querySelector('.hero-preview'),media=panel&&!panel.hidden&&panel.querySelector('.trailer-media'),rect=(media||hero).getBoundingClientRect(),nav=app.querySelector('.topbar'),top=nav?Math.max(0,nav.getBoundingClientRect().bottom):0;return T.visibleEnough({left:rect.left,right:rect.right,top:rect.top-top,bottom:rect.bottom-top,width:rect.width,height:rect.height},window.innerWidth,window.innerHeight-top);}
  function heroFocused(meta){var hero=document.getElementById('hero');return !!(config.autoTrailers&&state.ready&&!document.hidden&&!state.layers.length&&!state.player&&hero&&state.hero&&!meta._sample&&C.key(meta)===C.key(state.hero)&&hero.contains(document.activeElement));}
  function heroTrailerAllowed(meta){return heroFocused(meta)&&heroVisible();}
  function queueHeroTrailer(){if(!state.hero||!heroFocused(state.hero)||heroTrailerKey===C.key(state.hero))return;stopCardTrailer();heroTrailerKey=C.key(state.hero);heroTrailerScheduler.select(state.hero);}
  function startHeroTrailer(meta,items){if(!heroTrailerAllowed(meta))return {destroy:function(){}};var hero=document.getElementById('hero'),panel=hero.querySelector('.hero-preview'),status=hero.querySelector('.hero-preview-status'),mount=el('div','trailer-media'),handle=null,finished=false;panel.hidden=false;panel.textContent='';append(panel,mount);
    function restore(){panel.hidden=true;panel.textContent='';M.heroPlayback(hero,false);hero.classList.remove('hero-with-trailer','hero-youtube');}
    handle=T.createPlayer({mount:mount,items:items,title:meta.name,muted:false,preview:true,allowed:function(){return heroTrailerAllowed(meta);},onSource:function(item){hero.classList.add('hero-with-trailer');hero.classList.toggle('hero-youtube',item.kind==='youtube');},onState:function(view){if(!hero.isConnected)return;heroTrailerBlocked=view.state==='blocked';status.textContent=heroTrailerBlocked?'OK za trailer sa zvukom':'';status.hidden=!heroTrailerBlocked;if(view.state==='playing'){if(hero.contains(document.activeElement)&&document.activeElement!==hero){try{hero.focus({preventScroll:true});}catch(_){hero.focus();}}M.heroPlayback(hero,true);}if(view.state==='unavailable'||view.state==='ended'){finished=true;restore();heroTrailerBlocked=false;if(handle){handle.destroy();heroTrailer=null;}}}});
    if(finished){handle.destroy();restore();}else heroTrailer=handle;return {destroy:function(){handle.destroy();restore();}};
  }
  function openTrailer(meta){var layer=pushLayer('trailer-layer','Trailer · '+meta.name),mount=el('div','trailer-media'),controls=el('div','actions'),status=el('p','trailer-status','Tražim trailer…'),handle=null,closed=false;
    var wrap=el('div','trailer-view'),play=button('Pokreni trailer',function(){if(handle)handle.toggle();},'primary','trailer-play'),sound=button('Isključi zvuk',function(){if(handle)handle.sound();},'quiet','trailer-sound');play.disabled=true;sound.disabled=true;
    append(controls,play,sound);append(wrap,mount,controls,status);append(layer.body,wrap);layer.cleanup=function(){closed=true;if(handle)handle.destroy();};layer.trailer=function(){return handle;};
    trailerResolver.resolve(meta).then(function(items){if(closed)return;if(!items.length){status.textContent='Povezani dodaci nemaju trailer za ovaj naslov.';return;}
      play.disabled=false;sound.disabled=false;handle=T.createPlayer({mount:mount,items:items,title:meta.name,muted:false,onState:function(view){status.textContent=['playing','paused','ended'].indexOf(view.state)>=0?'':view.message;play.textContent=view.state==='playing'?'Pauza':'Pokreni trailer';sound.textContent=view.muted?'Uključi zvuk':'Isključi zvuk';if(view.state==='unavailable'){play.disabled=true;sound.disabled=true;focus(layer.node.querySelector('button'));}}});focus(play);
    }).catch(function(){if(!closed)status.textContent='Trailer trenutačno nije dostupan. Vrati se i pokušaj ponovno.';});
  }
  function renderNav(){
    var header=el('header','topbar'),nav=el('nav','nav');nav.setAttribute('aria-label','Glavni izbornik');append(header,el('div','brand','LUMA'));
    [['home','Početna'],['movie','Filmovi'],['series','Serije'],['saved','Moja lista']].forEach(function(pair){var b=button(pair[1],function(){setPage(pair[0]);},'', 'nav-'+pair[0]);if(state.page===pair[0])b.setAttribute('aria-current','page');append(nav,b);});
    append(nav,el('span','spacer'));[['search','⌕  Traži'],['settings','Postavke']].forEach(function(pair){var b=button(pair[1],function(){setPage(pair[0]);},'', 'nav-'+pair[0]);if(state.page===pair[0])b.setAttribute('aria-current','page');append(nav,b);});append(nav,button(account.status().connected?'Moj račun':'Prijavi se',openAccount,'account-nav','account-open'));append(header,nav);return header;
  }
  function setPage(page){if(page==='home')heroEntries.home=true;clearTimeout(heroTimer);state.searchGeneration++;state.page=page;var main=document.getElementById('main');if(main)main.scrollTop=0;render();focus(app.querySelector('[data-focus="nav-'+page+'"]'));}
  function render(){
    stopPreviews();clearTimeout(heroTimer);
    var old=document.activeElement&&document.activeElement.dataset.focus,oldScreen=document.getElementById('main'),scrollTop=oldScreen?oldScreen.scrollTop:0,rails={};
    app.querySelectorAll('[data-rail]').forEach(function(r){rails[r.dataset.rail]={left:Number(r.dataset.restoreLeft)||r.scrollLeft,shown:Number(r.dataset.shown)||12};});
    app.textContent='';append(app,renderNav());var screen=el('main','screen');screen.id='main';append(app,screen);
    if(state.page==='settings')renderSettings(screen);
    else if(state.page==='search')renderSearch(screen);
    else if(state.page==='saved')renderSaved(screen);
    else renderHome(screen);
    screen.scrollTop=scrollTop;app.querySelectorAll('[data-rail]').forEach(function(r){var saved=rails[r.dataset.rail];if(saved){r.dataset.restoreLeft=String(saved.left);r.dataset.restoreCount=String(saved.shown);}if(old&&old.indexOf(r.dataset.rail+'-')===0){var section=r.closest('.shelf'),index=Number(old.slice(r.dataset.rail.length+1));if(isFinite(index))r.dataset.restoreCount=String(Math.max(Number(r.dataset.restoreCount)||12,Math.ceil((index+1)/12)*12));if(section&&section._lumaMount)section._lumaMount();}});
    if(!state.layers.length){var restore=old&&app.querySelector('[data-focus="'+old+'"]');if(restore)focus(restore);else initialFocus(app);}
    mountShelves(screen,true);M.page(screen);
  }
  function renderHome(screen){
    screen.classList.add('browse-screen');
    var rows=state.rows.filter(function(r){return state.page==='home'||r.catalog&&r.catalog.type===state.page;});
    var model=discoveryModel(),first=selectHomeHero(model);
    if(first){append(screen,createHero());updateHero(first);}else append(screen,el('section','hero hero-loading'));
    var rowsEl=el('div','rows browse-catalogs');append(screen,rowsEl);
    if(!state.ready){var wait=el('div','status-strip');append(wait,el('span','loading','Povezujem tvoje kataloge…'));append(rowsEl,wait);}
    if(account.status().connected&&(account.status().error||account.status().pending)){var issue=el('div','status-strip');append(issue,el('span','',syncLabel()),button('Ponovi sinkronizaciju',syncAccount,'inline','retry-sync'));append(rowsEl,issue);}
    var discovery=el('div');discovery.id='discovery-rows';append(rowsEl,discovery);fillDiscovery(discovery,model);
    if(state.ready)prepareDiscovery();
    if(!rows.length&&state.ready){var empty=el('div','status-strip');append(empty,el('span','','Još nema kataloga za ovaj prikaz.'),button('Dodaj dodatak',function(){setPage('settings');},'inline'));append(rowsEl,empty);}
  }
  function viewerScope(){var auth=account.status();return auth.connected?'account:'+auth.user.id:'guest';}
  function watchedEntries(){if(account.status().connected)return account.watched();return Object.keys(history).map(function(k){return history[k];}).filter(function(h){return h&&h.meta&&!h.meta._sample&&h.meta.id!=='custom-direct'&&(h.time>0||h.duration>0);}).map(function(h){return {meta:h.meta,at:h.at};});}
  function discoveryModel(){var scope=viewerScope();if(scope!==discoveryNamespace){discoveryNamespace=scope;homeHeroes=Object.create(null);heroEntries={home:true,movie:true,series:true};discoveryRows=[];discoverySignature='';genreCache=Object.create(null);}return recommendations.build(state.rows.concat(discoveryRows),watchedEntries(),state.page==='movie'||state.page==='series'?state.page:null,experience.opinions());}
  function selectHomeHero(model){var page=state.page,pool=model.recommended.concat(model.popular,model.pool),old=homeHeroes[page];if(!state.ready&&!pool.length)return null;if(!heroEntries[page]&&old&&experience.rating(old)!==-1)return old;var chosen=recommendations.pickHero(pool,discoveryNamespace+':'+page);if(chosen){homeHeroes[page]=chosen;heroEntries[page]=false;var scope=discoveryNamespace;getMeta(chosen).then(function(full){if(scope!==discoveryNamespace||!homeHeroes[page]||C.key(homeHeroes[page])!==C.key(chosen))return;homeHeroes[page]=full;if(state.page===page&&!heroTrailerKey&&state.hero&&C.key(state.hero)===C.key(chosen)&&!state.layers.length)updateHero(full);}).catch(function(){});}return chosen;}
  function continueRow(){var progress={},items=Object.keys(history).sort(function(a,b){return history[b].at-history[a].at;}).map(function(key){var h=history[key];if(!h||!h.meta||!(h.cloud?h.time>0:C.resumePoint(h,h.duration)))return null;var meta=C.cleanMeta(h.meta);if(!meta||state.page==='movie'&&meta.type!=='movie'||state.page==='series'&&meta.type!=='series')return null;if(!progress[C.key(meta)])progress[C.key(meta)]=h;return meta;}).filter(Boolean);return {title:'Nastavi gledati',items:C.uniqueMetas(items).slice(0,20),progress:progress};}
  function categorySpecs(model,includeEmpty){var specs=[],continued=continueRow();function add(id,title,rows){if(includeEmpty||rows.some(function(row){return row.items.length;}))specs.push({id:id,title:title,rows:rows});}
    add('continue','Nastavi gledati',[continued]);add('recommended','Preporučeno za tebe',[{title:'Preporučeno za tebe',items:model.recommended}]);add('because','Jer si gledao…',model.because);add('new','Novo',[{title:'Novo',items:model.fresh}]);add('popular','Popularno',[{title:'Popularno',items:model.popular}]);model.genres.forEach(function(row){add(row.id,row.title,[row]);});
    state.rows.filter(function(row){return catalogVisible(row.catalog)&&row.items.length&&!/^(top|year|popular|trending|new|latest)$/i.test(row.catalog.id)&&(state.page!=='movie'&&state.page!=='series'||row.catalog.type===state.page);}).forEach(function(row){var id='catalog:'+encodeURIComponent(row.addon.manifest.id+':'+row.catalog.type+':'+row.catalog.id+':'+JSON.stringify(row.extra));row._filterOpinions=true;add(id,row.title||rowTitle(row),[row]);});return specs;
  }
  function fillDiscovery(host,model){host.textContent='';experience.arrange(categorySpecs(model,false),false).forEach(function(spec){spec.rows.forEach(function(row,i){if(row.items.length)append(host,shelf(row,spec.id+'-'+i));});});}
  function renderCategorySettings(body){var old=document.activeElement&&document.activeElement.dataset.focus,model=recommendations.build(state.rows.concat(discoveryRows),watchedEntries(),null,experience.opinions()),specs=experience.arrange(categorySpecs(model,true),true),ids=specs.map(function(s){return s.id;});body.textContent='';specs.forEach(function(spec,i){var row=el('div','category-setting'),controls=el('div','category-setting-controls'),up=button('↑',function(){experience.moveRow(spec.id,-1,ids);renderCategorySettings(body);},'quiet','row-up-'+encodeURIComponent(spec.id)),down=button('↓',function(){experience.moveRow(spec.id,1,ids);renderCategorySettings(body);},'quiet','row-down-'+encodeURIComponent(spec.id));up.disabled=i===0;down.disabled=i===specs.length-1;up.setAttribute('aria-label','Pomakni gore: '+spec.title);down.setAttribute('aria-label','Pomakni dolje: '+spec.title);append(controls,up,down,button(experience.hidden(spec.id)?'Prikaži':'Sakrij',function(){experience.toggleRow(spec.id);renderCategorySettings(body);},'quiet','row-visible-'+encodeURIComponent(spec.id)));append(row,el('span','',spec.title),controls);append(body,row);});append(body,button('Vrati zadani raspored',function(){experience.resetRows();renderCategorySettings(body);},'quiet','rows-reset'));var restored=old&&body.querySelector('[data-focus="'+old+'"]');if(restored)focus(restored.disabled?restored.closest('.category-setting').querySelector('button:last-child'):restored);}
  function refreshDiscovery(){var host=document.getElementById('discovery-rows');if(!host)return;if(state.layers.length||state.player||host.contains(document.activeElement)){discoveryPending=true;return;}discoveryPending=false;fillDiscovery(host,discoveryModel());mountShelves(host,false);M.reveal(host);}
  function prepareDiscovery(){if(!state.ready)return;var scope=viewerScope(),entries=watchedEntries(),signature=state.generation+'|'+scope+'|'+entries.slice(0,8).map(function(e){return C.key(e.meta)+':'+Math.floor((Number(e.at)||0)/60000);}).join('|');if(signature===discoverySignature)return;discoverySignature=signature;var run=++discoveryRun,generation=state.generation;
    var recent=C.uniqueMetas(entries.slice(0,8).map(function(e){return e.meta;})).slice(0,6);Promise.all(recent.map(function(meta){return getMeta(meta).then(function(full){if(full&&C.key(full)===C.key(meta))recommendations.enrich(full);}).catch(function(){});})).then(function(){if(run!==discoveryRun||generation!==state.generation||scope!==viewerScope())return null;var model=recommendations.build(state.rows,watchedEntries(),null,experience.opinions()),jobs=recommendations.genreJobs(state.addons,model);return Promise.all(jobs.map(function(job){var cached=genreCache[job.url];if(cached&&Date.now()-cached.at<600000)return Promise.resolve(cached.row);return json(job.url).then(function(data){job.items=C.uniqueMetas(data.metas,job.addon.url).slice(0,80).map(function(m){if(!m.genres.length)m.genres=[String(job.extra.genre)];return m;});genreCache[job.url]={row:job,at:Date.now()};return job;}).catch(function(){return null;});}));}).then(function(rows){if(!rows||run!==discoveryRun||generation!==state.generation||scope!==viewerScope())return;discoveryRows=rows.filter(Boolean);refreshDiscovery();});
  }
  function renderSaved(screen){if(bookmarks.length){screen.classList.add('browse-screen');append(screen,createHero());updateHero(bookmarks[0]);}var content=el('div','page-content browse-catalogs saved-catalogs');append(content,el('h1','','Moja lista'));
    if(bookmarks.length)append(content,shelf({title:bookmarks.length+' spremljenih naslova',items:bookmarks},'saved'));
    else append(content,textBlock('Tvoja lista čeka prvu priču.','Otvori film ili seriju i odaberi + Moja lista.'));
    append(screen,content);
  }
  function loadCatalogs(){
    var generation=++state.generation;discoveryRun++;discoveryRows=[];discoverySignature='';state.ready=false;state.errors=[];if(state.page!=='settings')render();
    var urls=addonURLs();activeAddonSignature=urls.join('\n');
    Promise.all(urls.map(function(url){return json(url).then(function(m){return {url:url,manifest:C.validateManifest(m)};}).catch(function(e){return {url:url,error:e.message};});})).then(function(addons){
      if(generation!==state.generation)return;state.addons=addons.filter(function(a){return !a.error;});trailerResolver.clear();state.errors=addons.filter(function(a){return a.error;});
      var tasks=[];state.addons.forEach(function(a){(a.manifest.catalogs||[]).forEach(function(c){var args=C.catalogArgs(c);if(catalogVisible(c)&&args!==null&&tasks.length<24&&C.supports(a.manifest,'catalog',c.type,c.id))tasks.push({addon:a,catalog:c,extra:args});});});
      return Promise.all(tasks.map(function(row){return json(C.resourceURL(row.addon.url,'catalog',row.catalog.type,row.catalog.id,row.extra)).then(function(data){var raw=Array.isArray(data.metas)?data.metas:[];row.items=C.uniqueMetas(raw,row.addon.url).slice(0,100);row.skip=raw.length;row.canMore=raw.length>0&&C.extras(row.catalog).some(function(e){return e.name==='skip';});return row;}).catch(function(e){return {error:e.message,url:row.addon.url};});}));
    }).then(function(rows){if(!rows||generation!==state.generation)return;state.rows=rows.filter(function(r){return !r.error;});state.errors=state.errors.concat(rows.filter(function(r){return r.error;}));state.ready=true;if(!state.layers.length)render();}).catch(function(){if(generation!==state.generation)return;state.ready=true;state.errors=[{error:'Kataloge trenutačno nije moguće učitati.'}];render();});
  }
  function getMeta(meta){
    if(meta._sample)return Promise.resolve(meta);
    var addons=state.addons.filter(function(a){return C.supports(a.manifest,'meta',meta.type,meta.id);});
    addons.sort(function(a,b){return (a.url===meta._source?-1:0)-(b.url===meta._source?-1:0);});
    function next(i){if(i>=addons.length)return Promise.resolve(meta);var a=addons[i];return json(C.resourceURL(a.url,'meta',meta.type,meta.id)).then(function(data){var full=C.cleanMeta(data.meta,a.url);if(full&&C.key(full)===C.key(meta)){recommendations.enrich(full);return full;}return next(i+1);}).catch(function(){return next(i+1);});}return next(0);
  }
  function openDetails(meta, play, resumeId){
    clearTimeout(heroTimer);var layer=pushLayer('detail','Detalji');var current=meta;
    layer.refresh=function(){fill(current);};
    function fill(m){current=m;layer.meta=m;layer.body.textContent='';var old=layer.node.querySelector('.detail-backdrop');if(old)old.remove();old=layer.node.querySelector('.detail-shade');if(old)old.remove();
      if(m.background){var bg=image(m.background,'detail-backdrop');layer.node.insertBefore(bg,layer.node.firstChild);layer.node.insertBefore(el('div','detail-shade'),layer.node.children[1]);}
      var content=el('div','detail-content');append(content,el('h1','',m.name),metaLine(m));
      var desc=el('p','description-full',m.description||'Opis nije dostupan iz povezanih dodataka.');if(m.description.length>650)desc.tabIndex=0;append(content,desc);
      var actions=el('div','actions'),resume=latestProgress(m),ep=resume&&m.videos.find(function(v){return v.id===resume.videoId;});
      if(resume&&(m.type!=='series'||ep))append(actions,action('Nastavi'+(ep?' · S'+ep.season+' E'+ep.episode:'')+(resume.time>=10?' · '+C.formatTime(resume.time):''),'▶',function(){openStreams(m,resume.videoId,ep,config.oneClick);},'primary','detail-resume'));
      if(m.type!=='series')append(actions,action(resume?'Od početka':'Reproduciraj','▶',function(){openStreams(m,m.id,null,config.oneClick,!!resume);},resume?'quiet':'primary','detail-play'));else if(!resume){var firstEpisode=episodeForPlay(m);if(firstEpisode)append(actions,action('Reproduciraj','▶',function(){openStreams(m,firstEpisode.id,firstEpisode,config.oneClick);},'primary','detail-play'));}
      append(actions,button('Odaberi izvor',function(){var episode=m.type==='series'?episodeForPlay(m):null;if(m.type==='series'&&!episode)return;openStreams(m,episode?episode.id:m.id,episode,false);},'quiet','detail-sources'));
      var saved=button(isSaved(m)?'✓ Na mojoj listi':'+ Moja lista',function(){bookmark(m,saved);},'quiet','detail-save');append(actions,saved);if(!m._sample)append(actions,action('Trailer','▷',function(){openTrailer(m);},'quiet','detail-trailer'));append(content,actions);append(layer.body,content);
      var feedback=el('div','actions feedback-actions'),like=button('Sviđa mi se',function(){experience.rate(m,1);updateFeedback();},'quiet','detail-like'),dislike=button('Ne zanima me',function(){experience.rate(m,-1);updateFeedback();},'quiet','detail-dislike');function updateFeedback(){recommendations.enrich(m);like.setAttribute('aria-pressed',String(experience.rating(m)===1));dislike.setAttribute('aria-pressed',String(experience.rating(m)===-1));discoverySignature='';}append(feedback,like,dislike);append(content,feedback);updateFeedback();
      if(m.type==='series')renderEpisodes(layer,m);if(m._sample)append(layer.body,el('p','note','Probni MP4 niske rezolucije. Uspjeh ovog testa ne potvrđuje 4K, HEVC ili druge izvore.'));
    }
    fill(meta);append(layer.body,el('p','loading','Učitavam detalje…'));
    getMeta(meta).then(function(m){if(!layer.node.isConnected)return;fill(m);if(state.layers[state.layers.length-1]===layer){var ep=m.type==='series'?episodeForPlay(m,resumeId):null;if(play&&ep)openStreams(m,ep.id,ep,config.oneClick);else if(play&&m.type!=='series')openStreams(m,resumeId||m.id,null,config.oneClick);else focus(layer.node.querySelector('[data-focus="detail-resume"]')||layer.node.querySelector('[data-focus="detail-play"]')||layer.node.querySelector('.episode')||layer.node.querySelector('[data-focus="detail-save"]'));}});
  }
  function renderEpisodes(layer,meta){
    var area=el('section','episode-area');append(area,el('h2','','Epizode'));
    var episodes=meta.videos.slice().sort(function(a,b){return (Number(a.season)||0)-(Number(b.season)||0)||(Number(a.episode)||0)-(Number(b.episode)||0);});
    if(!episodes.length){append(area,textBlock('Nema popisa epizoda.','Povezani dodatak nije vratio epizode. Provjeri dodatak za metapodatke.'));append(layer.body,area);return;}
    var seasons=[];episodes.forEach(function(e){var s=e.season==null?'Ostalo':String(e.season);if(seasons.indexOf(s)<0)seasons.push(s);});
    var tabs=el('div','season-tabs'),list=el('div','episode-list');var selected=seasons.indexOf('1')>=0?'1':seasons[0],resume=latestProgress(meta),resumeEpisode=resume&&episodes.find(function(e){return e.id===resume.videoId;}),watchedIds=window.LumaStremio.episodeIds(meta),watched=[];
    if(resumeEpisode&&resumeEpisode.season!=null)selected=String(resumeEpisode.season);
    var libraryItem=account.status().connected&&account.item(meta.id);if(libraryItem)try{watched=window.LumaStremio.unpackWatched(libraryItem.state.watched,watchedIds);}catch(_){}
    function selectSeason(s){selected=s;list.textContent='';Array.prototype.forEach.call(tabs.children,function(b){b.setAttribute('aria-pressed',String(b.dataset.season===s));});
      episodes.filter(function(e){return (e.season==null?'Ostalo':String(e.season))===s;}).forEach(function(e,i){var b=button('',function(){openStreams(meta,e.id,e,config.oneClick);},'episode','episode-'+s+'-'+i);append(b,el('div','episode-number',e.episode!=null?e.episode:'▶'));var copy=el('div');append(copy,el('strong','',e.title||e.name||'Epizoda '+(e.episode||i+1)),el('span','',e.overview?String(e.overview).slice(0,180):e.released?String(e.released).slice(0,10):''));if(resume&&resume.videoId===e.id)append(copy,el('p','episode-progress','Nastavi'+(resume.time>=10?' · '+C.formatTime(resume.time):'')));else if(watched[watchedIds.indexOf(e.id)])append(copy,el('p','episode-progress','✓ Odgledano'));append(b,copy);append(list,b);});M.items(list);}
    seasons.forEach(function(s){var b=button(s==='0'?'Posebne epizode':s==='Ostalo'?s:'Sezona '+s,function(){selectSeason(s);},'quiet');b.dataset.season=s;append(tabs,b);});
    append(area,tabs,list);selectSeason(selected);append(layer.body,area);
  }
  function openStreams(meta,videoId,episode,automatic,fromStart){
    automatic=automatic===true;var layer=pushLayer('sources','Izvori');layer.meta=meta;layer.videoId=videoId;
    append(layer.body,el('h1','',meta.name),el('p','muted',episode?(episode.title||episode.name||videoId):''));var status=el('p','loading','Tražim izvore…'),list=el('div','stream-list');append(layer.body,status,list);
    var providers=state.addons.filter(function(a){return C.supports(a.manifest,'stream',meta.type,videoId);}),calls=providers.map(function(a){return json(C.resourceURL(a.url,'stream',meta.type,videoId),{priority:0}).then(function(data){return {addon:a.manifest.name,streams:Array.isArray(data.streams)?data.streams.slice(0,100):[]};}).catch(function(e){return {addon:a.manifest.name,error:e.message,streams:[]};});});if(meta._sample)calls.unshift(Promise.resolve({addon:'LUMA',streams:[sampleStream]}));
    Promise.all(calls).then(function(results){if(state.layers.indexOf(layer)<0)return;status.remove();var count=0,groups=C.planSources(results,config,location.protocol),probe=document.createElement('video'),ranked=E.rank(groups.available,{maxQuality:config.maxQuality,preferredAddon:experience.preferredAddon(),canPlay:function(type){return probe.canPlayType(type);}}),unique=Object.create(null);ranked=ranked.filter(function(entry){if(unique[entry.plan.url])return false;unique[entry.plan.url]=true;return true;});
      function streamCard(entry,target){var stream=entry.stream,plan=entry.plan;count++;var b=button('',function(){if(plan.error){toast(plan.error);return;}startPlayer(meta,videoId,stream,plan,episode,{automatic:false,fromStart:!!fromStart,entry:entry,candidates:ranked,attempt:1,failed:Object.create(null)});},'stream'+(plan.error?' unavailable':''),'source-'+count),copy=el('div');append(copy,el('strong','',String(stream.name||entry.addon).slice(0,180)),el('span','',String(stream.description||stream.title||entry.addon).slice(0,700)));if(plan.error||plan.warning)append(copy,el('p','stream-warning',plan.error||plan.warning));append(b,copy);append(target,b);}
      groups.available.forEach(function(entry){streamCard(entry,list);});
      if(!groups.available.length)append(list,textBlock('Nema dostupnog izvora.','Provjeri dodatke ili odaberi drugi naslov.'));
      if(groups.unavailable.length){var extra=el('div','unavailable-sources');extra.hidden=true;var reveal=button('Nepodržani izvori ('+groups.unavailable.length+')',function(){extra.hidden=!extra.hidden;reveal.setAttribute('aria-expanded',String(!extra.hidden));},'quiet','sources-unavailable');reveal.setAttribute('aria-expanded','false');append(list,reveal,extra);groups.unavailable.forEach(function(entry){streamCard(entry,extra);});}
      append(list,button('Ponovi',function(){popLayer();openStreams(meta,videoId,episode,automatic,fromStart);},'quiet','sources-retry'));M.items(list);
      if(automatic&&ranked.length&&state.layers[state.layers.length-1]===layer){var best=ranked[0];startPlayer(meta,videoId,best.stream,best.plan,episode,{automatic:true,fromStart:!!fromStart,entry:best,candidates:ranked,attempt:1,failed:Object.create(null)});}else if(state.layers[state.layers.length-1]===layer)focus(list.querySelector('button'));
    });
  }
  function episodeForPlay(meta,resumeId){var selected=resumeId||(latestProgress(meta)||{}).videoId,ordered=meta.videos.filter(function(e){return Number(e.season)>0&&Number(e.episode)>0&&e.available!==false&&(!e.released||!isFinite(Date.parse(e.released))||Date.parse(e.released)<=Date.now());}).slice().sort(function(a,b){return Number(a.season)-Number(b.season)||Number(a.episode)-Number(b.episode);}),resume=ordered.find(function(e){return e.id===selected;});var exact=selected&&meta.videos.find(function(e){return e.id===selected;});if(exact)return exact;if(resume)return resume;var ids=window.LumaStremio.episodeIds(meta),item=account.status().connected&&account.item(meta.id),watched=[];if(item)try{watched=window.LumaStremio.unpackWatched(item.state.watched,ids);}catch(_){}return ordered.find(function(e){return !watched[ids.indexOf(e.id)];})||ordered[0]||null;}
  function renderSearch(screen){
    screen.classList.add('browse-screen','search-screen','is-editing');append(screen,createHero());updateHero(state.hero||sample);
    var content=el('div','page-content browse-catalogs');append(content,el('h1','','Što ti se gleda?'));var layout=el('div','search-layout'),left=el('div','search-editor'),results=el('div','search-results');
    var input=el('input','search-box');input.type='search';input.value=state.query;input.placeholder='Film, serija…';input.setAttribute('aria-label','Pretraži naslove');input.dataset.focus='search-input';
    var timer;function search(){clearTimeout(timer);if(!results.isConnected||state.page!=='search')return;state.query=input.value.trim();runSearch(state.query,results);}
    function scheduleSearch(event){if(event&&event.type==='change'&&input.value.trim()===state.query)return;clearTimeout(timer);state.searchGeneration++;state.query=input.value.trim();results.textContent='';if(state.query)timer=setTimeout(search,5000);}
    input.addEventListener('input',scheduleSearch);input.addEventListener('change',scheduleSearch);input.addEventListener('keydown',function(e){if(e.keyCode===13){e.preventDefault();search();}});
    append(left,input);append(left,keyboard('ABCDEFGHIJKLMNOPQRSTUVWXYZČĆĐŠŽ0123456789',function(k){input.value=k==='⌫'?input.value.slice(0,-1):k==='Obriši'?'':input.value+(k==='Razmak'?' ':k);scheduleSearch();},search));
    append(content,button('‹ Promijeni pretragu',function(){stopCardTrailer();screen.classList.add('is-editing');focus(input);},'quiet search-edit','search-edit'));append(layout,left,results);append(content,layout);append(screen,content);if(state.query)runSearch(state.query,results);
  }
  function keyboard(chars,onKey,onSearch){var k=el('div','keyboard');chars.split('').forEach(function(c){append(k,button(c,function(){onKey(c);}));});['Razmak','⌫','Obriši'].forEach(function(c){append(k,button(c,function(){onKey(c);},'wide quiet'));});if(onSearch)append(k,button('Traži',onSearch,'wide primary'));return k;}
  function runSearch(query,container){
    var generation=++state.searchGeneration;container.textContent='';if(!query)return;
    append(container,el('p','loading','Tražim „'+query+'”…'));var jobs=[];
    state.addons.forEach(function(a){(a.manifest.catalogs||[]).forEach(function(c){var args=C.catalogArgs(c,query);if(args!==null&&C.supports(a.manifest,'catalog',c.type,c.id))jobs.push({addon:a,catalog:c,extra:args});});});
    if(!jobs.length){container.textContent='';append(container,textBlock('Nema dodatka za pretraživanje.',state.ready?'Provjeri dodatke u Postavkama.':'Katalozi se još učitavaju. Pokušaj ponovno za trenutak.'));return;}
    Promise.all(jobs.slice(0,24).map(function(row){return json(C.resourceURL(row.addon.url,'catalog',row.catalog.type,row.catalog.id,row.extra)).then(function(data){row.items=C.uniqueMetas(data.metas,row.addon.url).slice(0,50);return row;}).catch(function(){return {error:true};});})).then(function(rows){if(generation!==state.searchGeneration||!container.isConnected)return;container.textContent='';var total=0,failed=0;rows.forEach(function(row,i){if(row.error){failed++;return;}if(row.items.length){total+=row.items.length;append(container,shelf(row,'search-'+i));}});if(!total)append(container,textBlock('Nema rezultata za „'+query+'”.','Pokušaj kraći ili izvorni naziv.'));if(failed)append(container,el('p','note','Neki dodaci nisu odgovorili.'));mountShelves(container,false);M.reveal(container);});
  }
  function field(label,placeholder,value,type){var wrap=el('label','field');append(wrap,el('span','',label));var input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type||'text';input.value=value||'';input.placeholder=placeholder||'';input.autocomplete='off';input.spellcheck=false;append(wrap,input);return {node:wrap,input:input};}
  function inputKeyboard(input){var l=pushLayer('keyboard-layer','Unos adrese');var wrap=el('div','keyboard-dialog'),area=el('textarea');area.value=input.value;area.setAttribute('aria-label','Adresa');append(wrap,area);
    append(wrap,keyboard('abcdefghijklmnopqrstuvwxyz0123456789:/.-_?=&%+@',function(k){area.value=k==='⌫'?area.value.slice(0,-1):k==='Obriši'?'':area.value+(k==='Razmak'?' ':k);},null));
    append(wrap,button('Gotovo',function(){input.value=area.value;input.dispatchEvent(new Event('change',{bubbles:true}));popLayer();},'primary'));append(l.body,wrap);focus(wrap.querySelector('button'));
  }
  // Keep this screen concise: labels, values and actions; no standing tutorial or source badges.
  function renderSettings(screen){
    var content=el('div','page-content settings-page'),list=el('div','settings-list');append(content,el('h1','','Postavke'));
    function section(title){var node=el('section','settings-section'),body=el('div','settings-fields');append(node,el('h2','',title),body);append(list,node);return body;}
    function actions(body){var row=el('div','actions');append(body,row);return row;}
    function switchButton(label,value,change,id){var b=button(value(),function(){change();saveSettings();b.textContent=value();b.setAttribute('aria-pressed',String(!/^isključ/i.test(value())));},'toggle',id);b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(!/^isključ/i.test(value())));return b;}
    var auth=account.status(),accountBody=section('Račun');
    if(auth.connected){
      var syncStatus=el('p','note',syncLabel());syncStatus.id='account-sync-status';syncStatus.setAttribute('role','status');append(accountBody,el('p','account-email',auth.user.email),syncStatus);
      append(actions(accountBody),button('Sinkroniziraj',function(){var b=this;b.disabled=true;b.textContent='Sinkroniziram…';account.sync().catch(function(){}).then(function(){b.disabled=false;b.textContent='Sinkroniziraj';});},'quiet','account-sync'),button('Odjavi se',function(){
        var l=pushLayer('account-logout','Odjava');append(l.body,el('p','',account.status().pending?'Odjaviti se i odbaciti neposlane promjene?':'Odjaviti LUMU na ovom uređaju?'));
        append(l.body,button('Odustani',popLayer,'primary'),button('Odjavi se',function(){account.disconnect();popLayer();render();},'quiet','confirm-logout'));initialFocus(l.node);
      },'quiet','account-logout'));
    }else append(accountBody,button('Prijavi se',openLogin,'primary','settings-login'));
    var playbackSettings=section('Reprodukcija');
    function settingRow(body,label,control){var row=el('div','setting-inline');append(row,el('span','',label),control);append(body,row);}
    settingRow(playbackSettings,'Gledanje jednim klikom',switchButton('Gledanje jednim klikom',function(){return config.oneClick?'Uključeno':'Isključeno';},function(){config.oneClick=!config.oneClick;},'one-click'));
    var qualityButton=button(config.maxQuality===2160?'Do 4K':config.maxQuality+'p',function(){var values=[2160,1080,720];config.maxQuality=values[(values.indexOf(config.maxQuality)+1)%values.length];saveSettings();qualityButton.textContent=config.maxQuality===2160?'Do 4K':config.maxQuality+'p';},'quiet','quality-limit');settingRow(playbackSettings,'Kvaliteta',qualityButton);
    settingRow(playbackSettings,'Automatska sljedeća epizoda',switchButton('Automatska sljedeća epizoda',function(){return config.autoNext?'Uključeno':'Isključeno';},function(){config.autoNext=!config.autoNext;},'auto-next'));
    var delayButton=button(config.nextDelay+' s',function(){var delays=[5,10,15];config.nextDelay=delays[(delays.indexOf(config.nextDelay)+1)%delays.length];saveSettings();delayButton.textContent=config.nextDelay+' s';},'quiet','next-delay');settingRow(playbackSettings,'Odbrojavanje',delayButton);
    settingRow(playbackSettings,'Preskoči uvod',switchButton('Preskoči uvod · IntroDB',function(){return config.introDB?'Uključeno':'Isključeno';},function(){config.introDB=!config.introDB;},'skip-intro-setting'));
    var categorySettings=section('Kategorije');renderCategorySettings(categorySettings);
    var trailers=section('Automatski traileri');append(trailers,switchButton('Automatski traileri',function(){return config.autoTrailers?'Uključeni':'Isključeni';},function(){config.autoTrailers=!config.autoTrailers;stopPreviews();},'toggle-trailers'));
    var subtitles=section('Titlovi');append(subtitles,switchButton('Zadani titlovi',function(){return config.subtitleLanguage==='hr'?'Hrvatski':'Isključeni';},function(){config.subtitleLanguage=config.subtitleLanguage==='hr'?'off':'hr';},'subtitle-preference'));
    var addons=section('Dodaci'),addon=field('Adresa','https://…/manifest.json','','password');addon.input.dataset.focus='addon-url';append(addons,addon.node);
    append(actions(addons),button('Dodaj',function(){var url;try{url=C.manifestURL(addon.input.value);}catch(e){toast(e.message);return;}
      if(addonURLs().indexOf(url)>=0){toast('Dodatak je već povezan.');return;}if(!account.status().connected&&config.addons.length>=12){toast('Podržano je do 12 lokalnih dodataka.');return;}
      var b=this;b.disabled=true;b.textContent='Dodajem…';json(url).then(function(m){C.validateManifest(m);if(account.status().connected)return account.changeAddon(url,m,false);config.addons.push(url);saveSettings();loadCatalogs();}).then(function(){render();}).catch(function(e){b.disabled=false;b.textContent='Dodaj';toast(e.message);});
    },'primary','add-addon'),button('Tipkovnica',function(){inputKeyboard(addon.input);},'quiet'));
    addonURLs().forEach(function(url,i){var loaded=state.addons.filter(function(a){return a.url===url;})[0],descriptor=account.descriptors().find(function(d){return d.transportUrl===url;}),row=el('div','addon-item'),name=loaded?loaded.manifest.name:descriptor&&descriptor.manifest?descriptor.manifest.name:'Dodatak '+(i+1),remove=button('Ukloni',function(){confirmRemove(url);},'quiet','remove-addon-'+i);
      if(descriptor&&descriptor.flags&&descriptor.flags.protected){remove.disabled=true;remove.textContent='Službeni';}append(row,el('div','',name),remove);append(addons,row);
    });
    if(!auth.connected&&config.addons.indexOf(C.DEFAULT_ADDON)<0)append(addons,button('Dodaj zadani katalog',function(){if(config.addons.length>=12){toast('Podržano je do 12 dodataka.');return;}config.addons.push(C.DEFAULT_ADDON);saveSettings();loadCatalogs();render();},'quiet'));
    if(auth.unsupported.length)append(addons,el('p','note','Nepodržani dodaci: '+auth.unsupported.join(', ')));
    var serverBody=section('Server'),server=field('Adresa (neobavezno)','https://…/',config.server),serverResult=el('p','note');serverResult.setAttribute('role','status');append(serverBody,server.node);
    append(actions(serverBody),button('Spremi',function(){try{config.server=C.serverURL(server.input.value);saveSettings();toast('Spremljeno.');}catch(e){toast(e.message);}},'primary','save-server'),button('Provjeri vezu',function(){testServer(server.input.value,serverResult);},'quiet','test-server'),button('Tipkovnica',function(){inputKeyboard(server.input);},'quiet'));append(serverBody,serverResult);
    var torrentRow=el('div','setting-inline');append(torrentRow,el('span','','Torrenti preko servera · eksperimentalno'),switchButton('Torrenti preko servera',function(){return config.torrents?'Uključeni':'Isključeni';},function(){config.torrents=!config.torrents;},'toggle-torrents'));append(serverBody,torrentRow);
    var diagnostics=section('Dijagnostika'),v=document.createElement('video'),dl=el('dl','diagnostics');[['Verzija','LUMA 0.6.2'],['Preglednik',navigator.userAgent],['Rezolucija',window.innerWidth+' × '+window.innerHeight],['Spremanje',store.available()?'Dostupno':'Samo ova sesija'],['H.264 / AAC',v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')||'Nije prijavljeno'],['HLS',v.canPlayType('application/vnd.apple.mpegurl')||'Nije prijavljeno'],['HLS.js / MSE',window.Hls&&Hls.isSupported()?'Dostupno':'Nije dostupno'],['Veza',location.protocol==='https:'?'HTTPS':'HTTP']].forEach(function(pair){append(dl,el('dt','',pair[0]),el('dd','',pair[1]));});append(diagnostics,dl,button('Test slike i zvuka',function(){openStreams(sample,sample.id);},'quiet','sample-test'));
    var direct=section('Video putem poveznice'),videoURL=field('Adresa','https://…/video.mp4','','password');append(direct,videoURL.node);append(actions(direct),button('Pokreni',function(){var stream={url:videoURL.input.value,name:'Tvoj video'},plan=C.playbackPlan(stream,config,location.protocol);if(plan.error){toast(plan.error);return;}startPlayer(C.cleanMeta({id:'custom-direct',type:'movie',name:'Tvoj video'}),'custom-direct',stream,plan);},'primary','direct-play'),button('Tipkovnica',function(){inputKeyboard(videoURL.input);},'quiet'));
    var help=section('Pomoć');append(help,button('Upute',showHelp,'quiet','help'));if(state.errors.length)append(help,textBlock('Nedostupni dodaci',state.errors.map(function(e){return (e.url?hostName(e.url)+': ':'')+e.error;}).join(' '),'message error'));
    append(content,list);append(screen,content);
  }
  function confirmRemove(url){var cloud=account.status().connected,l=pushLayer('confirm','Ukloni dodatak');append(l.body,el('p','',cloud?'Ukloniti ovaj dodatak sa Stremio računa i svih povezanih uređaja?':'Ukloniti ovaj dodatak samo iz aplikacije LUMA?'),el('p','note',hostName(url)));append(l.body,button('Zadrži dodatak',popLayer,'primary'),button(cloud?'Ukloni sa Stremio računa':'Ukloni iz aplikacije LUMA',function(){var b=this;if(cloud){b.disabled=true;account.changeAddon(url,null,true).then(function(){popLayer();render();}).catch(function(e){b.disabled=false;toast(e.message);});return;}config.addons=config.addons.filter(function(u){return u!==url;});saveSettings();popLayer();loadCatalogs();render();},'red'));initialFocus(l.node);}
  function testServer(value,out){var url;try{url=C.serverURL(value);if(!url)throw new Error('Prvo unesi adresu servera.');if(location.protocol==='https:'&&/^http:/.test(url))throw new Error('HTTPS aplikacija traži HTTPS server s valjanim certifikatom.');}catch(e){out.textContent=e.message;return;}
    out.textContent='Provjeravam vezu…';json(url+'settings').then(function(data){out.textContent=data&&data.values&&typeof data.values==='object'?'Server je dostupan.':'Odgovor servera nije prepoznat.';}).catch(function(e){out.textContent=e.message+' Server mora dopuštati pristup s adrese ove aplikacije.';});
  }
  function showHelp(){var l=pushLayer('help','Kako radi LUMA');var copy=el('div','help-copy');var list=el('ol');[
    'Odaberi Prijavi se i potvrdi Stremio kod na mobitelu. Tvoji dodaci, biblioteka i nastavak gledanja preuzimaju se s računa.',
    'Dok si prijavljen, Moja lista i napredak šalju se Stremiju. Bez prijave ostaju lokalni. Ako veza ne radi, promjene čekaju sinkronizaciju; status vidiš u Postavkama.',
    'Izravni HTTP(S) video i HLS ovise o TV kodecima. Posebna zaglavlja i DRM nisu podržani. Automatski traileri prikazuju se u fokusiranoj kartici, preko ugrađenog YouTube playera ili izravnog videa.',
    'Ako server radi na M1 laptopu, njegovo gašenje prekida izvore koji ga trebaju. TV ne pokreće Stremio server unutar ove aplikacije.',
    'Za zasebnu ikonu potreban je stalni HTTPS hosting i kompatibilan postupak registracije. Sidee nema polje za proizvoljan URL; paket aplikacije sadrži zaseban pomoćni instalacijski alat.'
    ].forEach(function(t){append(list,el('li','',t));});append(copy,list,el('p','note','LUMA je neovisna aplikacija. Nije povezana s Netflixom, Stremiom ili Hisenseom.'));append(l.body,copy);}

  function startPlayer(meta,videoId,stream,plan,episode,playContext){
    var layer=pushLayer('player',meta.name);layer.node.textContent='';var node=layer.node,video=el('video');video.preload='metadata';video.setAttribute('playsinline','');video.playsInline=true;video.controls=false;video.muted=false;video.defaultMuted=false;try{video.volume=1;}catch(_){}
    // Direct video does not require CORS. HLS.js and external subtitles do.
    var top=el('div','player-top'),title=el('div');append(title,el('h2','',meta.name),el('p','',episode?(episode.title||episode.name||'Epizoda'):stream.name||'Video'));append(top,button('‹ Izvori',popLayer,'quiet','player-back'),title);
    var bottom=el('div','player-bottom'),track=el('div','play-track'),bar=el('i');append(track,bar);var times=el('div','play-times'),elapsed=el('span','','0:00'),duration=el('span','','0:00');append(times,elapsed,duration);
    var controls=el('div','player-controls'),status=el('div','player-status','Pripremam video…');status.setAttribute('role','status');
    var pause=button('Ⅱ Pauza',function(){togglePlay();},'primary','player-toggle'),back10=button('−10 s',function(){seek(-10);},'quiet','player-rewind'),forward10=button('+10 s',function(){seek(10);},'quiet','player-forward');
    var subs=button('Titlovi',function(){subtitleMenu.hidden=!subtitleMenu.hidden;if(!subtitleMenu.hidden){M.enter(subtitleMenu,{y:10,duration:.22});initialFocus(subtitleMenu);}},'quiet','player-subtitles');
    append(controls,pause,back10,forward10,el('span','spacer'),subs,button('Od početka',function(){video.currentTime=0;play();},'quiet','player-restart'));
    var next=E.nextEpisode(meta,videoId);
    if(next)append(controls,button('Sljedeća epizoda',function(){goNext();},'quiet','player-next'));
    append(bottom,track,times,controls);var subtitleMenu=el('div','player-subtitles');subtitleMenu.hidden=true;append(node,video,top,status,bottom,subtitleMenu);
    var skipIntro=button('Preskoči uvod',function(){if(!introSegment)return;try{video.currentTime=introSegment.end;updateIntro();saveProgress(true);}catch(_){toast('Preskakanje trenutačno nije dostupno.');}},'skip-intro quiet','player-skip-intro');skipIntro.hidden=true;
    var nextPanel=el('div','next-episode-panel'),nextLabel=el('h3'),nextActions=el('div','actions'),nextCancel=button('Otkaži',function(){cancelNext();showControls();},'quiet','next-cancel');nextPanel.hidden=true;nextPanel.setAttribute('role','dialog');nextPanel.setAttribute('aria-label','Sljedeća epizoda');append(nextActions,button('Pokreni',function(){goNext();},'primary','next-now'),nextCancel);append(nextPanel,nextLabel,nextActions);append(node,skipIntro,nextPanel);
    var introSegment=null,nextTimer=null,nextDeadline=0,sourceRemembered=false,switchingSource=false;
    var hls=null,closed=false,started=false,lastSaved=0,resumed=false,completionSaved=false,loadingTimer,hideTimer,subtitleController=null;
    var authAtStart=account.status(),cloudItem=authAtStart.connected&&account.item(meta.id),cloudState=cloudItem&&cloudItem.state||{},watchedSeconds=0,lastVideoTime=null;
    var baseTimeWatched=cloudState.video_id===videoId?(Number(cloudState.timeWatched)||0)/1000:0,baseOverall=(Number(cloudState.overallTimeWatched)||0)/1000;
    var player={video:video,node:node,show:showControls,toggle:togglePlay,seek:seek,subtitles:subtitleMenu,nextPanel:nextPanel,cancelNext:cancelNext};state.player=player;
    function showControls(){node.classList.remove('idle');if(subtitleController)subtitleController.setControlsVisible(true);clearTimeout(hideTimer);if(!video.paused&&!video.ended)hideTimer=setTimeout(function(){if(subtitleMenu.hidden){node.classList.add('idle');if(subtitleController)subtitleController.setControlsVisible(false);}},5500);}
    function play(){if(closed)return;var p=video.play();if(p&&p.catch)p.catch(function(error){if(closed||video.error||error&&error.name==='AbortError')return;if(error&&error.name==='NotAllowedError'){status.textContent='Pritisni Reproduciraj za pokretanje videa.';pause.textContent='▶ Reproduciraj';showControls();}else fail('Video se ne može pokrenuti. Provjeri format i dostupnost izvora.');});}
    function togglePlay(){if(video.paused)play();else video.pause();showControls();}
    function seek(amount){try{if(video.seekable.length){var lo=video.seekable.start(0),hi=video.seekable.end(video.seekable.length-1);video.currentTime=Math.max(lo,Math.min(hi-.1,video.currentTime+amount));}else if(isFinite(video.duration))video.currentTime=Math.max(0,Math.min(video.duration-.1,video.currentTime+amount));else toast('Ovaj izvor još ne dopušta premotavanje.');}catch(_){toast('Premotavanje nije dostupno za ovaj izvor.');}showControls();}
    function saveProgress(force){if(closed||!started||videoId==='custom-direct'||authAtStart.connected&&meta._sample||video.ended&&completionSaved)return;var now=Date.now();if(!force&&now-lastSaved<10000)return;lastSaved=now;if(video.ended)completionSaved=true;
      if(authAtStart.connected&&!meta._sample){var current=account.status();if(!current.connected||current.user.id!==authAtStart.user.id)return;
        var nextId=next&&next.season!==0&&(!next.released||Date.parse(next.released)<=now)?next.id:null;
        account.recordProgress(meta,videoId,{time:video.currentTime,duration:isFinite(video.duration)?video.duration:0,timeWatched:baseTimeWatched+watchedSeconds,overallTimeWatched:baseOverall+watchedSeconds,finished:video.ended,nextId:nextId});
        if(force||now-lastCloudPush>30000){lastCloudPush=now;account.flush().catch(function(){});}return;
      }
      history[meta.type+':'+videoId]={time:video.ended?0:video.currentTime,duration:isFinite(video.duration)?video.duration:0,at:now,meta:C.cleanMeta(meta),videoId:videoId};
      var keys=Object.keys(history).sort(function(a,b){return history[b].at-history[a].at;});keys.slice(150).forEach(function(k){delete history[k];});store.write('history',history);
    }
    function bufferTimeout(){clearTimeout(loadingTimer);loadingTimer=setTimeout(function(){if(!closed){fail('Video ne napreduje. Odaberi drugi izvor.');}},20000);}
    function fail(message){if(closed)return;clearTimeout(loadingTimer);if(!started&&tryNextSource())return;status.textContent=message;showControls();}
    function tryNextSource(){if(closed||switchingSource||!playContext||!playContext.automatic||playContext.attempt>=3||state.layers[state.layers.length-1]!==layer)return false;playContext.failed[plan.url]=true;var other=playContext.candidates.find(function(entry){return !playContext.failed[entry.plan.url];});if(!other)return false;switchingSource=true;var context=Object.assign({},playContext,{entry:other,attempt:playContext.attempt+1});popLayer();startPlayer(meta,videoId,other.stream,other.plan,episode,context);return true;}
    function cancelNext(restore){clearInterval(nextTimer);nextTimer=null;nextPanel.hidden=true;if(restore!==false&&nextPanel.contains(document.activeElement))focus(pause);}
    function goNext(automatic){if(closed||!next||state.layers[state.layers.length-1]!==layer)return;cancelNext(false);closeToDetail();openStreams(meta,next.id,next,automatic===true||config.oneClick);}
    function beginNext(){if(!next||!config.autoNext||document.hidden||closed)return;cancelNext(false);nextDeadline=Date.now()+config.nextDelay*1000;subtitleMenu.hidden=true;nextPanel.hidden=false;M.enter(nextPanel,{y:12,duration:.24});focus(nextCancel);function tick(){if(closed||document.hidden){cancelNext(false);return;}var seconds=Math.max(0,Math.ceil((nextDeadline-Date.now())/1000));nextLabel.textContent='Sljedeća epizoda za '+seconds+' s';if(!seconds)goNext(true);}tick();nextTimer=setInterval(tick,250);}
    function updateIntro(){var show=!!(introSegment&&!closed&&isFinite(video.duration)&&introSegment.end<video.duration&&video.currentTime>=introSegment.start&&video.currentTime<introSegment.end&&!video.ended);if(skipIntro.hidden===!show)return;skipIntro.hidden=!show;if(show){M.enter(skipIntro,{y:8,duration:.2});if(node.classList.contains('idle')&&subtitleMenu.hidden)focus(skipIntro);}else if(document.activeElement===skipIntro)focus(pause);}
    if(config.introDB&&meta.type==='series'){var currentEpisode=episode||meta.videos.find(function(e){return e.id===videoId;});segments.resolve(meta,currentEpisode).then(function(segment){if(closed)return;introSegment=segment;updateIntro();});}
    function updateSubtitleMenu(view){
      var old=document.activeElement,oldKey=old&&old.dataset.focus;subtitleMenu.textContent='';
      append(subtitleMenu,el('h3','','Titlovi'));
      function option(label,id,pressed){var b=button(label,function(){subtitleController.select(id);subtitleMenu.hidden=true;focus(subs);showControls();},'quiet','subtitle-'+id);b.setAttribute('aria-pressed',String(pressed));append(subtitleMenu,b);}
      option('Automatski · hrvatski','auto',view.automatic);option('Isključeni','off',view.off);
      view.choices.forEach(function(t){option(t.label+(t.failed?' · pokušaj opet':''),t.id,!view.automatic&&view.selected===t.id);});
      var message=view.loading?'Tražim i učitavam titlove…':view.error||(!view.choices.some(function(t){return t.croatian;})?'Hrvatski titlovi nisu pronađeni za ovaj izvor.':'');
      if(view.failedProviders&&!view.loading)message+=(message?' ':'')+'Neki dodaci nisu odgovorili.';
      if(message)append(subtitleMenu,el('p','subtitle-note',message));
      subs.textContent=view.selected?(view.choices.find(function(t){return t.id===view.selected&&t.croatian;})?'Titlovi · HR':'Titlovi · uključeni'):'Titlovi';
      if(!subtitleMenu.hidden&&subtitleMenu.contains(old)===false){var restored=oldKey&&subtitleMenu.querySelector('[data-focus="'+oldKey+'"]');focus(restored||subtitleMenu.querySelector('button'));}
    }
    subtitleController=window.LumaSubtitles.create({video:video,preferred:config.subtitleLanguage,protocol:location.protocol,onChange:updateSubtitleMenu});
    subtitleController.add(stream.subtitles,'Izvor');
    var subtitleJobs=meta._sample||videoId==='custom-direct'?[]:state.addons.filter(function(a){return C.supports(a.manifest,'subtitles',meta.type,videoId);}).map(function(a){
      return json(C.resourceURL(a.url,'subtitles',meta.type,videoId,window.LumaSubtitles.extras(stream))).then(function(data){return {items:data.subtitles,provider:a.manifest.name};});
    });
    subtitleController.providers(subtitleJobs);
    function ensureAudioTrack(){if(closed)return;var tracks=video.audioTracks;if(!tracks||!tracks.length)return;for(var i=0;i<tracks.length;i++)if(tracks[i].enabled)return;try{tracks[0].enabled=true;}catch(_){}}
    if(video.audioTracks&&video.audioTracks.addEventListener)video.audioTracks.addEventListener('addtrack',ensureAudioTrack);
    video.addEventListener('loadedmetadata',function(){ensureAudioTrack();updateIntro();duration.textContent=isFinite(video.duration)?C.formatTime(video.duration):'Uživo';if(!resumed){resumed=true;var saved=history[meta.type+':'+videoId],point=playContext&&playContext.fromStart?0:C.resumePoint(saved,video.duration);if(point)try{video.currentTime=point;}catch(_){} }});
    video.addEventListener('seeking',function(){lastVideoTime=null;});
    video.addEventListener('timeupdate',function(){var current=video.currentTime;if(!video.seeking&&lastVideoTime!=null){var delta=current-lastVideoTime;if(delta>0&&delta<3)watchedSeconds+=delta;}lastVideoTime=video.seeking?null:current;elapsed.textContent=C.formatTime(current);bar.style.width=(isFinite(video.duration)&&video.duration?Math.min(100,current/video.duration*100):0)+'%';if(!video.paused&&current>0){status.textContent='';clearTimeout(loadingTimer);}updateIntro();saveProgress(false);});
    video.addEventListener('playing',function(){cancelNext(false);if(!sourceRemembered&&playContext&&!playContext.automatic&&playContext.entry){experience.rememberAddon(playContext.entry.addon);sourceRemembered=true;}started=true;completionSaved=false;status.textContent='';clearTimeout(loadingTimer);pause.textContent='Ⅱ Pauza';showControls();});
    video.addEventListener('pause',function(){pause.textContent='▶ Reproduciraj';saveProgress(true);showControls();});
    video.addEventListener('waiting',function(){status.textContent='Učitavam video…';bufferTimeout();});
    video.addEventListener('stalled',bufferTimeout);
    video.addEventListener('ended',function(){saveProgress(true);status.textContent=next?'':'Video je završio.';showControls();beginNext();});
    video.addEventListener('error',function(){var code=video.error&&video.error.code;fail(code===3?'TV ne može dekodirati ovaj video ili zvuk. Odaberi drugi izvor.':code===4?'Format ili adresa nisu podržani. Pokušaj MP4 s H.264/AAC ili kompatibilni HLS.':'Video se ne može učitati (mreža ili izvor). Provjeri vezu i pokušaj drugi izvor.');});
    node.addEventListener('mousemove',showControls);node.addEventListener('click',showControls);
    layer.cleanup=function(){saveProgress(true);closed=true;cancelNext(false);clearTimeout(loadingTimer);clearTimeout(hideTimer);if(video.audioTracks&&video.audioTracks.removeEventListener)video.audioTracks.removeEventListener('addtrack',ensureAudioTrack);if(subtitleController)subtitleController.destroy();if(hls)hls.destroy();video.pause();video.removeAttribute('src');video.load();state.player=null;};
    bufferTimeout();focus(pause);
    if(plan.hls&&!video.canPlayType('application/vnd.apple.mpegurl')){
      if(window.Hls&&Hls.isSupported()){hls=new Hls({maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:20,capLevelToPlayerSize:true,enableWorker:true});subtitleController.setHls(hls);hls.attachMedia(video);hls.on(Hls.Events.MEDIA_ATTACHED,function(){hls.loadSource(plan.url);});hls.on(Hls.Events.MANIFEST_PARSED,play);hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED,subtitleController.refresh);hls.on(Hls.Events.ERROR,function(_,data){if(data.fatal)fail('HLS reprodukcija nije uspjela. Provjeri izvor, format i CORS dopuštenja.');});}
      else fail('Ovaj preglednik ne prijavljuje podršku za HLS ni MediaSource. Pokušaj izravni MP4.');
    } else {video.src=plan.url;play();}
  }
  function back(){
    if(state.player&&state.player.nextPanel&&!state.player.nextPanel.hidden){state.player.cancelNext();state.player.show();return;}
    if(state.player&&!state.player.subtitles.hidden){state.player.subtitles.hidden=true;focus(state.player.node.querySelector('[data-focus="player-subtitles"]'));return;}
    if(state.layers.length){popLayer();return;}
    if(state.page!=='home'){setPage('home');return;}
    toast('Već si na početnoj stranici. Za izlaz pritisni Home na daljinskom.');
  }
  document.addEventListener('keydown',function(e){
    var code=e.keyCode||e.which,editing=/^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if([27,461,10009].indexOf(code)>=0||code===8&&!editing){e.preventDefault();e.stopPropagation();back();return;}
    var trailerLayer=state.layers[state.layers.length-1],trailerHandle=trailerLayer&&trailerLayer.trailer&&trailerLayer.trailer();if(trailerHandle&&[415,19,179,10252,413].indexOf(code)>=0){e.preventDefault();if(code===413)popLayer();else if(code===415)trailerHandle.play();else if(code===19)trailerHandle.pause();else trailerHandle.toggle();return;}
    var previewHandle=cardTrailer||heroTrailer;if(previewHandle&&[415,19,179,10252,413].indexOf(code)>=0){e.preventDefault();if(code===413)stopPreviews();else if(code===415)previewHandle.play();else if(code===19)previewHandle.pause();else previewHandle.toggle();return;}
    if(state.player){state.player.show();if([415,19,179,10252,413].indexOf(code)>=0){e.preventDefault();if(code===413)popLayer();else if(code===415){var promise=state.player.video.play();if(promise&&promise.catch)promise.catch(function(){toast('Pritisni Reproduciraj u playeru.');});}else if(code===19)state.player.video.pause();else state.player.toggle();return;}if(code===412||code===417){e.preventDefault();state.player.seek(code===412?-30:30);return;}}
    if([37,38,39,40].indexOf(code)>=0){if(editing&&(code===37||code===39))return;e.preventDefault();navigate({37:'left',38:'up',39:'right',40:'down'}[code]);return;}
    if(code===9){var nodes=focusable(),i=nodes.indexOf(document.activeElement);if(nodes.length){e.preventDefault();focus(nodes[(i+(e.shiftKey?-1:1)+nodes.length)%nodes.length]);}return;}
    if((code===13||code===32)&&!editing){e.preventDefault();var focused=document.activeElement;if(focused&&focused.id==='hero'&&state.hero){if(heroTrailerBlocked&&heroTrailer)heroTrailer.play();else openDetails(state.hero,true);}else if(focused&&focused.tagName==='BUTTON')focused.click();}
  },true);
  document.addEventListener('focusin',function(e){if(e.target.closest('.card-slot')){stopHeroTrailer();return;}stopCardTrailer();var hero=document.getElementById('hero');if(hero&&hero.contains(e.target))queueHeroTrailer();else stopHeroTrailer();if(discoveryPending)refreshDiscovery();});
  document.addEventListener('scroll',function(){if(cardTrailerKey&&!cardPreviewVisible())stopCardTrailer();if(heroTrailer&&!heroVisible())stopHeroTrailer();else if(!heroTrailerKey&&state.hero&&heroTrailerAllowed(state.hero))queueHeroTrailer();},true);
  window.addEventListener('resize',function(){if(cardTrailerKey&&!cardPreviewVisible())stopCardTrailer();if(heroTrailer&&!heroVisible())stopHeroTrailer();else if(!heroTrailerKey&&state.hero&&heroTrailerAllowed(state.hero))queueHeroTrailer();});
  document.addEventListener('visibilitychange',function(){if(document.hidden){stopPreviews();var layer=state.layers[state.layers.length-1],trailer=layer&&layer.trailer&&layer.trailer();if(trailer)trailer.pause();}if(document.hidden&&state.player){state.player.cancelNext(false);state.player.video.pause();}else if(!document.hidden&&account.status().connected&&!state.player)syncAccount();});
  window.addEventListener('pagehide',stopPreviews);
  window.addEventListener('offline',function(){toast('Mrežna veza je prekinuta. Provjeri vezu televizora.');});
  window.addEventListener('online',function(){toast('Mrežna veza je ponovno dostupna.');if(account.status().connected)syncAccount();});
  setInterval(function(){if(account.status().connected&&!document.hidden&&!state.player)syncAccount();},60000);
  render();loadCatalogs();if(account.status().connected)syncAccount();if(!store.available())warnStorage();
}());
