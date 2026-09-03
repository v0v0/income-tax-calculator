(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pendingHash = location.hash.startsWith('#s=') ? location.hash.slice(3) : '';
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
    for (let i=0; i<bytes.length; i+=chunk) binary += String.fromCharCode(...bytes.subarray(i, i+chunk));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64UrlToBytes(text) {
    const padded = text.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-text.length%4)%4);
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

  async function encodeState(shared) {
    const raw = new TextEncoder().encode(JSON.stringify(shared));
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
    const shared = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(shared) || shared[0] !== 1) throw new Error('unsupported share version');
    return shared;
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
    const saved = Array.isArray(s[20]) ? s[20] : [];
    deductions.forEach(({check,input}, i) => {
      const row = saved[i];
      if (!Array.isArray(row)) return;
      check.checked = !!row[0];
      if (input && Number.isFinite(Number(row[1]))) input.value = String(row[1]);
    });
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

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {
        console.debug('clipboard API unavailable, falling back', err);
      }
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly','');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  async function nativeShare(url) {
    if (!navigator.share) return false;
    await navigator.share({ url });
    return true;
  }

  function ensureShareDialog() {
    let overlay = $('shareLinkOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'shareLinkOverlay';
    overlay.className = 'share-link-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<section class="share-link-card" role="dialog" aria-modal="true" aria-labelledby="shareLinkTitle">
      <button class="share-link-close" type="button" aria-label="关闭">×</button>
      <h3 id="shareLinkTitle">已复制</h3>
      <a id="shareLinkUrl" class="share-link-open" href="#" target="_blank" rel="noopener"></a>
      <button id="shareCopyAndShare" class="share-link-action" type="button">复制并分享</button>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('.share-link-close')) overlay.hidden = true;
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !overlay.hidden) overlay.hidden = true;
    });
    return overlay;
  }

  function presentShareUrl(url) {
    const overlay = ensureShareDialog();
    const link = $('shareLinkUrl');
    const action = $('shareCopyAndShare');
    link.href = url;
    link.textContent = url;
    action.onclick = async () => {
      try {
        await copyText(url);
        if (navigator.share) {
          try {
            await nativeShare(url);
          } catch (err) {
            if (err?.name !== 'AbortError') {
              console.error(err);
              showToast('链接已复制，系统分享未能打开');
            }
          }
        } else {
          showToast('链接已复制');
        }
      } catch (err) {
        console.error(err);
        showToast('复制分享链接失败，请重试');
      }
    };
    overlay.hidden = false;
  }

  function scheduleNativeShare(url) {
    if (!navigator.share) return;
    setTimeout(async () => {
      try {
        await nativeShare(url);
      } catch (err) {
        if (err?.name !== 'AbortError') console.debug('automatic native share was not allowed', err);
      }
    }, 1000);
  }

  async function shareCurrentState() {
    const button = $('floatShare');
    try {
      const url = await makeShareUrl();
      await copyText(url);
      presentShareUrl(url);
      button?.classList.add('share-success');
      setTimeout(() => button?.classList.remove('share-success'), 900);
      scheduleNativeShare(url);
    } catch (err) {
      console.error(err);
      showToast('生成分享 URL 失败，请重试');
    }
  }

  function simplifyFooterTools() {
    const tools = document.querySelector('.tool-links');
    if (!tools) return;
    tools.innerHTML = '更多工具：<a href="https://v0v0.github.io/mortgage-calculator/">房贷利率计算器 ↗</a>';
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
      const shared = await decodeState(pendingHash);
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
          applyState(shared);
          showToast('已应用分享 URL 中的配置');
        } catch (err) {
          console.error(err);
          showToast('分享 URL 无效或已过期');
        }
      }, 50);
    } catch (err) {
      console.error(err);
      showToast('分享 URL 无法解析');
    }
  }

  simplifyFooterTools();
  bindFloatingTools();
  restoreSharedState();
})();
