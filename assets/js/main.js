// Interações do site: preloader, scroll suave, revelações, tilt 3D, carrossel, card de aprovado.
const CFG = window.MDM_CONFIG;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const { gsap, ScrollTrigger } = window;

document.body.classList.add('is-loading');
if (reduced) document.documentElement.classList.add('reduced');
gsap.registerPlugin(ScrollTrigger);
// no celular a barra de endereço some/aparece ao rolar; sem isso o ScrollTrigger recalcula tudo e engasga
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------- Config → página ---------- */
$$('[data-cfg]').forEach(el => { const v = CFG[el.dataset.cfg]; if (v) el.textContent = v; });
$$('[data-wa]').forEach(a => { a.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site e quero saber mais sobre os cursos do MDM.')}`; });
$$('[data-ano]').forEach(el => { el.textContent = CFG.anoLetivo; });
$('#year').textContent = new Date().getFullYear();
$$('.final .pill').forEach(el => { el.innerHTML = `<i></i> Turmas ${CFG.anoLetivo} formando agora`; });

const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  stairs: '<path d="M4 20h4v-5h4v-5h4V5h4"/><path d="M4 20V9"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
$('#coursesGrid').innerHTML = CFG.cursos.map(c => `
  <article class="course ${c.id === 'kids' ? 'course--kids' : ''}" data-reveal>
    <div class="course__card" style="--c:${c.cor}">
      <span class="course__tag">${c.tag}</span>
      <span class="course__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icone]}</svg></span>
      <h3>${c.nome}</h3>
      <p>${c.resumo}</p>
      <ul>${c.itens.map(i => `<li>${i}</li>`).join('')}</ul>
      <button class="btn ${c.id === 'kids' ? 'btn--purple' : 'btn--yellow'}" data-matricula="${c.id}">Quero o ${c.nome}</button>
    </div>
  </article>`).join('');

/* ---------- Scroll suave ---------- */
let lenis = null;
// rolagem suave só com mouse; no toque a rolagem nativa do celular é mais fluida
if (!reduced && finePointer && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
window.MDM_LENIS = lenis;

$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = $(id);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}));

/* ---------- Hero 3D (carrega em paralelo ao preloader) ---------- */
const heroEl = $('#hero3d');
let hero3d = null;
const hero3dReady = import('./hero3d.js')
  .then(m => {
    hero3d = m.initHero3D(heroEl);
    if (!hero3d) { document.documentElement.classList.add('no-webgl'); return; }
    return hero3d.ready; // shaders compilados antes de a tela de carregamento sair
  })
  .catch(err => { console.warn('3D indisponível:', err); document.documentElement.classList.add('no-webgl'); });

/* ---------- Preloader ---------- */
// toda a animação da tela de carregamento é CSS (transform/opacity), que roda no compositor:
// não congela enquanto o 3D é baixado e montado na thread principal
const pre = $('#preloader');
const minTime = new Promise(r => setTimeout(r, reduced ? 200 : 1500));
const loaded = new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
const maxWait = new Promise(r => setTimeout(r, 5000));

Promise.race([Promise.all([minTime, loaded, hero3dReady, document.fonts.ready]), maxWait]).then(() => {
  pre.classList.add('is-done');
  ScrollTrigger.refresh(); // mede o layout final (fontes carregadas) ainda atrás da cortina
  // deixa a barra completar, inicia o 3D por baixo e só então sobe a cortina
  setTimeout(() => {
    hero3d?.start();
    // espera o 1º quadro do 3D ser pintado (2 rAF); o timeout cobre aba em segundo plano, onde rAF não roda
    const painted = new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 150); });
    painted.then(() => {
      pre.classList.add('is-leaving');
      setTimeout(playHeroIntro, reduced ? 0 : 280);
      const finish = () => { if (!pre.isConnected) return; pre.remove(); document.body.classList.remove('is-loading'); lenis?.start(); };
      pre.addEventListener('transitionend', e => { if (e.target === pre) finish(); });
      setTimeout(finish, 1400);
    });
  }, reduced ? 0 : 320);
});

