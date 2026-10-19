'use strict';
const $=id=>document.getElementById(id);
let language='en';
const textFor=(en,zh)=>language==='zh'?zh:en;
function applyLanguage(root=document){
  root.querySelectorAll('[data-en][data-zh]').forEach(el=>el.textContent=el.dataset[language]);
  for(const attr of ['aria-label','aria-roledescription','alt','title','content']){
    root.querySelectorAll(`[data-en-${attr}][data-zh-${attr}]`).forEach(el=>el.setAttribute(attr,el.getAttribute(`data-${language}-${attr}`)));
  }
}
function setLanguage(next){
  language=next==='zh'?'zh':'en';document.documentElement.lang=language==='en'?'en':'zh-CN';
  applyLanguage();
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===language)));
  try{localStorage.setItem('physloop.language',language)}catch{}
  try{const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url)}catch{}
}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
let preferred;try{preferred=localStorage.getItem('physloop.language')}catch{}
const requestedLanguage=new URLSearchParams(location.search).get('lang');
setLanguage(requestedLanguage==='en'||requestedLanguage==='zh'?requestedLanguage:preferred);
const gallery=$('case-gallery'),dialog=$('case-dialog');
if(gallery&&dialog&&window.PHYSLOOP_CASES){
  const cases=window.PHYSLOOP_CASES.cases;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bilingual=(en,zh)=>`data-en="${esc(en)}" data-zh="${esc(zh)}"`;
  const video=(src,poster,en,zh)=>`<video controls playsinline preload="metadata" src="${esc(src)}" ${poster?`poster="${esc(poster)}"`:''} aria-label="${esc(textFor(en,zh))}" data-en-aria-label="${esc(en)}" data-zh-aria-label="${esc(zh)}"></video>`;
  let returnFocus=null;
  function show(content,opener){
    document.querySelectorAll('.case-card video').forEach(v=>{if(!v.paused)v.pause()});returnFocus=opener;
    $('case-dialog-content').innerHTML=content;applyLanguage($('case-dialog-content'));dialog.showModal();
  }
  function comparison(c,opener){
    const x=c.comparison;if(!x)return;
    const zh=c.title_zh||c.title;
    show(`<div data-video-pair><div class="case-dialog-heading"><p class="section-label" ${bilingual('Baseline vs. PhysLoop','基线与 PhysLoop 对比')}>Baseline vs. PhysLoop</p><h3 ${bilingual(c.title,zh)}>${esc(c.title)}</h3></div><div class="case-pair-controls"><button type="button" data-play-pair ${bilingual('Play both','同时播放')} aria-label="Play both videos" data-en-aria-label="Play both videos" data-zh-aria-label="同时播放两个视频" aria-pressed="false">Play both</button><span data-pair-status class="case-pair-status" role="status"></span></div><div class="case-comparison-grid"><figure><figcaption ${bilingual('Baseline','基线')}>Baseline</figcaption>${video(x.before,x.before_poster,'Baseline — '+c.title,'基线 — '+zh)}</figure><figure><figcaption>PhysLoop</figcaption>${video(x.after,x.after_poster,'PhysLoop — '+c.title,'PhysLoop — '+zh)}</figure></div></div>`,opener);
  }
  function updatePairButton(pair){
    const button=pair.querySelector('[data-play-pair]');if(!button)return;
    const playing=[...pair.querySelectorAll('video')].some(v=>!v.paused&&!v.ended);
    button.dataset.en=playing?'Pause both':'Play both';
    button.dataset.zh=playing?'同时暂停':'同时播放';
    button.textContent=button.dataset[language];
    button.setAttribute('data-en-aria-label',playing?'Pause both videos':'Play both videos');
    button.setAttribute('data-zh-aria-label',playing?'同时暂停两个视频':'同时播放两个视频');
    button.setAttribute('aria-label',button.getAttribute(`data-${language}-aria-label`));
    button.setAttribute('aria-pressed',String(playing));
  }
  function setPairStatus(status,failed){
    status.dataset.en=failed?'Could not start both videos. Please retry using the individual controls.':'';
    status.dataset.zh=failed?'无法同时启动两个视频，请使用各自的播放按钮重试。':'';
    status.textContent=status.dataset[language];
  }
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-play-pair]');if(!button)return;
    const pair=button.closest('[data-video-pair]'),videos=[...pair.querySelectorAll('video')];
    const status=pair.querySelector('[data-pair-status]');setPairStatus(status,false);
    if(videos.some(v=>!v.paused&&!v.ended))videos.forEach(v=>v.pause());
    else{
      button.disabled=true;
      try{
        const start=videos.some(v=>v.ended)?0:Math.min(...videos.map(v=>v.currentTime));
        videos.forEach(v=>{v.currentTime=start});
        const results=await Promise.allSettled(videos.map(v=>v.play()));
        if(results.some(r=>r.status==='rejected')){
          videos.forEach(v=>v.pause());setPairStatus(status,true);
        }
      }catch{
        videos.forEach(v=>v.pause());setPairStatus(status,true);
      }finally{button.disabled=false}
    }
    updatePairButton(pair);
  });
  for(const event of ['play','pause','ended'])document.addEventListener(event,e=>{
    if(e.target.tagName==='VIDEO'){
      const pair=e.target.closest('[data-video-pair]');if(pair)updatePairButton(pair);
    }
  },true);
  gallery.addEventListener('click',e=>{
    const arrow=e.target.closest('[data-case-step]');
    if(arrow){
      const panel=arrow.closest('.case-category'),slides=[...panel.querySelectorAll('.case-card')];
      const index=(Number(panel.dataset.caseIndex)+Number(arrow.dataset.caseStep)+slides.length)%slides.length;
      panel.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause()});
      slides.forEach((slide,n)=>{slide.hidden=n!==index});panel.dataset.caseIndex=String(index);
      panel.querySelector('[data-case-position]').textContent=`${index+1} / ${slides.length}`;return;
    }
    const b=e.target.closest('[data-case-comparison]');if(!b)return;
    const c=cases.find(c=>c.case_id===b.dataset.caseComparison);if(c)comparison(c,b);
  });
  gallery.addEventListener('change',e=>{
    const select=e.target.closest('[data-case-view]');if(!select)return;
    const c=cases.find(c=>c.case_id===select.dataset.caseView);if(!c)return;
    const v=c.views[Number(select.value)-1],player=select.closest('.case-card').querySelector('[data-case-result]');
    select.closest('.case-card').querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause()});player.src=v?v.video:c.video;
    player.poster=v?v.poster:c.poster;player.load();
  });
  gallery.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')gallery.querySelectorAll('video').forEach(v=>{if(v.closest('.case-card')!==e.target.closest('.case-card')&&!v.paused)v.pause()})},true);
  dialog.querySelector('.case-dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>{dialog.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause()});$('case-dialog-content').replaceChildren();returnFocus?.focus()});
}
