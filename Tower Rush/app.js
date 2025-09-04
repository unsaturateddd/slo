/* Telegram WebApp integration (safe if not in Telegram) */
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg && tg.ready) {
  try { tg.ready(); } catch (_) {}
}

const elements = {
  statusChip: document.getElementById('statusChip'),
  roomId: document.getElementById('roomId'),
  okBtn: document.getElementById('okBtn'),
  getSignalBtn: document.getElementById('getSignalBtn'),
  signalValue: document.getElementById('signalValue'),
  signalThinking: document.getElementById('signalThinking'),
};

let state = {
  roomId: null,
  cooldownUntilTs: 0,
  thinkingTimer: null,
  cooldownTimer: null,
  lastSignalTs: 0,
  lang: 'en',
};

// ---------------- i18n ----------------
const i18n = {
  ru: {
    'header.title': 'TOWER RUSH',
    'status.ready': 'Готов к сигналу',
    'status.validating': 'Проверка ID…',
    'status.enterId': 'Введите ID игры',
    'status.idAccepted': 'ID принят. Можно получить сигнал',
    'status.requesting': 'Запрос сигнала…',
    'status.waiting': 'Ожидание нового сигнала…',
    'status.okWithValue': (v) => `OK — Ставьте ${v} блок(а/ов) подряд`,
    'room.label': 'ID игры',
    'room.placeholder': 'Введите ID',
    'room.ok': 'OK',
    'room.hint': 'Укажите ID игры. Его нужно ввести только 1 раз.',
    'signal.caption': 'Сколько блоков подряд поставить',
    'cta.get': 'ПОЛУЧИТЬ СИГНАЛ',
    'cta.wait': (s) => `Ожидайте ${s}с`,
    'note.text': 'Если вы сделали больше чем ×2.5 от ставки, забирайте выигрыш! Даже если бот сказал ставить больше блоков.'
  },
  en: {
    'header.title': 'TOWER RUSH',
    'status.ready': 'Ready for signal',
    'status.validating': 'Validating ID…',
    'status.enterId': 'Enter game ID',
    'status.idAccepted': 'ID accepted. You can get a signal',
    'status.requesting': 'Requesting signal…',
    'status.waiting': 'Waiting for next signal…',
    'status.okWithValue': (v) => `OK — Place ${v} blocks in a row`,
    'room.label': 'Game ID',
    'room.placeholder': 'Enter ID',
    'room.ok': 'OK',
    'room.hint': 'Specify the game ID. You need to enter it only once.',
    'signal.caption': 'How many blocks to place in a row',
    'cta.get': 'GET SIGNAL',
    'cta.wait': (s) => `Wait ${s}s`,
    'note.text': 'If you made more than ×2.5 of the bet, take the winnings! Even if the bot said to place more blocks.'
  }
};

function t(key, ...args) {
  const dict = i18n[state.lang] || i18n.ru;
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val || key;
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  elements.getSignalBtn.textContent = t('cta.get');
}

function setLang(lang, userSelected = false) {
  state.lang = (lang === 'en') ? 'en' : 'ru';
  localStorage.setItem('lang', state.lang);
  if (userSelected) {
    localStorage.setItem('lang_user', 'true');
  }
  applyStaticTranslations();
  // highlight buttons
  document.querySelectorAll('.lang-switch .chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.lang));
  });
  // refresh status text to current language keeping semantic meaning
  setStatus(t('status.ready'), 'ok');
}

function initLang() {
  const saved = localStorage.getItem('lang');
  const userSet = localStorage.getItem('lang_user') === 'true';
  if (saved && userSet) {
    state.lang = saved;
  } else {
    state.lang = 'en'; // английский по умолчанию всегда
  }
  setLang(state.lang);
}