function playHeroIntro() {
  hero3dReady.then(() => hero3d?.start());
  // entrada do texto também em transição CSS (compositor), para não disputar a thread com o 3D
  document.documentElement.classList.add('hero-in');
}
$$('[data-hero-in]').forEach((el, i) => { el.style.transitionDelay = `${250 + i * 80}ms`; });

/* ---------- Hero: scroll e chips ---------- */
ScrollTrigger.create({
  trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: self => hero3d?.setScroll(self.progress)
});
// parallax por JS fica atrasado em relação à rolagem nativa do celular e parece tremer: só no desktop
if (finePointer) gsap.to('.hero__content', { yPercent: 18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

if (finePointer) {
  const chips = $$('.chip3d');
  addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    chips.forEach(c => {
      const d = +c.dataset.depth;
      gsap.to(c, { x: x * -60 * d, y: y * -40 * d, rotateY: x * 30 * d, rotateX: -y * 30 * d, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
    });
  }, { passive: true });
}

/* ---------- Nav ---------- */
const nav = $('#nav');
const mobileCta = $('.mobile-cta');
const mobileMenu = $('#mobileMenu');
let lastY = 0;
let docH = document.body.scrollHeight, viewH = innerHeight;
addEventListener('resize', () => { docH = document.body.scrollHeight; viewH = innerHeight; }, { passive: true });
ScrollTrigger.addEventListener('refresh', () => { docH = document.body.scrollHeight; viewH = innerHeight; });
// lê só scrollY (sem medir layout) para não forçar recálculo a cada evento de rolagem
const onScroll = () => {
  const y = scrollY;
  nav.classList.toggle('is-scrolled', y > 30);
  nav.classList.toggle('is-hidden', y > 500 && y > lastY && !mobileMenu.classList.contains('is-open'));
  lastY = y;
  mobileCta?.classList.toggle('is-visible', y > viewH * 0.8 && y < docH - viewH * 1.6);
};
addEventListener('scroll', onScroll, { passive: true });

$$('.nav__links a').forEach(a => {
  const sec = $(a.getAttribute('href'));
  if (!sec) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('is-active', s.isActive) });
});

const burger = $('#burger'), menu = $('#mobileMenu');
function closeMenu() { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  if (open) gsap.from('#mobileMenu > *', { y: 40, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out', delay: 0.15 });
});
$$('#mobileMenu a, #mobileMenu button').forEach(el => el.addEventListener('click', closeMenu));

/* ---------- Mapa sob demanda ---------- */
$('#mapLoad').addEventListener('click', e => {
  const q = encodeURIComponent(CFG.endereco);
  e.currentTarget.outerHTML = `<iframe title="Mapa da unidade MDM" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${q}&output=embed"></iframe>`;
});

/* ---------- Revelações ---------- */
// transição de CSS (roda no compositor, fora da thread principal) disparada por IntersectionObserver
const revealIO = new IntersectionObserver(entries => {
  let i = 0;
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.style.transitionDelay = `${Math.min(i++, 5) * 70}ms`;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -10% 0px' });
$$('[data-reveal]').forEach(el => revealIO.observe(el));

/* ---------- Contadores ---------- */
$$('[data-count]').forEach(el => {
  const to = parseFloat(el.dataset.count);
  const dec = +(el.dataset.decimals || 0);
  const fmt = v => {
    let s = el.dataset.format === 'milhar' ? Math.round(v).toLocaleString('pt-BR') : v.toFixed(dec).replace('.', ',');
    return (el.dataset.prefix || '') + s + (el.dataset.suffix || '');
  };
  el.textContent = fmt(reduced ? to : 0);
  if (reduced) return;
  const o = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) })
  });
});

