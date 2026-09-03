(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pendingHash = location.hash.startsWith('#s=') ? location.hash.slice(3) : '';

  // Remove shared financial state from the address bar before third-party analytics loads.
  if (pendingHash) history.replaceState(null, '', location.pathname + location.search);

  const modeIndex = (value, values) => Math.max(0, values.indexOf(value));
  const valueAt = (id, fallback='') => $(id)?.value ?? fallback;
  const numberAt = (id, fallback=0) => {
    const v = Number(valueAt(id, fallback));
    return Number.isFinite(v) ? v : fallback;
  };

  function deductionNodes() {
    return [...document.querySelectorAll('#deductionGrid input[type="checkbox"][id^="deduction-"]')]
      .map(check => ({
        check,
        input: document.getElementById(`deduction-amount-${check.id.slice('deduction-'.length)}`)
      }));
  }

  function collectState() {
    const deductions = deductionNodes().map(({check,input}) => [check.checked ? 1 : 0, Number(input?.value || 0)]);
    return [
      1,
      valueAt('city'),
      numberAt('salary'),
      modeIndex(valueAt('bonusInputMode'), ['months','amount']),
      numberAt('bonusMonths'),
      numberAt('bonusAmount'),
      numberAt('bonusMonth', 12),
      modeIndex(valueAt('bonusTaxModeSelect'), ['auto','separate','merged']),
      modeIndex(valueAt('socialBaseMode'), ['auto','custom']),
      numberAt('socialBaseCustom'),
      modeIndex(valueAt('fundBaseMode'), ['auto','custom']),
      numberAt('fundBaseCustom'),
      modeIndex(valueAt('fundRateMode'), ['default','custom']),
      numberAt('personalFundRate'),
      numberAt('employerFundRate'),
      numberAt('newSalary'),
      modeIndex(valueAt('newBonusInputMode'), ['months','amount']),
      numberAt('newBonusMonths'),
      numberAt('newBonusAmount'),
      $('advancedCompare')?.open ? 1 : 0,
      deductions
    ];
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i=0; i<bytes.length; i+=chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i+chunk));
    }
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64UrlToBytes(text) {
    const padded = text.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - text.length % 4) % 4);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i=0; i<binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function gzip(bytes) {
    if (!('CompressionStream' in window)) return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('decompression unsupported');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function encodeState(state) {
    const raw = new TextEncoder().encode(JSON.stringify(state));
    const compressed = await gzip(raw);
    if (compressed && compressed.length + 3 < raw.length) return `z${bytesToBase64Url(compressed)}`;
    return `u${bytesToBase64Url(raw)}`;
  }

  async function decodeState(payload) {
    if (!payload || payload.length < 2) throw new Error('invalid share payload');
    const kind = payload[0];
    let bytes = base64UrlToBytes(payload.slice(1));
    if (kind === 'z') bytes = await gunzip(bytes);
    else if (kind !== 'u') throw new Error('unknown share payload');
    const state = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(state) || state[0] !== 1) throw new Error('unsupported share version');
    return state;
  }

  function setValue(id, value) {
    const el = $(id);
    if (el && value !== undefined && value !== null) el.value = String(value);
  }

  function applyState(s) {
    const city = $('city');
    if (!city || !city.options.length) throw new Error('city options unavailable');
    if ([...city.options].some(option => option.value === String(s[1]))) city.value = String(s[1]);

    setValue('salary', s[2]);
    setValue('bonusInputMode', ['months','amount'][s[3]] || 'months');
    setValue('bonusMonths', s[4]);
    setValue('bonusAmount', s[5]);
    setValue('bonusMonth', s[6]);
    setValue('bonusTaxModeSelect', ['auto','separate','merged'][s[7]] || 'auto');
    setValue('socialBaseMode', ['auto','custom'][s[8]] || 'auto');
    setValue('socialBaseCustom', s[9]);
    setValue('fundBaseMode', ['auto','custom'][s[10]] || 'auto');
    setValue('fundBaseCustom', s[11]);
    setValue('fundRateMode', ['default','custom'][s[12]] || 'default');
    setValue('personalFundRate', s[13]);
    setValue('employerFundRate', s[14]);
    setValue('newSalary', s[15]);
    setValue('newBonusInputMode', ['months','amount'][s[16]] || 'months');
    setValue('newBonusMonths', s[17]);
    setValue('newBonusAmount', s[18]);
    if ($('advancedCompare')) $('advancedCompare').open = !!s[19];

    const deductions = deductionNodes();
    const savedDeductions = Array.isArray(s[20]) ? s[20] : [];
    deductions.forEach(({check,input}, i) => {
      const row = savedDeductions[i];
      if (!Array.isArray(row)) return;
      check.checked = !!row[0];
      if (input && Number.isFinite(Number(row[1]))) input.value = String(row[1]);
    });

    // app.js reads every other setting from the DOM when this change triggers update().
    $('bonusTaxModeSelect')?.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function showToast(text) {
    const toast = $('shareToast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  async function makeShareUrl() {
    const encoded = await encodeState(collectState());
    return `${location.origin}${location.pathname}${location.search}#s=${encoded}`;
  }

  async function shareCurrentState() {
    const button = $('floatShare');
    try {
      const url = await makeShareUrl();
      if (navigator.share) {
        try {
          await navigator.share({ title:'税后收入计算器', text:'打开后自动应用我分享的收入测算配置', url });
          showToast(`已生成分享链接（${url.length} 字符）`);
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      button?.classList.add('share-success');
      setTimeout(() => button?.classList.remove('share-success'), 900);
      showToast(`分享链接已复制（${url.length} 字符）`);
    } catch (err) {
      console.error(err);
      showToast('生成分享链接失败，请重试');
    }
  }

  function bindFloatingTools() {
    $('floatTop')?.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
    $('floatResult')?.addEventListener('click', () => $('totalSection')?.scrollIntoView({ behavior:'smooth', block:'start' }));
    $('floatDetail')?.addEventListener('click', () => $('detailSection')?.scrollIntoView({ behavior:'smooth', block:'start' }));
    $('floatShare')?.addEventListener('click', shareCurrentState);
  }

  async function restoreSharedState() {
    if (!pendingHash) return;
    try {
      const state = await decodeState(pendingHash);
      const started = Date.now();
      const timer = setInterval(() => {
        const ready = $('city')?.options.length && deductionNodes().length;
        if (!ready && Date.now() - started < 5000) return;
        clearInterval(timer);
        if (!ready) {
          showToast('分享配置加载失败：页面数据尚未就绪');
          return;
        }
        try {
          applyState(state);
          showToast('已应用分享链接中的配置');
        } catch (err) {
          console.error(err);
          showToast('分享配置无效或已过期');
        }
      }, 50);
    } catch (err) {
      console.error(err);
      showToast('分享配置无法解析');
    }
  }

  bindFloatingTools();
  restoreSharedState();
})();
