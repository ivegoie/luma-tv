/* Partial addon replies: bounded automatic selection, stable playback after a choice. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaSources=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function create(options){var results=[],done=Object.create(null),remaining=options.count,timer=null,chosen=false,closed=false,set=options.setTimeout||setTimeout,clear=options.clearTimeout||clearTimeout;
    function values(){return results.filter(Boolean);}
    function commit(){chosen=true;clear(timer);timer=null;}
    function choose(){timer=null;if(closed||chosen||!options.automatic||!options.allowed())return;var candidates=options.rank(values());if(!candidates.length)return;commit();options.select(candidates[0],candidates);}
    function accept(index,result){if(closed||done[index])return;done[index]=true;remaining--;results[index]=result;var current=values();options.update(current,remaining===0);if(chosen||!options.automatic)return;if(!remaining){clear(timer);choose();}else if(timer==null&&options.rank(current).length)timer=set(choose,options.delay==null?3000:options.delay);}
    return {add:function(count){if(!closed)remaining+=Math.max(0,Number(count)||0);},accept:accept,commit:commit,results:values,pending:function(){return remaining;},destroy:function(){closed=true;clear(timer);timer=null;}};
  }
  return {create:create};
}));
