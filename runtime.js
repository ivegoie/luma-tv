/* Optional libraries: loaded only by the feature that needs them. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LumaRuntime=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var loads=new WeakMap(),definitions={compression:{path:'vendor/pako-2.1.0.min.js',global:'pako'},motion:{path:'vendor/gsap-3.13.0.min.js',global:'gsap'}};
  function load(name,options){options=options||{};var env=options.environment||(typeof window!=='undefined'?window:null),definition=definitions[name];if(!definition||!env||!env.document)return Promise.reject(new Error('Biblioteka nije dostupna.'));if(env[definition.global])return Promise.resolve(env[definition.global]);var pending=loads.get(env);if(!pending){pending=Object.create(null);loads.set(env,pending);}if(pending[name])return pending[name];
    var tag=env.document.createElement('script'),timer,done=false;var promise=new Promise(function(resolve,reject){function finish(error){if(done)return;done=true;clearTimeout(timer);tag.onload=tag.onerror=null;if(error){delete pending[name];tag.remove();reject(error);}else resolve(env[definition.global]);}tag.src=definition.path;tag.async=true;tag.onload=function(){finish(env[definition.global]?null:new Error('Biblioteka nije učitana.'));};tag.onerror=function(){finish(new Error('Biblioteka se ne može učitati.'));};timer=setTimeout(function(){finish(new Error('Isteklo je učitavanje biblioteke.'));},options.timeout||20000);});pending[name]=promise;env.document.head.appendChild(tag);return promise;
  }
  return {load:load};
}));
