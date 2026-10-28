const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),P=require('../playback.js');
test('VIDAA focus changes never measure and animate every card or create row observers',()=>{
  const classes=new Set(),root={LumaPlayback:P,navigator:{userAgent:'Mozilla VIDAA Hisense SmartTV'},gsap:{killTweensOf(){},set(){}},matchMedia:()=>({matches:false}),document:{documentElement:{classList:{add:c=>classes.add(c)}},body:{classList:{toggle(){}}}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../motion.js'),'utf8'),{window:root});
  const container={querySelectorAll(){throw Error('TV should not measure whole rows');}},motion=root.LumaMotion;let changes=0;
  motion.layout(container,()=>changes++);motion.items(container);motion.page(container);motion.reveal(container);
  assert.equal(changes,1);assert.equal(motion.lite,true);assert.equal(classes.has('tv-lite'),true);
});