/* ---------- Tilt 3D genérico ---------- */
function tilt(el, { max = 10, target = el, glare = true } = {}) {
  if (!finePointer) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    target.classList.add('is-tilting');
    target.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
    target.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
    if (glare) { target.style.setProperty('--mx', `${px * 100}%`); target.style.setProperty('--my', `${py * 100}%`); }
  });
  el.addEventListener('pointerleave', () => {
    target.classList.remove('is-tilting');
    target.style.setProperty('--rx', '0deg');
    target.style.setProperty('--ry', '0deg');
  });
}
$$('.course').forEach(c => tilt(c, { max: 8, target: $('.course__card', c), glare: false }));
$$('.course').forEach(c => { const card = $('.course__card', c); c.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`); }); });

/* ---------- Carrossel 3D do método ---------- */
const ring = $('#ring');
const cards = $$('.ring__card', ring);
const step = 360 / cards.length;
cards.forEach((c, i) => { c.style.transform = `rotateY(${i * step}deg) translateZ(var(--radius))`; });
gsap.set(ring, { rotateX: -8 });

// a seção fica presa via CSS sticky; aqui só ligamos a rotação ao progresso da rolagem
gsap.to(ring, {
  rotateY: -(360 - step), ease: 'none',
  scrollTrigger: { trigger: '.method', start: 'top top', end: 'bottom bottom', scrub: finePointer ? 1 : 0.4 }
});

/* ---------- Foto em camadas ---------- */
const photo = $('#dreamsPhoto');
if (!reduced && finePointer) {
  gsap.to('.dreams__layer--back', { rotate: 25, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.fp1', { y: -60, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.fp2', { y: -110, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.fp3', { y: -30, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
}
if (finePointer) {
  photo.addEventListener('pointermove', e => {
    const r = photo.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(photo.querySelector('img'), { rotateY: x * 14, rotateX: -y * 14, duration: 0.8, ease: 'power3.out' });
    gsap.to('.float-pill', { x: x * 40, z: 60, duration: 0.8, ease: 'power3.out' });
  });
  photo.addEventListener('pointerleave', () => {
    gsap.to(photo.querySelector('img'), { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1, .6)' });
    gsap.to('.float-pill', { x: 0, duration: 1, ease: 'elastic.out(1, .6)' });
  });
}

/* ---------- Card de aprovado ---------- */
const aForm = $('#approvedForm');
const acard = $('#acard');
const updateCard = () => {
  const f = new FormData(aForm);
  $('#acardName').textContent = (f.get('nome') || '').trim() || 'Seu nome aqui';
  $('#acardCurso').textContent = f.get('curso');
  $('#acardUniv').textContent = f.get('univ');
};
aForm.addEventListener('input', updateCard);
aForm.addEventListener('submit', e => e.preventDefault());
tilt(acard, { max: 14 });
acard.addEventListener('click', () => acard.classList.toggle('is-flipped'));

$('#downloadCard').addEventListener('click', async () => {
  await document.fonts.ready;
  const f = new FormData(aForm);
  const name = (f.get('nome') || '').trim() || 'Seu nome aqui';
  const W = 1080, H = 1512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#8c3cff'); bg.addColorStop(1, '#3c0f86');
  g.fillStyle = bg; roundRect(g, 0, 0, W, H, 80); g.fill();
  const glow = g.createRadialGradient(W, 0, 0, W, 0, 900);
  glow.addColorStop(0, 'rgba(255,207,31,.45)'); glow.addColorStop(1, 'rgba(255,207,31,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // logo gigante de fundo
  g.save(); g.globalAlpha = 0.12; g.translate(W - 620, H - 760); g.scale(7, 7); drawLogo(g, '#fff'); g.restore();
  // topo
  g.save(); g.translate(80, 80); g.scale(1, 1); drawLogo(g, '#fff'); g.restore();
  g.fillStyle = '#fff'; g.font = '700 40px Poppins'; g.fillText('Melhores do Mundo', 220, 150);
  g.fillStyle = 'rgba(255,255,255,.2)'; roundRect(g, W - 250, 100, 170, 70, 35); g.fill();
  g.fillStyle = '#fff'; g.font = '800 40px Poppins'; g.fillText(String(CFG.anoLetivo), W - 215, 150);
  // selo
  g.save(); g.translate(80, 820); g.rotate(-0.07);
  g.fillStyle = '#ffcf1f'; roundRect(g, 0, 0, 520, 110, 26); g.fill();
  g.fillStyle = '#12031f'; g.font = '900 54px Poppins'; g.fillText('APROVADO(A)', 36, 75);
  g.restore();
  // nome
  g.fillStyle = '#fff';
  let size = 120; g.font = `900 ${size}px Poppins`;
  while (g.measureText(name).width > W - 160 && size > 50) { size -= 4; g.font = `900 ${size}px Poppins`; }
  g.fillText(name, 80, 1080);
  g.fillStyle = '#ffe377'; g.font = '600 56px Poppins';
  g.fillText(`${f.get('curso')} • ${f.get('univ')}`, 80, 1170);
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.setLineDash([12, 12]); g.lineWidth = 3;
  g.beginPath(); g.moveTo(80, 1300); g.lineTo(W - 80, 1300); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '500 40px "DM Sans"';
  g.fillText('Você pode tudo, menos desistir.', 80, 1380);
  g.font = '700 34px "DM Sans"'; g.fillText('@mdmpreoficial', 80, 1440);
  const a = document.createElement('a');
  a.download = `card-aprovado-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
  a.href = c.toDataURL('image/png');
  a.click();
});

