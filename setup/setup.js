(function(){
  'use strict';
  var data=null,platform=null,index=0,phone='ios';
  function byId(id){return document.getElementById(id);}
  function reveal(n){n.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  function node(tag,copy,className){var n=document.createElement(tag);if(copy)n.textContent=copy;if(className)n.className=className;return n;}
  function route(){return platform.routes[phone]||platform.routes.both;}
  function choose(id,scroll){platform=data.platforms.find(function(p){return p.id===id;});if(!platform)return;index=0;history.replaceState(null,'','#'+id);byId('guide').hidden=false;document.querySelectorAll('.system').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.platform===id));});render();if(scroll)reveal(byId('guide'));}
  function render(){
    var r=route(),s=r.steps[index],step=byId('step');
    byId('guide-title').textContent=platform.title;byId('guide-status').textContent=r.status;byId('route').textContent=r.description;
    byId('step-count').textContent='Korak '+(index+1)+' od '+r.steps.length;byId('step-number').textContent=String(index+1).padStart(2,'0');byId('step-title').textContent=s.title;byId('step-body').textContent=s.body;byId('step-note').textContent=s.note||'';
    var dots=byId('step-dots');dots.textContent='';r.steps.forEach(function(_,i){dots.appendChild(node('i','',''+(i===index?'active':'')));});
    var actions=byId('step-actions');actions.textContent='';(s.actions||[]).forEach(function(a){
      if(a.copy){var b=node('button',a.label);b.type='button';b.addEventListener('click',function(){if(!navigator.clipboard){b.textContent=a.copy;return;}navigator.clipboard.writeText(a.copy).then(function(){b.textContent='Kopirano';},function(){b.textContent=a.copy;});});actions.appendChild(b);actions.appendChild(node('code',a.copy));}
      else if(a.href){var link=node('a',a.label);link.href=a.href;link.target='_blank';link.rel='noopener noreferrer';actions.appendChild(link);}
    });
    byId('previous').disabled=index===0;byId('next').textContent=index===r.steps.length-1?'Odaberi drugi TV ↑':'Dalje →';
    var all=byId('all-steps');all.textContent='';r.steps.forEach(function(s){var li=node('li');li.appendChild(node('strong',s.title));li.appendChild(node('span',s.body));if(s.note)li.appendChild(node('p',s.note));all.appendChild(li);});
    var refs=byId('references');refs.textContent='';(platform.references||[]).forEach(function(a){var link=node('a',a.label+' ↗');link.href=a.href;link.target='_blank';link.rel='noopener noreferrer';refs.appendChild(link);});
    step.classList.remove('step-enter');void step.offsetWidth;step.classList.add('step-enter');
  }
  function selectSystems(){reveal(byId('systems-title'));var current=document.querySelector('.system[aria-pressed=true]');if(current)current.focus({preventScroll:true});}
  byId('change-system').addEventListener('click',selectSystems);
  byId('previous').addEventListener('click',function(){if(index){index--;render();byId('step').focus({preventScroll:true});reveal(byId('step'));}});
  byId('next').addEventListener('click',function(){if(!platform)return;if(index===route().steps.length-1){selectSystems();return;}index++;render();byId('step').focus({preventScroll:true});reveal(byId('step'));});
  document.querySelectorAll('[name=phone]').forEach(function(input){input.addEventListener('change',function(){phone=input.value;if(platform){index=0;render();}});});
  fetch('guides.json?v=1').then(function(r){if(!r.ok)throw Error();return r.json();}).then(function(value){data=value;data.platforms.forEach(function(p){var b=node('button','','system');b.type='button';b.dataset.platform=p.id;b.setAttribute('aria-pressed','false');b.appendChild(node('span',p.brand,'system-brand'));b.appendChild(node('strong',p.title));b.appendChild(node('span',p.summary,'system-status'));b.appendChild(node('span','↗','arrow'));b.addEventListener('click',function(){choose(p.id,true);});byId('systems').appendChild(b);});if(location.hash)choose(location.hash.slice(1),false);}).catch(function(){byId('systems').appendChild(node('p','Upute se ne mogu učitati. Osvježi stranicu i pokušaj ponovno.'));});
}());
