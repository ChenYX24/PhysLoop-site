'use strict';
const $=id=>document.getElementById(id);
let language='en';
function setLanguage(next){
  language=next==='zh'?'zh':'en';document.documentElement.lang=language==='en'?'en':'zh-CN';
  document.querySelectorAll('[data-en][data-zh]').forEach(el=>el.textContent=el.dataset[language]);
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===language)));
  try{localStorage.setItem('physloop.language',language)}catch{}
}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
let preferred;try{preferred=localStorage.getItem('physloop.language')}catch{}
setLanguage(preferred);
const gallery=$('case-gallery'),dialog=$('case-dialog');
if(gallery&&dialog&&window.PHYSLOOP_CASES){
  const cases=window.PHYSLOOP_CASES.cases;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const video=(src,poster,label)=>`<video controls playsinline preload="metadata" src="${esc(src)}" ${poster?`poster="${esc(poster)}"`:''} aria-label="${esc(label)}"></video>`;
  let returnFocus=null;
  function show(content,opener){
    document.querySelectorAll('.case-card video').forEach(v=>{if(!v.paused)v.pause()});returnFocus=opener;
    $('case-dialog-content').innerHTML=content;dialog.showModal();
  }
  function comparison(c,opener){
    const x=c.comparison;if(!x)return;
    show(`<div data-video-pair><div class="case-dialog-heading"><p class="section-label">${esc(x.title)}</p><h3>${esc(c.title)}</h3><p>${esc(x.description)}</p></div><div class="case-pair-controls"><button type="button" data-play-pair aria-label="Play both videos" aria-pressed="false">Play both</button><span data-pair-status class="case-pair-status" role="status"></span></div><div class="case-comparison-grid"><figure><figcaption>${esc(x.before_label)}</figcaption>${video(x.before,x.before_poster,x.before_label+' — '+c.title)}</figure><figure><figcaption>${esc(x.after_label)}</figcaption>${video(x.after,x.after_poster,x.after_label+' — '+c.title)}</figure></div><p class="case-view-note">Independent timelines; event times may differ.</p>${x.input_protocol_before?`<p class="case-view-note">${esc(x.before_label)}: ${esc(x.input_protocol_before)}<br>${esc(x.after_label)}: ${esc(x.input_protocol_after)}</p>`:''}</div>`,opener);
  }
  function updatePairButton(pair){
    const button=pair.querySelector('[data-play-pair]');if(!button)return;
    const playing=[...pair.querySelectorAll('video')].some(v=>!v.paused&&!v.ended);
    button.textContent=playing?'Pause both':'Play both';
    button.setAttribute('aria-label',playing?'Pause both videos':'Play both videos');
    button.setAttribute('aria-pressed',String(playing));
  }
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-play-pair]');if(!button)return;
    const pair=button.closest('[data-video-pair]'),videos=[...pair.querySelectorAll('video')];
    const status=pair.querySelector('[data-pair-status]');status.textContent='';
    if(videos.some(v=>!v.paused&&!v.ended))videos.forEach(v=>v.pause());
    else{
      button.disabled=true;
      try{
        const start=videos.some(v=>v.ended)?0:Math.min(...videos.map(v=>v.currentTime));
        videos.forEach(v=>{v.currentTime=start});
        const results=await Promise.allSettled(videos.map(v=>v.play()));
        if(results.some(r=>r.status==='rejected')){
          videos.forEach(v=>v.pause());status.textContent='Could not start both videos. Please retry using the individual controls.';
        }
      }catch{
        videos.forEach(v=>v.pause());status.textContent='Could not start both videos. Please retry using the individual controls.';
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