function setStatus(text, kind) {
  elements.statusChip.textContent = text;
  elements.statusChip.style.color = kind === 'ok' ? '#22c55e' : (kind === 'warn' ? '#f59e0b' : '#96a2b1');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function enableGetSignal(enable) {
  elements.getSignalBtn.disabled = !enable;
}

function startThinkingAnimation(durationMs) {
  const dots = elements.signalThinking.querySelectorAll('.dot');
  let i = 0;
  elements.signalThinking.hidden = false;
  elements.signalThinking.classList.add('active');
  dots.forEach(d => d.classList.remove('visible'));
  state.thinkingTimer = setInterval(() => {
    dots.forEach(d => d.classList.remove('visible'));
    for (let k = 0; k <= i && k < dots.length; k++) {
      dots[k].classList.add('visible');
    }
    i = (i + 1) % 3; // 1 to 3 loop-like
  }, 250);

  return new Promise(resolve => setTimeout(resolve, durationMs)).finally(stopThinkingAnimation);
}

function stopThinkingAnimation() {
  if (state.thinkingTimer) clearInterval(state.thinkingTimer);
  state.thinkingTimer = null;
  elements.signalThinking.classList.remove('active');
  elements.signalThinking.hidden = true;
}

function randomSignal() {
  return Math.floor(Math.random() * 6) + 1; // 1-6
}

function startCooldown(seconds) {
  state.cooldownUntilTs = Date.now() + seconds * 1000;
  updateCooldownUI();
  state.cooldownTimer = setInterval(updateCooldownUI, 250);
}

function updateCooldownUI() {
  const msLeft = state.cooldownUntilTs - Date.now();
  if (msLeft <= 0) {
    clearInterval(state.cooldownTimer);
    state.cooldownTimer = null;
    elements.getSignalBtn.textContent = t('cta.get');
    enableGetSignal(true);
    setStatus(t('status.ready'), 'ok');
    return;
  }
  const sLeft = Math.ceil(msLeft / 1000);
  elements.getSignalBtn.textContent = t('cta.wait', sLeft);
  enableGetSignal(false);
  setStatus(t('status.waiting'), 'warn');
}

// OK click flow
elements.okBtn.addEventListener('click', async () => {
  const id = (elements.roomId.value || '').trim();
  if (!id) {
    setStatus(t('status.enterId'), 'warn');
    elements.roomId.focus();
    return;
  }
  elements.okBtn.disabled = true;
  setStatus(t('status.validating'), 'warn');
  await sleep(1000);
  state.roomId = id;
  setStatus(t('status.idAccepted'), 'ok');
  enableGetSignal(true);
  elements.getSignalBtn.classList.remove('striped');
});

// Get signal flow
elements.getSignalBtn.addEventListener('click', async () => {
  if (elements.getSignalBtn.disabled) return;
  if (!state.roomId) return; // safety

  const now = Date.now();
  const sinceLast = now - (state.lastSignalTs || 0);

  // Если повторное нажатие в течение 5с после выдачи — запускаем кулдаун
  if (state.lastSignalTs && sinceLast < 5000) {
    startCooldown(30);
    return;
  }

  enableGetSignal(false);
  elements.signalValue.textContent = '-';
  setStatus(t('status.requesting'), 'warn');

  await startThinkingAnimation(1500);
  const value = randomSignal();
  elements.signalValue.textContent = String(value);
  setStatus(t('status.okWithValue', value), 'ok');

  state.lastSignalTs = Date.now();
  // кнопку снова можно нажать (для проверки условия 2с)
  enableGetSignal(true);
});

// Misc UX
elements.roomId.addEventListener('keydown', e => {
  if (e.key === 'Enter') elements.okBtn.click();
});

// Разрешаем только цифры и максимум 9 символов
elements.roomId.addEventListener('input', () => {
  const digitsOnly = elements.roomId.value.replace(/\D+/g, '').slice(0, 9);
  if (elements.roomId.value !== digitsOnly) {
    const pos = elements.roomId.selectionStart;
    elements.roomId.value = digitsOnly;
    elements.roomId.setSelectionRange(pos - 1, pos - 1);
  }
});

// Language switch handlers
document.querySelectorAll('.lang-switch .chip').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang, true));
});

// Init
initLang();


