/* Input-driven TV motion. Only visible rows animate; focus and media cleanup stay immediate. */
(function(root){
  'use strict';
  var g=root.gsap,media=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)'),observer=null,layoutNodes=[],lite=root.LumaPlayback&&root.LumaPlayback.isTV(root.navigator&&root.navigator.userAgent),playing=false;
  if(lite&&root.document)root.document.documentElement.classList.add('tv-lite');
  function reduced(){return !g||!!(media&&media.matches);}
  function visible(node){if(!node||!node.isConnected||node.closest('[hidden]'))return false;var r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<root.innerHeight&&r.right>0&&r.left<root.innerWidth;}
  function enter(nodes,options){options=options||{};nodes=Array.isArray(nodes)?nodes:[nodes];nodes=nodes.filter(visible);if(reduced()||playing||!nodes.length)return null;if(lite){nodes=nodes.slice(0,1);options={y:0,duration:.12};}
    g.killTweensOf(nodes);g.set(nodes,{willChange:'transform,opacity'});
    return g.fromTo(nodes,{opacity:0,y:options.y==null?14:options.y},{opacity:1,y:0,duration:options.duration||.32,ease:'power2.out',stagger:options.stagger||0,overwrite:'auto',clearProps:'opacity,transform,willChange'});
  }
  function leave(node,done){if(!node)return;if(reduced()||lite||playing||!visible(node)){done();return;}g.killTweensOf(node);g.set(node,{willChange:'transform,opacity'});g.to(node,{opacity:0,y:8,duration:.16,ease:'power1.in',overwrite:'auto',onComplete:function(){g.set(node,{clearProps:'opacity,transform,willChange'});done();}});}
  function settleLayout(){if(!g)return;g.killTweensOf(layoutNodes);g.set(layoutNodes,{clearProps:'transform,willChange'});layoutNodes=[];}
  function candidates(container){var nodes=[];if(!container)return nodes;
    Array.prototype.forEach.call(container.querySelectorAll('.shelf'),function(shelf){if(nodes.length>=28||!visible(shelf))return;var head=shelf.querySelector('.shelf-head'),rail=shelf.querySelector('.rail');if(head)nodes.push(head);if(!rail)return;
      var left=rail.scrollLeft,width=rail.clientWidth;Array.prototype.forEach.call(rail.children,function(n){if(nodes.length>=28)return;var x=n.offsetLeft,w=n.offsetWidth;if(x+w>=left-40&&x<=left+width+40)nodes.push(n);});
    });return nodes;
  }
  function layout(container,change){if(reduced()||lite||playing){change();return;}var nodes=candidates(container);layoutNodes.forEach(function(n){if(n.isConnected&&nodes.indexOf(n)<0)nodes.push(n);});
    var before=nodes.map(function(n){return n.getBoundingClientRect();});g.killTweensOf(nodes);g.set(nodes,{clearProps:'transform,willChange'});change();
    var after=nodes.map(function(n){return n.getBoundingClientRect();});layoutNodes=nodes;
    nodes.forEach(function(n,i){var a=before[i],b=after[i];if(!a.width||!a.height||!b.width||!b.height)return;var x=a.left-b.left,y=a.top-b.top,sx=a.width/b.width,sy=a.height/b.height;
      if(Math.abs(x)<.5&&Math.abs(y)<.5&&Math.abs(sx-1)<.003&&Math.abs(sy-1)<.003)return;
      g.fromTo(n,{x:x,y:y,scaleX:sx,scaleY:sy,transformOrigin:'0 0',willChange:'transform'},{x:0,y:0,scaleX:1,scaleY:1,duration:.28,ease:'power3.out',overwrite:'auto',clearProps:'transform,transformOrigin,willChange'});
    });
  }
  function scrollFocus(node,quick){if(!node)return false;var rail=node.closest('.rail'),slot=node.closest('.card-slot'),container=node.closest('.layer')||node.closest('.screen');if(!container)return false;
    if(container.classList.contains('player'))return true;
    if(reduced()||lite){try{node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}catch(_){node.scrollIntoView(false);}return true;}
    var duration=quick ? 0.15 : 0.3;
    if(rail){var item=slot||node,pad=parseFloat(root.getComputedStyle(rail).paddingLeft)||0,x=item.offsetLeft,w=item.offsetWidth,target=rail.scrollLeft;
      if(x<target+pad)target=x-pad;else if(x+w>target+rail.clientWidth-pad)target=x+w-rail.clientWidth+pad;
      target=Math.max(0,Math.min(target,rail.scrollWidth-rail.clientWidth));g.killTweensOf(rail,'scrollLeft');if(Math.abs(target-rail.scrollLeft)>.5)g.to(rail,{scrollLeft:target,duration:duration,ease:'power2.out',overwrite:'auto'});
    }
    if(container.classList.contains('player'))return true;
    var cr=container.getBoundingClientRect(),nr=(slot||node).getBoundingClientRect(),style=root.getComputedStyle(container),topPad=parseFloat(style.scrollPaddingTop)||12,bottomPad=parseFloat(style.scrollPaddingBottom)||16,top=nr.top-cr.top+container.scrollTop,height=(slot||node).offsetHeight;
    // Card transforms animate visual placement; scroll toward their stable layout coordinates.
    if(slot&&rail)top=rail.getBoundingClientRect().top-cr.top+container.scrollTop+slot.offsetTop;
    var y=container.scrollTop;if(top<y+topPad)y=top-topPad;else if(top+height>y+container.clientHeight-bottomPad)y=top+height-container.clientHeight+bottomPad;
    y=Math.max(0,Math.min(y,container.scrollHeight-container.clientHeight));g.killTweensOf(container,'scrollTop');if(Math.abs(y-container.scrollTop)>.5)g.to(container,{scrollTop:y,duration:duration,ease:'power2.out',overwrite:'auto'});return true;
  }
  function reveal(container){if(!container||reduced()||lite||playing)return;var nodes=Array.prototype.slice.call(container.querySelectorAll('.shelf,.settings-section,.search-layout'));
    nodes.forEach(function(node){if(node._lumaRevealed)return;if(observer)observer.observe(node);else if(visible(node)){node._lumaRevealed=true;enter(node,{y:14});}});
  }
  function page(container){if(observer){observer.disconnect();observer=null;}if(!container||reduced()||lite||playing)return;
    if(root.IntersectionObserver)observer=new root.IntersectionObserver(function(entries){var shown=[];entries.forEach(function(entry){if(!entry.isIntersecting||entry.target._lumaRevealed)return;entry.target._lumaRevealed=true;observer.unobserve(entry.target);shown.push(entry.target);});enter(shown,{y:16,duration:.36,stagger:.035});},{root:container,threshold:.08});
    var heading=container.querySelector('.page-content>h1');if(heading)enter(heading,{y:10});reveal(container);
  }
  function items(container){if(!container||lite||playing)return;var nodes=Array.prototype.slice.call(container.children).filter(visible).slice(0,7);enter(nodes,{y:10,duration:.26,stagger:.025});}
  function background(hero,value){var art=hero&&hero.querySelector('.hero-art');if(!art)return;if(hero._lumaArtSwap){var old=hero._lumaArtSwap;g.killTweensOf(old.next);old.art.remove();old.next.classList.remove('hero-art-next');g.set(old.next,{clearProps:'opacity'});hero._lumaArtSwap=null;art=old.next;}
    if(art.style.backgroundImage===value)return;if(reduced()||lite||playing||!visible(hero)||!art.style.backgroundImage){art.style.backgroundImage=value;return;}
    var next=art.cloneNode(false);next.classList.add('hero-art-next');next.style.backgroundImage=value;hero.insertBefore(next,hero.querySelector('.hero-shade'));hero._lumaArtSwap={art:art,next:next};
    g.fromTo(next,{opacity:0},{opacity:.95,duration:.42,ease:'power1.inOut',onComplete:function(){art.remove();next.classList.remove('hero-art-next');g.set(next,{clearProps:'opacity'});hero._lumaArtSwap=null;}});
  }
  function heroPlayback(hero,playing){var copy=hero&&hero.querySelector('.hero-copy'),panel=hero&&hero.querySelector('.hero-preview');if(!copy||!panel)return;var shade=hero.querySelector('.hero-shade'),active=!!hero._lumaPlayback;if(playing===active&&(playing||!copy.hidden&&!hero.classList.contains('hero-trailer-full')))return;
    hero._lumaPlayback=playing;var run=hero._lumaPlaybackRun=(hero._lumaPlaybackRun||0)+1;if(g){g.killTweensOf(copy);g.killTweensOf(panel);if(shade)g.killTweensOf(shade);g.set(panel,{clearProps:'opacity,transform,willChange'});}
    if(!playing){hero.classList.remove('hero-trailer-full');copy.hidden=false;copy.removeAttribute('aria-hidden');if(g){g.set(copy,{clearProps:'opacity,transform,willChange'});if(shade)g.set(shade,{clearProps:'opacity'});}if(active)enter(copy,{y:8,duration:.26});return;}
    copy.setAttribute('aria-hidden','true');function expand(){if(run!==hero._lumaPlaybackRun||!hero.isConnected||!hero._lumaPlayback)return;copy.hidden=true;hero.classList.add('hero-trailer-full');if(!reduced())g.fromTo(panel,{opacity:.7},{opacity:1,duration:.28,ease:'power1.out',overwrite:'auto',clearProps:'opacity'});}
    if(reduced()){expand();return;}if(shade)g.to(shade,{opacity:0,duration:lite ? .12 : .24,ease:'power2.in',overwrite:'auto'});g.set(copy,{willChange:'opacity'});g.to(copy,{opacity:0,y:lite?0:-12,duration:lite ? .12 : .24,ease:'power2.in',overwrite:'auto',onComplete:expand});
  }
  root.LumaMotion={enter:enter,leave:leave,layout:layout,settleLayout:settleLayout,scrollFocus:scrollFocus,page:page,reveal:reveal,items:items,background:background,heroPlayback:heroPlayback,reduced:reduced,lite:!!lite,playback:function(value){playing=!!value;if(playing){settleLayout();if(observer)observer.disconnect();}if(root.document)root.document.body.classList.toggle('is-playing',playing);}};
}(window));
