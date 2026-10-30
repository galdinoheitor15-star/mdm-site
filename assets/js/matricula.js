// Sistema de pré-matrícula: assistente em 4 passos, validação, protocolo, WhatsApp e planilha opcional.
(function () {
  const CFG = window.MDM_CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const DRAFT_KEY = 'mdm-matricula-rascunho';

  const dlg = $('#enroll');
  const form = $('#enrollForm');
  const steps = $$('.step', form);
  const stepNav = $$('#enrollSteps li');
  const nav = $('#enrollNav');
  const nextBtn = $('#nextStep');
  const prevBtn = $('#prevStep');
  let current = 1;
  let lastData = null;

  // ---------- opções a partir do config ----------
  $('#optCursos').innerHTML = CFG.cursos.map(c => `
    <label class="opt"><input type="radio" name="curso" value="${c.id}"><span class="opt__box"><b>${c.nome}</b><small>${c.tag}</small></span></label>`).join('');
  $('#optTurnos').innerHTML = CFG.turnos.map(t => `
    <label class="chip"><input type="radio" name="turno" value="${t}"><span>${t}</span></label>`).join('');
  $('#optSeries').insertAdjacentHTML('beforeend', CFG.series.map(s => `<option>${s}</option>`).join(''));

  // ---------- abrir / fechar ----------
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-matricula]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.matricula);
  });
  if (location.hash === '#matricula') setTimeout(() => open(), 2200);

  function open(cursoId) {
    restoreDraft();
    if (cursoId) {
      const r = form.querySelector(`input[name="curso"][value="${cursoId}"]`);
      if (r) r.checked = true;
    }
    goTo(1, false);
    dlg.showModal();
    window.MDM_LENIS?.stop();
    document.documentElement.style.overflow = 'hidden';
  }
  function close() { dlg.close(); }
  dlg.addEventListener('close', () => {
    window.MDM_LENIS?.start();
    document.documentElement.style.overflow = '';
    if (current === 'done') { form.reset(); goTo(1, false); }
  });
  $('#enrollClose').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

  // ---------- navegação ----------
  function goTo(n, back) {
    current = n;
    steps.forEach(s => {
      const active = String(s.dataset.step) === String(n);
      s.classList.toggle('is-active', active);
      s.classList.toggle('is-back', active && !!back);
    });
    const idx = n === 'done' ? 5 : n;
    stepNav.forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === idx);
      li.classList.toggle('is-done', i + 1 < idx);
    });
    $('#enrollBar').style.width = `${Math.min(idx, 4) * 25}%`;
    nav.hidden = n === 'done';
    nav.classList.toggle('is-first', n === 1);
    nextBtn.textContent = n === 4 ? 'Finalizar pré-matrícula' : 'Continuar';
    if (n === 4) renderReview();
    $('.enroll__main').scrollTop = 0;
    const first = form.querySelector(`.step[data-step="${n}"] input:not([type=hidden]), .step[data-step="${n}"] select`);
    if (first && n !== 1 && matchMedia('(pointer: fine)').matches) setTimeout(() => first.focus({ preventScroll: true }), 50);
  }

  prevBtn.addEventListener('click', () => { if (current > 1) goTo(current - 1, true); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate(current)) return;
    saveDraft();
    if (current < 4) return goTo(current + 1);
    await finish();
  });

  // ---------- máscaras ----------
  const maskPhone = v => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  };
  const maskCPF = v => v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  form.addEventListener('input', e => {
    const t = e.target;
    if (t.type === 'tel') t.value = maskPhone(t.value);
    if (t.name === 'cpf') t.value = maskCPF(t.value);
    if (t.name === 'nascimento') toggleGuardian();
    if (t.closest('.field')?.classList.contains('has-error')) setError(t.name, '');
    if (t.name === 'curso' || t.name === 'turno' || t.name === 'aceite') setError(t.name, '');
    saveDraft();
  });

  // ---------- validação ----------
  const age = () => {
    const v = form.nascimento.value;
    if (!v) return null;
    const b = new Date(v + 'T12:00:00'), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };
  function toggleGuardian() { const a = age(); $('#guardian').hidden = !(a !== null && a < 18); }

  function cpfValid(c) {
    c = c.replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (let t = 9; t < 11; t++) {
      let s = 0;
      for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
      if (((10 * s) % 11) % 10 !== +c[t]) return false;
    }
    return true;
  }

  function setError(name, msg) {
    const el = form.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = msg;
    const input = form.elements[name];
    const field = input && (input.closest ? input.closest('.field') : null);
    if (field) field.classList.toggle('has-error', !!msg);
  }

  function validate(n) {
    const errs = {};
    const v = name => (form.elements[name]?.value || '').trim();
    if (n === 1) {
      if (!v('curso')) errs.curso = 'Escolha um curso para continuar.';
      if (!v('turno')) errs.turno = 'Escolha o turno de preferência.';
    }
    if (n === 2) {
      if (v('nome').split(/\s+/).length < 2) errs.nome = 'Digite nome e sobrenome.';
      const a = age();
      if (a === null) errs.nascimento = 'Informe a data de nascimento.';
      else if (a < 3 || a > 90) errs.nascimento = 'Confira a data de nascimento.';
      if (v('cpf') && !cpfValid(v('cpf'))) errs.cpf = 'CPF inválido — confira os números ou deixe em branco.';
      if (!v('serie')) errs.serie = 'Selecione a série.';
    }
    if (n === 3) {
      if (v('whatsapp').replace(/\D/g, '').length < 10) errs.whatsapp = 'WhatsApp incompleto.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errs.email = 'E-mail inválido.';
      if (!$('#guardian').hidden) {
        if (v('respNome').length < 5) errs.respNome = 'Nome do responsável.';
        if (v('respWhatsapp').replace(/\D/g, '').length < 10) errs.respWhatsapp = 'WhatsApp do responsável incompleto.';
      }
    }
    if (n === 4 && !form.aceite.checked) errs.aceite = 'Marque a autorização para concluir.';

    const scope = form.querySelector(`.step[data-step="${n}"]`);
    $$('[data-error-for]', scope).forEach(el => setError(el.dataset.errorFor, ''));
    Object.entries(errs).forEach(([k, m]) => setError(k, m));
    const firstKey = Object.keys(errs)[0];
    if (firstKey) {
      const el = form.elements[firstKey];
      const focusEl = el instanceof RadioNodeList ? el[0] : el;
      focusEl?.focus?.({ preventScroll: false });
      scope.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 360, easing: 'ease-out' });
      return false;
    }
    return true;
  }

  // ---------- revisão ----------
  function collect() {
    const f = new FormData(form);
    const d = Object.fromEntries(f.entries());
    const curso = CFG.cursos.find(c => c.id === d.curso);
    d.cursoNome = curso ? curso.nome : d.curso;
    d.menor = !$('#guardian').hidden;
    if (!d.menor) { delete d.respNome; delete d.respWhatsapp; }
    delete d.aceite;
    return d;
  }
  const fmtDate = s => s ? s.split('-').reverse().join('/') : '';
  function rows(d) {
    const r = [
      ['Curso', d.cursoNome], ['Turno', d.turno], ['Aluno', d.nome], ['Nascimento', fmtDate(d.nascimento)],
      ['Série', d.serie], ['Escola', d.escola], ['CPF', d.cpf], ['WhatsApp', d.whatsapp], ['E-mail', d.email],
      ['Bairro/cidade', d.bairro], ['Responsável', d.respNome], ['WhatsApp resp.', d.respWhatsapp],
      ['Como conheceu', d.origem], ['Observações', d.obs]
    ];
    return r.filter(([, v]) => v);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderReview() {
    $('#review').innerHTML = rows(collect()).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  }

  // ---------- finalizar ----------
  async function finish() {
    const d = collect();
    const now = new Date();
    d.protocolo = `MDM-${CFG.anoLetivo}-${now.getTime().toString(36).slice(-4).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
    d.dataHora = now.toLocaleString('pt-BR');
    lastData = d;

    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando…';
    if (CFG.endpointMatricula) {
      try {
        await fetch(CFG.endpointMatricula, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) });
      } catch (err) { console.warn('Falha ao enviar para a planilha; segue pelo WhatsApp.', err); }
    }
    nextBtn.disabled = false;

    try {
      const list = JSON.parse(localStorage.getItem('mdm-minhas-matriculas') || '[]');
      list.push({ protocolo: d.protocolo, curso: d.cursoNome, data: d.dataHora });
      localStorage.setItem('mdm-minhas-matriculas', JSON.stringify(list));
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* armazenamento indisponível */ }

    $('#protocol').textContent = d.protocolo;
    const msg = [
      `*Pré-matrícula ${CFG.anoLetivo} — ${CFG.nome}*`,
      `Protocolo: *${d.protocolo}*`, '',
      ...rows(d).map(([k, v]) => `• ${k}: ${v}`), '',
      'Gostaria de confirmar minha matrícula e receber os valores. 💜'
    ].join('\n');
    $('#sendWa').href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`;
    goTo('done');
    confetti($('#confetti'));
  }

  // ---------- comprovante ----------
  $('#printReceipt').addEventListener('click', () => {
    if (!lastData) return;
    $('#receipt').innerHTML = `
      <h1>${esc(CFG.nome)}</h1>
      <p>Comprovante de pré-matrícula ${CFG.anoLetivo} — ${esc(lastData.dataHora)}</p>
      <p class="proto">Protocolo: ${esc(lastData.protocolo)}</p>
      <table>${rows(lastData).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>
      <p style="margin-top:20px">A vaga é confirmada após contato da secretaria: ${esc(CFG.whatsappExibicao)} · ${esc(CFG.endereco)}</p>`;
    window.print();
  });

  // ---------- rascunho (conveniência local) ----------
  function saveDraft() {
    try {
      const d = Object.fromEntries(new FormData(form).entries());
      delete d.aceite;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) { /* ignore */ }
  }
  function restoreDraft() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!d) return;
    Object.entries(d).forEach(([k, v]) => {
      const el = form.elements[k];
      if (!el) return;
      if (el instanceof RadioNodeList) { const r = [...el].find(x => x.value === v); if (r) r.checked = true; }
      else el.value = v;
    });
    toggleGuardian();
  }

  // ---------- confete ----------
  function confetti(canvas) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#7b2cf0', '#9b5cff', '#ffcf1f', '#ffffff', '#c9a8ff'];
    const parts = Array.from({ length: 160 }, () => ({
      x: rect.width / 2, y: rect.height * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0]
    }));
    let frame = 0;
    (function loop() {
      ctx.clearRect(0, 0, rect.width, rect.height);
      parts.forEach(p => {
        p.vy += 0.38; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.scale(1, Math.cos(frame * 0.1 + p.r));
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (++frame < 220) requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    })();
  }
})();
