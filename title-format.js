(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function numberAt(id) {
    const value = Number($(id)?.value || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function compactMoney(value) {
    const amount = Math.max(0, Number(value || 0));
    if (amount >= 10000) {
      const wan = Number((amount / 10000).toFixed(2));
      return `${wan}万`;
    }
    return `${Math.round(amount)}元`;
  }

  function cityName() {
    const raw = $('city')?.selectedOptions?.[0]?.textContent?.trim() || '';
    return raw.replace(/^\d+\.\s*/, '').split(/[·|｜]/)[0].trim() || '全国';
  }

  function annualBonusAmount() {
    const mode = $('bonusInputMode')?.value || 'months';
    if (mode === 'amount') return numberAt('bonusAmount');
    return numberAt('salary') * numberAt('bonusMonths');
  }

  function formattedTitle() {
    return `${cityName()}税后·月薪${compactMoney(numberAt('salary'))}·年终${compactMoney(annualBonusAmount())}`;
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

  let applying = false;
  function applyTitle() {
    if (applying) return formattedTitle();
    applying = true;
    try {
      const title = formattedTitle();
      if (document.title !== title) document.title = title;
      ensureMeta('meta[property="og:title"]', { property:'og:title' }).setAttribute('content', title);
      ensureMeta('meta[name="twitter:title"]', { name:'twitter:title' }).setAttribute('content', title);
      ensureMeta('meta[itemprop="name"]', { itemprop:'name' }).setAttribute('content', title);
      return title;
    } finally {
      applying = false;
    }
  }

  function queueApply() {
    queueMicrotask(applyTitle);
  }

  document.addEventListener('input', queueApply, true);
  document.addEventListener('change', queueApply, true);
  document.addEventListener('click', queueApply, false);

  const city = $('city');
  if (city) new MutationObserver(queueApply).observe(city, { childList:true });

  const titleNode = document.querySelector('title');
  if (titleNode) {
    new MutationObserver(() => {
      if (!applying && document.title !== formattedTitle()) queueApply();
    }).observe(titleNode, { childList:true, characterData:true, subtree:true });
  }

  const originalShare = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : null;
  if (originalShare) {
    const wrappedShare = data => {
      const title = applyTitle();
      return originalShare({ ...(data || {}), title, text:title });
    };
    try {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: wrappedShare
      });
    } catch (_) {
      try { navigator.share = wrappedShare; } catch (_) {}
    }
  }

  applyTitle();
  setTimeout(applyTitle, 50);
  setTimeout(applyTitle, 400);
  setTimeout(applyTitle, 1200);
})();
