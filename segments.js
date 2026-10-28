/* Read-only IntroDB integration. Only IMDb ID, season and episode leave the device. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaSegments=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function identity(meta,episode){var id=String(meta.id||''),match=id.match(/^(tt\d{5,12})(?::|$)/);if(!match||meta.type!=='series'||!episode)return null;var season=Number(episode.season),number=Number(episode.episode);if(!Number.isInteger(season)||season<0||!Number.isInteger(number)||number<1)return null;return {imdb:match[1],season:season,episode:number};}
  function parse(data,requested){if(!data||data.imdb_id!==requested.imdb||Number(data.season)!==requested.season||Number(data.episode)!==requested.episode||data.no_intro||!data.intro)return null;var intro=data.intro,start=typeof intro.start_ms==='number'?intro.start_ms/1000:typeof intro.start_sec==='number'?intro.start_sec:NaN,end=typeof intro.end_ms==='number'?intro.end_ms/1000:typeof intro.end_sec==='number'?intro.end_sec:NaN;if(!isFinite(start)||!isFinite(end)||start<0||end<=start||end-start<5||end-start>300)return null;if(typeof intro.confidence==='number'&&(intro.confidence<.6||intro.confidence>1))return null;return {start:start,end:end};}
  function create(options){var pending=Object.create(null),cache=options.store.read('introdb-cache',{});if(!cache||typeof cache!=='object'||Array.isArray(cache))cache={};
    function resolve(meta,episode){var requested=identity(meta,episode);if(!requested)return Promise.resolve(null);var key=requested.imdb+':'+requested.season+':'+requested.episode,cached=cache[key];if(cached&&cached.expires>Date.now())return Promise.resolve(cached.segment);if(pending[key])return pending[key];var url='https://api.introdb.app/segments?imdb_id='+encodeURIComponent(requested.imdb)+'&season='+requested.season+'&episode='+requested.episode;
      var result=options.json(url).then(function(data){return parse(data,requested);},function(){return null;}).then(function(segment){delete pending[key];cache[key]={segment:segment,expires:Date.now()+(segment?43200000:1800000)};Object.keys(cache).sort(function(a,b){return cache[b].expires-cache[a].expires;}).slice(80).forEach(function(k){delete cache[k];});options.store.write('introdb-cache',cache);return segment;});pending[key]=result;return result;
    }
    return {resolve:resolve};
  }
  return {identity:identity,parse:parse,create:create};
}));
