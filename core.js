/* Portable catalogue, playback and metadata logic. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LumaCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DEFAULT_ADDON = 'https://v3-cinemeta.strem.io/manifest.json';
  function httpURL(value) {
    var u;
    try { u = new URL(String(value || '').trim()); } catch (_) { throw new Error('Upiši punu adresu koja počinje s https://.'); }
    if (!/^https?:$/.test(u.protocol) || !u.hostname || u.username || u.password) throw new Error('Dozvoljene su HTTP(S) adrese bez korisničkog imena i lozinke.');
    u.hash = '';
    return u;
  }
  function manifestURL(value) {
    var u = httpURL(String(value || '').trim().replace(/^stremio:\/\//i, 'https://'));
    if (!/\/manifest\.json$/.test(u.pathname)) throw new Error('Zalijepi adresu dodatka koja završava s /manifest.json.');
    return u.href;
  }
  function serverURL(value) {
    if (!String(value || '').trim()) return '';
    var u = httpURL(value), host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (/^(localhost|0\.0\.0\.0|127\.|::1$)/.test(host) || /\.localhost$/.test(host)) throw new Error('localhost na televizoru znači televizor. Unesi mrežnu adresu servera.');
    if (u.search) throw new Error('Adresa servera treba biti osnovna HTTP(S) adresa bez upita.');
    u.pathname = u.pathname.replace(/\/+$/, '') + '/';
    return u.href;
  }
  function resourceURL(manifest, resource, type, id, extra) {
    var u = httpURL(manifestURL(manifest));
    var tail = [resource, type, id].map(function (x) { return encodeURIComponent(x); }).join('/');
    var args = Object.keys(extra || {}).sort().map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]); });
    if (args.length) tail += '/' + args.join('&');
    // Assign the complete URL string: URL.pathname would double-encode some TV engines.
    return u.origin + u.pathname.replace(/manifest\.json$/, '') + tail + '.json' + u.search;
  }
  function supports(manifest, resource, type, id) {
    return (manifest.resources || []).some(function (r) {
      if ((typeof r === 'string' ? r : r.name) !== resource) return false;
      if (resource === 'catalog') return true;
      var types = typeof r === 'string' ? manifest.types : r.types;
      var prefixes = typeof r === 'string' ? manifest.idPrefixes : r.idPrefixes;
      return (!types || types.indexOf(type) !== -1) && (!prefixes || prefixes.some(function (p) { return String(id).indexOf(p) === 0; }));
    });
  }
  function extras(c) {
    if (Array.isArray(c.extra)) return c.extra;
    return (c.extraSupported || []).map(function (name) { return {name:name, isRequired:(c.extraRequired || []).indexOf(name) !== -1}; });
  }
  function catalogArgs(c, search) {
    var out = {}, fields = extras(c), invalid = false;
    if (search && !fields.some(function (e) { return e.name === 'search'; })) return null;
    fields.forEach(function (e) {
      if (e.name === 'search' && search) out.search = search;
      else if (e.isRequired) {
        if (e.name === 'genre' && e.options && e.options.length) out.genre = e.options[0];
        else invalid = true;
      }
    });
    return invalid ? null : out;
  }
  function validateManifest(m) {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !Array.isArray(m.resources) || !Array.isArray(m.types)) throw new Error('Dodatak nije vratio valjan Stremio manifest.');
    return m;
  }
  function safeImage(value) {
    try { return httpURL(value).href; } catch (_) { return ''; }
  }
  function youtubeId(value) {
    if(typeof value!=='string')return '';
    if(/^[a-zA-Z0-9_-]{11}$/.test(value))return value;
    try {var u=httpURL(value),host=u.hostname.toLowerCase(),id='';
      if(host==='youtu.be')id=u.pathname.slice(1);
      else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].indexOf(host)>=0){
        if(u.pathname==='/watch')id=u.searchParams.get('v');else if(/^\/(embed|shorts)\//.test(u.pathname))id=u.pathname.split('/')[2];
      }return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:'';
    }catch(_){return '';}
  }
  function trailerSources(meta) {
    var seen=Object.create(null),out=[];
    [].concat(meta&&Array.isArray(meta.trailerStreams)?meta.trailerStreams:[],meta&&Array.isArray(meta.trailers)?meta.trailers:[]).slice(0,60).forEach(function(t){
      if(!t||typeof t!=='object'||t.drm||t.licenseUrl||t.behaviorHints&&t.behaviorHints.proxyHeaders)return;
      var id=youtubeId(t.ytId||t.source||t.externalUrl||t.url),item;
      if(id)item={kind:'youtube',ytId:id,title:String(t.title||t.name||'Trailer').slice(0,160)};
      else if(t.url){try{var u=httpURL(t.url);if(/(^|\.)youtube(?:-nocookie)?\.com$|(^|\.)youtu\.be$/.test(u.hostname))return;item={kind:'video',url:u.href,mimeType:String(t.mimeType||'').slice(0,100),title:String(t.title||t.name||'Trailer').slice(0,160)};}catch(_){}}
      if(!item)return;var k=item.ytId||item.url;if(seen[k])return;seen[k]=true;out.push(item);
    });return out.filter(function(t){return t.kind==='video';}).concat(out.filter(function(t){return t.kind==='youtube';})).slice(0,12);
  }
  function cleanMeta(m, source) {
    if (!m || typeof m.id !== 'string' || typeof m.type !== 'string' || typeof m.name !== 'string') return null;
    return {
      id:m.id.slice(0,500), type:m.type.slice(0,60), name:m.name.slice(0,300),
      description:String(m.description || '').slice(0,7000), poster:safeImage(m.poster), background:safeImage(m.background),
      releaseInfo:String(m.releaseInfo || '').slice(0,80), imdbRating:String(m.imdbRating || '').slice(0,12),
      runtime:String(m.runtime || '').slice(0,80), language:String(m.language || '').slice(0,120), originalLanguage:String(m.originalLanguage || m.original_language || '').slice(0,60), genres:Array.isArray(m.genres) ? m.genres.slice(0,5).map(String) : [],
      trailers:trailerSources(m),
      posterShape:['poster','landscape','square'].indexOf(m.posterShape)>=0?m.posterShape:'poster',
      behaviorHints:m.behaviorHints&&typeof m.behaviorHints==='object'?JSON.parse(JSON.stringify(m.behaviorHints)):{},
      videos:Array.isArray(m.videos) ? m.videos.filter(function(v){return v && typeof v.id==='string';}).slice(0,3000) : [],
      _source:source || m._source || '', _sample:!!m._sample
    };
  }
  function key(meta) { return meta.type + ':' + meta.id; }
  function uniqueMetas(items, source) {
    var seen = Object.create(null);
    return (Array.isArray(items) ? items : []).map(function(m){ return cleanMeta(m, source); }).filter(function(m){
      if (!m || seen[key(m)]) return false; seen[key(m)] = true; return true;
    });
  }
  function playbackPlan(stream, settings, pageProtocol) {
    settings = settings || {};
    if (!stream || typeof stream !== 'object') return {error:'Nevaljan izvor.'};
    var url, kind = 'direct';
    if (stream.behaviorHints && stream.behaviorHints.proxyHeaders) return {error:'Ovaj izvor traži posebna HTTP zaglavlja. LUMA ih u ovoj verziji ne prosljeđuje.'};
    if (stream.drm || stream.licenseUrl) return {error:'Ovaj izvor traži DRM integraciju koja nije podržana.'};
    if (stream.url) {
      try { url = httpURL(stream.url).href; } catch (_) { return {error:'Ovaj protokol nije podržan. Odaberi HTTP(S) video ili HLS.'}; }
    } else if (stream.infoHash) {
      if (!settings.server || !settings.torrents) return {error:'Ovo je običan torrent, nije izravna videoveza. Za gledanje bez laptopa odaberi TorBox ili drugi izravni izvor.',reason:'torrent-needs-service'};
      if (!/^[0-9a-f]{40}$/i.test(stream.infoHash)) return {error:'Nevaljan torrent identifikator.'};
      if (stream.fileIdx != null && (!Number.isInteger(stream.fileIdx) || stream.fileIdx < 0 || stream.fileIdx > 65535)) return {error:'Nevaljan indeks video datoteke.'};
      try { url = serverURL(settings.server) + stream.infoHash.toLowerCase() + '/' + (stream.fileIdx == null ? '-1' : stream.fileIdx); }
      catch(e) { return {error:e.message}; }
      var sources = (Array.isArray(stream.sources) ? stream.sources : []).filter(function(x){return typeof x === 'string' && /^(tracker:|dht:)/.test(x);}).slice(0,30);
      if (sources.length) url += '?' + sources.map(function(s){return 'tr=' + encodeURIComponent(s);}).join('&');
      kind = 'torrent';
    } else if (stream.ytId) return {error:'Otvori trailer tipkom Trailer. YouTube nije izravni izvor za ovaj filmski player.'};
    else if (stream.externalUrl) return {error:'Ovo je poveznica na drugu aplikaciju, nije izravni video. Otvori je u izvornom servisu.'};
    else return {error:'Ovaj tip izvora nije podržan u ovoj verziji.'};
    if (pageProtocol === 'https:' && /^http:/.test(url)) return {error:'Ova HTTPS aplikacija ne može sigurno otvoriti HTTP izvor. Potreban je HTTPS izvor/server s valjanim certifikatom.'};
    return {url:url, kind:kind, hls:/\.m3u8(?:[?#]|$)/i.test(url) || /mpegurl/i.test(stream.mimeType || ''),
      warning:kind==='torrent' ? 'Eksperimentalno: server daje datoteku, bez automatskog pretvaranja formata.' : (stream.behaviorHints && stream.behaviorHints.notWebReady ? 'Dodatak označava ovaj izvor kao nepripremljen za web. Reprodukcija može ne uspjeti.' : '')};
  }
  function planSources(results,settings,pageProtocol) {
    var available=[],unavailable=[],failed=[],order=0;
    (Array.isArray(results)?results:[]).forEach(function(result){
      if(!result||typeof result!=='object')return;
      if(result.error){failed.push({addon:result.addon,error:result.error});return;}
      (Array.isArray(result.streams)?result.streams:[]).forEach(function(stream){
        if(!stream||typeof stream!=='object'||Array.isArray(stream))return;
        var entry={addon:result.addon,stream:stream,plan:playbackPlan(stream,settings,pageProtocol),order:order++};
        (entry.plan.error?unavailable:available).push(entry);
      });
    });
    available.sort(function(a,b){return Number(a.plan.kind==='torrent')-Number(b.plan.kind==='torrent')||a.order-b.order;});
    return {available:available,unavailable:unavailable,failed:failed};
  }
  function storageAdapter(storage) {
    var memory = {}, available = true;
    try { storage.setItem('luma-tv:probe','1'); storage.removeItem('luma-tv:probe'); } catch (_) { available = false; }
    return {
      available:function(){return available;},
      read:function(k, fallback){try { var value = available ? storage.getItem('luma-tv:v1:'+k) : memory[k]; return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }},
      write:function(k,v){var raw=JSON.stringify(v); memory[k]=raw; try { if(available)storage.setItem('luma-tv:v1:'+k,raw); } catch (_) {available=false;}}
    };
  }
  function resumePoint(progress, duration) {
    if (!progress || !isFinite(progress.time) || progress.time < 10) return 0;
    if (isFinite(duration) && duration > 0 && progress.time > duration - Math.min(30,duration*0.1)) return 0;
    return progress.time;
  }
  function formatTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    s=Math.floor(s);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);
  }
  return {DEFAULT_ADDON:DEFAULT_ADDON,httpURL:httpURL,manifestURL:manifestURL,serverURL:serverURL,resourceURL:resourceURL,supports:supports,extras:extras,catalogArgs:catalogArgs,validateManifest:validateManifest,cleanMeta:cleanMeta,youtubeId:youtubeId,trailerSources:trailerSources,uniqueMetas:uniqueMetas,key:key,safeImage:safeImage,playbackPlan:playbackPlan,planSources:planSources,storageAdapter:storageAdapter,resumePoint:resumePoint,formatTime:formatTime};
}));