function drawLogo(g, color) {
  g.fillStyle = color;
  g.fill(new Path2D('M75.05 26.64A44 44 0 1 1 44.95 26.64L49.4 38.87A31 31 0 1 0 70.6 38.87Z'));
  g.fill(new Path2D('M38 60.1 60 73.3 82 60.1V84.7Q68.8 83.8 60 92.6 51.2 83.8 38 84.7Z'));
  g.fill(new Path2D('M60 4 96 15 60 26 24 15Z'));
  g.fill(new Path2D('M42 19v6q18 9 36 0v-6l-18 6z'));
  g.fillRect(95, 15, 2.2, 14);
  g.beginPath(); g.arc(96, 31.5, 3.2, 0, Math.PI * 2); g.fill();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/* ---------- Logo 3D em camadas (CTA final) ---------- */
const stack = document.createElement('div');
stack.className = 'logo-stack';
const layers = finePointer ? 14 : 6;
for (let i = 0; i < layers; i++) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.innerHTML = '<use href="#logo-mdm"/>';
  s.style.transform = `translateZ(${(i - layers / 2) * 3}px)`;
  s.style.opacity = i === layers - 1 ? 1 : 0.5;
  stack.appendChild(s);
}
$('#logoStack').appendChild(stack);

// animações infinitas de CSS pausam quando a seção sai da tela
const offscreenIO = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
$$('.hero, .tape, .approved, .final').forEach(el => offscreenIO.observe(el));

/* ---------- Botões magnéticos ---------- */
if (finePointer && !reduced) {
  $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .5)' }));
  });
}

/* ---------- Cursor ---------- */
if (finePointer && !reduced) {
  const cur = $('.cursor'), dot = $('.cursor__dot'), ringEl = $('.cursor__ring');
  const xD = gsap.quickTo(dot, 'x', { duration: 0.1 }), yD = gsap.quickTo(dot, 'y', { duration: 0.1 });
  const xR = gsap.quickTo(ringEl, 'x', { duration: 0.45, ease: 'power3' }), yR = gsap.quickTo(ringEl, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', e => { xD(e.clientX); yD(e.clientY); xR(e.clientX); yR(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', e => cur.classList.toggle('is-hover', !!e.target.closest('a, button, .acard, label.opt, label.chip, summary')));
}

addEventListener('load', () => ScrollTrigger.refresh());
