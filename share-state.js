(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pendingHash = location.hash.startsWith('#s=') ? location.hash.slice(3) : '';
  let currentShareUrl = '';
  let currentShareTitle = '';
  let autoShareTimer = null;

  if (pendingHash) history.replaceState(null, '', location.pathname + location.search);

  const modeIndex = (value, values) => Math.max(0, values.indexOf(value));
  const valueAt = (id, fallback='') => $(id)?.value ?? fallback;
  const numberAt = (id, fallback=0) => {
    const value = Number(valueAt(id, fallback));
    return Number.isFinite(value) ? value : fallback;
  };

  function installBranding() {
    const iconHref = './favicon.svg?v=20260904-2';
    const existing = document.querySelector('link[rel="icon"]');
    if (existing) {
      existing.href = iconHref;
      existing.type = 'image/svg+xml';
      existing.setAttribute('sizes', 'any');
    }
    if (!document.querySelector('link[data-shortcut-icon]')) {
      const shortcut = document.createElement('link');
      shortcut.rel = 'shortcut icon';
      shortcut.type = 'image/svg+xml';
      shortcut.href = iconHref;
      shortcut.dataset.shortcutIcon = '1';
      document.head.appendChild(shortcut);
    }

    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', '#eaf3ff');

    const hero = document.querySelector('.hero');
    const heading = hero?.querySelector('h1');
    if (hero && heading && !hero.querySelector('.brand-lockup')) {
      const lockup = document.createElement('div');
      lockup.className = 'brand-lockup';
      const mark = document.createElement('img');
      mark.className = 'brand-mark';
      mark.src = iconHref;
      mark.alt = '';
      mark.width = 42;
      mark.height = 42;
      heading.insertAdjacentElement('beforebegin', lockup);
      lockup.append(mark, heading);
      const subtitle = document.createElement('p');
      subtitle.className = 'hero-subtitle';
      subtitle.textContent = '中国大陆主要城市 · 工资 / 年终奖 / 五险一金 / 专项扣除';
      lockup.insertAdjacentElement('afterend', subtitle);
    }
  }

  function compactAmount(value) {
    const amount = Math.max(0, Number(value || 0));
    if (amount >= 10000) {
      const wan = amount / 10000;
      return `${Number.isInteger(wan) ? wan.toFixed(0) : Number(wan.toFixed(2))}万`;
    }
    return `${Math.round(amount)}元`;
  }

  function cityTitle() {
    const raw = $('city')?.selectedOptions?.[0]?.textContent?.trim() || '';
    return raw.replace(/^\d+\.\s*/, '').split(/[·|｜]/)[0].trim() || '全国';
  }

  function bonusTitle() {
    const mode = valueAt('bonusInputMode', 'months');
    if (mode === 'months') {
      const months = Math.max(0, numberAt('bonusMonths'));
      if (!months) return '无年终奖';
      const text = Number.isInteger(months) ? months.toFixed(0) : String(Number(months.toFixed(1)));
      return `${text}月奖`;
    }
    const amount = Math.max(0, numberAt('bonusAmount'));
    return amount ? `${compactAmount(amount)}年终奖` : '无年终奖';
  }

  function buildShareTitle() {
    const salary = Math.max(0, numberAt('salary'));
    return `税后计算-${cityTitle()}${compactAmount(salary)}月薪-${bonusTitle()}`;
  }

  function ensureMeta(selector, attrs) {
    let node = document.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      document.head.appendChild(node);
    }
    return node;
  }

  function updatePageTitle() {
    const title = buildShareTitle();
    const description = `${cityTitle()}税后收入方案：${compactAmount(numberAt('salary'))}月薪，${bonusTitle()}。`;
    document.title = title;

    ensureMeta('meta[property="og:title"]', { property:'og:title' }).setAttribute('content', title);
    ensureMeta('meta[property="og:description"]', { property:'og:description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:type"]', { property:'og:type' }).setAttribute('content', 'website');
    ensureMeta('meta[name="twitter:title"]', { name:'twitter:title' }).setAttribute('content', title);
    ensureMeta('meta[itemprop="name"]', { itemprop:'name' }).setAttribute('content', title);
    currentShareTitle = title;
    return title;
  }

  function installLiveTitle() {
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        updatePageTitle();
      });
    };
    document.addEventListener('input', queue, true);
    document.addEventListener('change', queue, true);
    document.addEventListener('click', queue, false);
    const city = $('city');
    if (city) new MutationObserver(queue).observe(city, { childList:true });
    setTimeout(queue, 50);
    setTimeout(queue, 400);
    setTimeout(queue, 1200);
  }

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
    updatePageTitle();
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
    return `${location.origin}${location.pathname}#s=${encoded}`;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}

    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.readOnly = true;
      input.setAttribute('aria-hidden','true');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.top = '0';
      input.style.fontSize = '16px';
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, input.value.length);
      const copied = document.execCommand('copy');
      input.remove();
      return copied;
    } catch (_) {
      return false;
    }
  }

  function ensureSharePanel() {
    if ($('sharePanelBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'sharePanelBackdrop';
    backdrop.className = 'share-panel-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="share-panel" role="dialog" aria-modal="true" aria-labelledby="sharePanelTitle">
        <div class="share-panel-head">
          <div>
            <h3 id="sharePanelTitle">分享当前方案</h3>
            <p>链接打开后会自动恢复当前收入测算方案。</p>
          </div>
          <button id="sharePanelClose" type="button" class="share-close" aria-label="关闭分享界面">×</button>
        </div>
        <label class="share-url-label">分享链接
          <textarea id="shareUrlValue" rows="4" readonly spellcheck="false" aria-label="分享链接"></textarea>
        </label>
        <p id="sharePanelStatus" class="share-panel-status" role="status" aria-live="polite">已复制</p>
        <div class="share-panel-actions">
          <button id="shareCopyAndShare" type="button" class="share-copy-and-share">复制并分享</button>
        </div>
      </section>`;
    document.body.appendChild(backdrop);

    $('sharePanelClose')?.addEventListener('click', closeSharePanel);
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeSharePanel();
    });
    $('shareCopyAndShare')?.addEventListener('click', shareFromPanel);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !backdrop.hidden) closeSharePanel();
    });
  }

  function openSharePanel(url) {
    ensureSharePanel();
    currentShareUrl = url;
    currentShareTitle = updatePageTitle();
    const field = $('shareUrlValue');
    const status = $('sharePanelStatus');
    if (field) field.value = url;
    if (status) status.textContent = '已复制';
    const backdrop = $('sharePanelBackdrop');
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add('share-panel-open');
  }

  function closeSharePanel() {
    clearTimeout(autoShareTimer);
    autoShareTimer = null;
    const backdrop = $('sharePanelBackdrop');
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('share-panel-open');
  }

  async function triggerSystemShare(url, title) {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text:title, url });
      return true;
    } catch (error) {
      if (error?.name !== 'AbortError') console.debug('system share unavailable', error);
      return false;
    }
  }

  function scheduleNativeShare(url, title) {
    clearTimeout(autoShareTimer);
    if (!navigator.share) return;
    autoShareTimer = setTimeout(() => {
      triggerSystemShare(url, title);
    }, 1000);
  }

  async function shareFromPanel() {
    if (!currentShareUrl) return;
    const title = updatePageTitle();
    const copied = await copyText(currentShareUrl);
    const status = $('sharePanelStatus');
    if (status) status.textContent = copied ? '已复制' : '复制失败，可长按链接复制';
    if (navigator.share) await triggerSystemShare(currentShareUrl, title);
  }

  async function shareCurrentState() {
    const button = $('floatShare');
    try {
      const title = updatePageTitle();
      const url = await makeShareUrl();
      const copied = await copyText(url);
      openSharePanel(url);
      const status = $('sharePanelStatus');
      if (status) status.textContent = copied ? '已复制' : '复制失败，可长按链接复制';
      button?.classList.add('share-success');
      setTimeout(() => button?.classList.remove('share-success'), 900);
      scheduleNativeShare(url, title);
    } catch (error) {
      console.error(error);
      showToast('生成分享链接失败，请重试');
    }
  }

  function simplifyFooterTools() {
    const tools = document.querySelector('.tool-links');
    if (!tools) return;
    tools.innerHTML = '更多工具：<a href="https://v0v0.github.io/mortgage-calculator/">房贷利率计算器 ↗</a>';
  }

  function bindShareButton() {
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
          showToast('已应用分享链接中的配置');
        } catch (error) {
          console.error(error);
          showToast('分享链接无效或已过期');
        }
      }, 50);
    } catch (error) {
      console.error(error);
      showToast('分享链接无法解析');
    }
  }

  installBranding();
  installLiveTitle();
  ensureSharePanel();
  simplifyFooterTools();
  bindShareButton();
  restoreSharedState();
})();
