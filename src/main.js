// Minimal JavaScript for the portfolio
async function loadComponent(selector, path){
  try{
    const res = await fetch(path);
    if(!res.ok) return;
    const html = await res.text();
    const el = document.querySelector(selector);
    if(el) el.innerHTML = html;
  }catch(e){
    console.warn('Could not load component', path, e);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // optional component injection (keeps existing behavior)
  await Promise.all([
    // load header component only if placeholder exists (we inline header for robustness)
    (document.querySelector('#site-header') ? loadComponent('#site-header','components/header.html') : Promise.resolve()),
    loadComponent('#site-footer','components/footer.html')
  ]).catch(()=>{});

  const yearEl = document.getElementById('year-footer');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(!href || href === '#') return;
      const target = document.querySelector(href);
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  // Mobile nav toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('main-navigation');
  if(mobileBtn && nav){
    mobileBtn.addEventListener('click', ()=>{
      const expanded = mobileBtn.getAttribute('aria-expanded') === 'true';
      mobileBtn.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'flex';
    });
    window.addEventListener('resize', ()=>{
      if(window.innerWidth > 768) nav.style.display = '';
    });
  }

  // Scroll reveal (respect reduced motion)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!prefersReduced && 'IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('active');
          obs.unobserve(e.target);
        }
      });
    },{threshold: 0.15});
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el=>obs.observe(el));

    // Count-up for stat cards when they reveal
    const statObserver = new IntersectionObserver((entries)=>{
      entries.forEach(en => {
        if(!en.isIntersecting) return;
        const el = en.target;
        const valueEl = el.querySelector('.stat-value');
        if(valueEl) {
          const text = valueEl.textContent || '';
          const m = text.match(/\d+(?:[.,]\d+)?/);
          if(m){
            const target = Number(m[0].replace(',', ''));
            const prefix = text.slice(0, m.index);
            const suffix = text.slice(m.index + m[0].length);
            const duration = 1200;
            let start;
            function step(ts){
              if(!start) start = ts;
              const t = Math.min(1, (ts - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              const current = Math.round(target * eased);
              valueEl.textContent = prefix + current + suffix;
              if(t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          }
        }
        statObserver.unobserve(el);
      });
    },{threshold:0.3});
    document.querySelectorAll('.stat-card').forEach(c=>statObserver.observe(c));
  } else {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el=>el.classList.add('active'));
    // Respect reduced motion: set stat values immediately (no animation)
    document.querySelectorAll('.stat-card .stat-value').forEach(v=>{
      // ensure shown as-is
    });
  }

  // header scrolled state (adds small shadow & darker glass when page is scrolled)
  const headerEl = document.querySelector('.site-header-inner');
  if(headerEl){
    const onScrollHeader = ()=>{
      if(window.scrollY > 18) headerEl.classList.add('scrolled');
      else headerEl.classList.remove('scrolled');
    };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, {passive:true});
  }

  // Contact form - basic demo handler
  const form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit', function(evt){
      evt.preventDefault();
      const name = form.querySelector('#name');
      const email = form.querySelector('#email');
      const message = form.querySelector('#message');
      if(!name.value || !email.value || !message.value){
        alert('Please complete name, email and message.');
        return;
      }
      const submitBtn = form.querySelector('.submit-btn');
      if(submitBtn) submitBtn.disabled = true;
      // Simulated send
      setTimeout(()=>{
        form.reset();
        if(submitBtn) submitBtn.disabled = false;
        alert('Thanks — message sent (demo).');
      },800);
    });
  }

  console.log('Portfolio scripts loaded');

  // Persistent helper: detect and remove transforms on footer ancestors that can affect layout
  (function persistentRemoveFooterTransforms(){
    try{
      const footer = document.querySelector('footer');
      if(!footer) return;

      function processAncestors(){
        const removed = [];
        let el = footer.parentElement;
        while(el && el !== document.documentElement){
          try{
            const cs = getComputedStyle(el);
            const t = cs.transform || 'none';
            const wc = (cs.willChange || '').toLowerCase();
            const skip = el.classList && (String(el.className).includes('bg-') || String(el.id).includes('bg'));
            if(!skip && t && t !== 'none'){
              // only act if we haven't already neutralized this element
              if(!el.dataset.__footerCleaned){
                console.warn('footer-debug: removing transform from ancestor', {tag: el.tagName, id: el.id, cls: el.className, transform: t, willChange: wc});
                el.dataset.__prevTransform = el.style.transform || '';
                el.style.transform = 'none';
                if(wc.includes('transform')){
                  el.dataset.__prevWillChange = el.style.willChange || '';
                  el.style.willChange = 'auto';
                }
                el.dataset.__footerCleaned = '1';
                removed.push(el);
              }
            }
          }catch(e){/* ignore per-node errors */}
          el = el.parentElement;
        }
        if(removed.length) console.info('footer-debug: removed transforms from', removed.length, 'ancestors');
      }

      // initial pass
      processAncestors();

      // watch for attribute/class/style changes that may reintroduce transforms
      const mo = new MutationObserver((mutations)=>{
        // debounce quick bursts
        if(typeof window.__footerTransformTimer !== 'undefined') clearTimeout(window.__footerTransformTimer);
        window.__footerTransformTimer = setTimeout(()=>{
          processAncestors();
        }, 120);
      });
      mo.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['style','class']});

      // keep a safety interval for any dynamic scripts (cleans for 6s then stops)
      let safetyRuns = 0;
      const iv = setInterval(()=>{
        processAncestors();
        safetyRuns++;
        if(safetyRuns > 50){ clearInterval(iv); }
      }, 120);

      // clean up on unload
      window.addEventListener('beforeunload', ()=>{ try{ mo.disconnect(); clearInterval(iv);}catch(e){} });
    }catch(e){console.error('footer-debug error', e)}
  })();
  
  // Timeline scroll-driven progress + reveal (robust, requestAnimationFrame)
  (function(){
    const timelines = Array.from(document.querySelectorAll('.timeline'));
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(timelines.length === 0) return;

    if(prefersReduced){
      timelines.forEach(t=>{
        t.classList.add('in-view');
        t.querySelectorAll('.timeline-item').forEach(it=>it.classList.add('visible'));
      });
      return;
    }

    // per-timeline smoothing state
    const states = new WeakMap();
    let raf = null;

    function update(){
      const vh = window.innerHeight;
      timelines.forEach(tl => {
        const rect = tl.getBoundingClientRect();
        const height = Math.max(1, rect.height);
        let target = (vh - rect.top) / height;
        target = Math.max(0, Math.min(1, target));

        if(!states.has(tl)) states.set(tl, {display: 0});
        const st = states.get(tl);
        // smooth lerp
        st.display += (target - st.display) * 0.18;

        const items = Array.from(tl.querySelectorAll('.timeline-item'));

        // debug: log initial timeline metrics once to help diagnose non-animating spine
        if(!st._dbgLogged){
          const line = tl.querySelector('.timeline-line');
          console.log('timeline-debug (init)', {
            top: rect.top,
            height: height,
            vh: vh,
            target: target,
            display: st.display,
            items: items.length,
            hasLine: Boolean(line)
          });
          st._dbgLogged = true;
        }

        const line = tl.querySelector('.timeline-line');
        // ensure inline transition is present so updates are visible even if CSS is overridden
        if(line){
          try{ line.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1)'; }catch(e){}
          line.style.transform = `translateX(-50%) scaleY(${st.display})`;
        }

        // log whenever the displayed value meaningfully changes (avoid spamming)
        if(typeof st._lastDisplay === 'undefined' || Math.abs(st.display - st._lastDisplay) > 0.008){
          console.log('timeline-update', {display: Number(st.display.toFixed(3)), target: Number(target.toFixed(3)), top: Math.round(rect.top), height: Math.round(height)});
          st._lastDisplay = st.display;
        }

        if(st.display > 0.02) tl.classList.add('in-view');

        // reveal items progressively (use same logic but rely on st.display)
        const fillViewportY = rect.top + st.display * height;
        items.forEach((item, idx) => {
          if(item.dataset.activated) return;
          const iRect = item.getBoundingClientRect();
          const itemCenterY = iRect.top + iRect.height / 2;
          if(itemCenterY <= fillViewportY + 8){
            item.dataset.activated = '1';
            const delay = Math.min(420, idx * 60);
            item.style.transitionDelay = `${delay}ms`;
            item.classList.add('visible');
          }
        });
      });
      // continue loop using RAF so the spine smoothly lerps while scrolling
      raf = requestAnimationFrame(update);
    }

    function schedule(){ if(raf == null) raf = requestAnimationFrame(update); }

    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule, {passive:true});
    // start continuous RAF-driven loop
    schedule();

    // IntersectionObserver fallback — ensure line updates even if scroll events are delayed
    try{
      const obs = new IntersectionObserver((entries)=>{
        entries.forEach(en => {
          const tl = en.target;
          if(!states.has(tl)) states.set(tl, {display:0});
          const st = states.get(tl);
          // use intersection ratio as immediate target
          const ratio = en.intersectionRatio || 0;
          st.display = Math.max(st.display, ratio);
          const line = tl.querySelector('.timeline-line');
          if(line) line.style.transform = `translateX(-50%) scaleY(${st.display})`;
          if(ratio > 0.02) tl.classList.add('in-view');
        });
      },{threshold:[0,0.05,0.1,0.25,0.5,0.75,1]});
      timelines.forEach(tl=>obs.observe(tl));
    }catch(e){/* ignore if IntersectionObserver unsupported */}
  })();

  // How I Work: hover/focus link between timeline steps and right-side cards
  (function(){
    // Minimal steps expand/collapse and reveal
    const steps = Array.from(document.querySelectorAll('.how-work-minimal .step'));
    if(steps.length){
      steps.forEach(step => {
        const btn = step.querySelector('.step-toggle');
        const details = step.querySelector('.step-details');
        // ensure keyboard access
        if(!step.hasAttribute('tabindex')) step.setAttribute('tabindex','0');

        function setExpanded(exp){
          step.setAttribute('aria-expanded', String(Boolean(exp)));
          if(btn) btn.setAttribute('aria-expanded', String(Boolean(exp)));
          if(details){
            if(exp){ details.hidden = false; }
            else { details.hidden = true; }
          }
        }

        // toggle handler
        function toggle(){
          const cur = step.getAttribute('aria-expanded') === 'true';
          setExpanded(!cur);
        }

        if(btn){
          btn.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
        }

        // clicking the step toggles details (but exclude clicks inside details)
        step.addEventListener('click', (e)=>{
          if(e.target.closest('.step-toggle') || e.target.closest('.step-details')) return;
          toggle();
        });

        // keyboard: Enter or Space toggles
        step.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
        });
      });
    }
  })();

  // Parallax card motion (subtle, scroll-driven + mouse parallax)
  (function(){
    // Cinematic parallax controller (background / midground / foreground)
    const back = document.querySelector('.bg-back');
    const mid = document.querySelector('.bg-mid');
    const front = document.querySelector('.bg-front');
    if(!back || !mid || !front) return;

    const state = {scroll: window.scrollY, backY:0, midY:0, frontY:0, mx:0, my:0, tx:0, ty:0, raf: null};
    const lerp = (a,b,t)=> a + (b-a)*t;

    function onScrollPar(){ state.scroll = window.scrollY; if(!state.raf) state.raf = requestAnimationFrame(updatePar); }
    function onMove(e){ state.mx = (e.clientX - window.innerWidth/2)/(window.innerWidth/2); state.my = (e.clientY - window.innerHeight/2)/(window.innerHeight/2); }

    function updatePar(){ state.raf = null;
      const s = state.scroll;
      // subtle slow movement for depth separation (negative moves background up as user scrolls down)
      const targetBack = -s * 0.03;
      const targetMid  = -s * 0.06;
      const targetFront = -s * 0.10;
      state.backY = lerp(state.backY, targetBack, 0.08);
      state.midY  = lerp(state.midY, targetMid, 0.10);
      state.frontY = lerp(state.frontY, targetFront, 0.12);

      // mouse follow smoothing
      state.tx += (state.mx - state.tx) * 0.06; state.ty += (state.my - state.ty) * 0.06;

      back.style.transform = `translate3d(0,${state.backY}px,0)`;
      mid.style.transform  = `translate3d(0,${state.midY}px,0)`;
      front.style.transform = `translate3d(${(state.tx*12).toFixed(2)}px,${(state.frontY + state.ty*8).toFixed(2)}px,0)`;

      // section focus bridges (set --section-focus variable per section)
      document.querySelectorAll('section[id]').forEach(sec => {
        const rect = sec.getBoundingClientRect();
        const centerDist = Math.abs((window.innerHeight/2) - (rect.top + rect.height/2));
        const maxDist = window.innerHeight * 0.85;
        const focus = Math.max(0, 1 - centerDist / maxDist);
        sec.style.setProperty('--section-focus', String(focus.toFixed(3)));
        if(focus > 0.32) sec.classList.add('is-focused'); else sec.classList.remove('is-focused');
      });

      // continue loop
      state.raf = requestAnimationFrame(updatePar);
    }

    // bind events (respect reduced motion)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.addEventListener('scroll', onScrollPar, {passive:true});
    window.addEventListener('resize', onScrollPar, {passive:true});
    if(!prefersReduced && window.innerWidth > 860){ window.addEventListener('mousemove', onMove, {passive:true}); }
    // initial kick
    onScrollPar();
  })();
});
