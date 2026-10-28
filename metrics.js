/* Local, bounded observations. No identifiers, URLs, storage or telemetry uploads. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaMetrics=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function create(env){var perf=env.performance,origin=Date.now(),starts=Object.create(null),marks=Object.create(null),inputs=[],pending=false,lastInput=-Infinity;function now(){return perf&&typeof perf.now==='function'?perf.now():Date.now()-origin;}
    function start(name){starts[name]=now();}
    function end(name){if(starts[name]==null)return;marks[name]=Math.max(0,now()-starts[name]);delete starts[name];}
    function input(stamp){var at=now();if(pending||env.document.hidden||at-lastInput<100||!env.requestAnimationFrame)return;lastInput=at;pending=true;var from=typeof stamp==='number'&&stamp>=0&&at-stamp>=0&&at-stamp<3000?stamp:at;env.requestAnimationFrame(function(){pending=false;if(env.document.hidden)return;inputs.push(Math.max(0,now()-from));if(inputs.length>60)inputs.shift();});}
    function stats(){var sorted=inputs.slice().sort(function(a,b){return a-b;}),memory=perf&&perf.memory,heap=memory&&Number(memory.usedJSHeapSize);return {catalog:marks.catalog==null?null:Math.round(marks.catalog),freshCatalog:marks.freshCatalog==null?null:Math.round(marks.freshCatalog),sources:marks.sources==null?null:Math.round(marks.sources),selection:marks.selection==null?null:Math.round(marks.selection),video:marks.video==null?null:Math.round(marks.video),inputP95:sorted.length?Math.round(sorted[Math.ceil(sorted.length*.95)-1]):null,inputSamples:inputs.length,heapMB:heap>0?Math.round(heap/1048576):null};}
    return {start:start,end:end,input:input,markOnce:function(name){if(marks[name]==null)marks[name]=now();},stats:stats};
  }
  return {create:create};
}));
