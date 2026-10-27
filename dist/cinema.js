import {createCampus} from './campus.js?v=15';

const canvas=document.querySelector('#campus');
const stops=[...document.querySelectorAll('.tour-stop')];
const mapLinks=[...document.querySelectorAll('.campus-map a')];
const caption=document.querySelector('#room-label');
const progressBar=document.querySelector('.journey-progress i');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let campus;
try{
  campus=createCampus(canvas);
  campus.ready.then(()=>{
    document.body.classList.add('campus-ready');
    document.querySelector('#scene-loading').setAttribute('aria-hidden','true');
  });
}
catch(error){document.querySelector('#scene-loading').hidden=true;document.querySelector('#scene-fallback').hidden=false;console.error('Campus renderer:',error);}
let progress=0,target=0,paused=reduced.matches,raf=0,last=0,active=-1;
let pointer={x:0,y:0},smoothed={x:0,y:0};
let distance=1,tourStart=null,tourOrigin=0;
const clamp=v=>Math.max(0,Math.min(1,v));
const play=document.querySelector('#tour-play');
const pause=document.querySelector('#motion-toggle');
function stopTour(){tourStart=null;document.body.classList.remove('tour-playing');play.textContent='▷ Take the guided tour';play.setAttribute('aria-pressed','false');}
function measure(){distance=Math.max(1,document.documentElement.scrollHeight-innerHeight);campus?.resize();onScroll();}
function onScroll(){target=clamp(scrollY/distance);wake();}
function updateRoom(){
  const y=scrollY+innerHeight*.5;let next=0;
  stops.forEach((stop,i)=>{if(y>=stop.offsetTop)next=i;});
  if(next===active)return;active=next;
  caption.textContent=stops[next].dataset.room;
  document.querySelector('#visit-count').textContent=`0${next+1} / 05`;
  mapLinks.forEach((link,i)=>{link.classList.toggle('active',i===next);if(i===next)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
}
function frame(now){
  raf=0;if(document.hidden)return;
  const dt=Math.min(50,now-(last||now));last=now;
  if(tourStart!==null){const t=clamp((now-tourStart)/65000);const next=tourOrigin+(1-tourOrigin)*t;window.scrollTo({top:next*distance,behavior:'instant'});target=next;if(t>=1)stopTour();}
  const blend=1-Math.exp(-dt/115);
  progress=reduced.matches?target:progress+(target-progress)*blend;
  smoothed.x+=(pointer.x-smoothed.x)*blend;smoothed.y+=(pointer.y-smoothed.y)*blend;
  if(campus)campus.renderAt(paused?frozen:progress,now/1000,paused||reduced.matches?{x:0,y:0}:smoothed,paused);
  progressBar.style.width=`${target*100}%`;updateRoom();
  // Animated light, flowing water, forest breeze, and robots remain alive at rest, unless paused.
  if(!paused||Math.abs(progress-target)>.0005||tourStart!==null)raf=requestAnimationFrame(frame);
}
let frozen=0;
function wake(){if(!raf&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}}
function pauseLabel(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion ▷':'Pause motion Ⅱ';}
pause.addEventListener('click',()=>{paused=!paused;if(paused){frozen=progress;stopTour();}pauseLabel();wake();});
document.querySelector('#explore-toggle').addEventListener('click',event=>{const enabled=document.body.classList.toggle('explore-mode');event.currentTarget.setAttribute('aria-pressed',String(enabled));event.currentTarget.textContent=enabled?'Show the story ⤢':'Just explore ⤢';document.querySelectorAll('.room-copy').forEach(copy=>{copy.inert=enabled;copy.setAttribute('aria-hidden',String(enabled));});});
play.setAttribute('aria-pressed','false');
play.addEventListener('click',()=>{if(tourStart!==null){stopTour();return;}paused=false;pauseLabel();tourOrigin=target>.95?0:target;tourStart=performance.now();play.textContent='Ⅱ Pause guided tour';play.setAttribute('aria-pressed','true');document.body.classList.add('tour-playing');wake();});
addEventListener('wheel',stopTour,{passive:true});addEventListener('touchstart',stopTour,{passive:true});
addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))stopTour();});
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',stopTour));
document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',stopTour));

// Interactive robot high-animation controls
const robotBtns=[...document.querySelectorAll('.robot-action-btn')];
robotBtns.forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    robotBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    campus?.setRobotAction?.(btn.dataset.anim,6.0);
    wake();
  });
});
canvas?.addEventListener('robotact',e=>{
  const act=e.detail?.action;
  if(act)robotBtns.forEach(b=>b.classList.toggle('active',b.dataset.anim===act));
});

addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',measure,{passive:true});
addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;pointer={x:clamp(event.clientX/innerWidth)*2-1,y:1-clamp(event.clientY/innerHeight)*2};wake();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;stopTour();}else wake();});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)frozen=progress;pauseLabel();wake();});
new ResizeObserver(measure).observe(document.querySelector('main'));document.fonts.ready.then(measure);
pauseLabel();measure();
