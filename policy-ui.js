(() => {
  'use strict';
  const source = document.getElementById('contributionBody');
  const target = document.getElementById('socialPolicyRangeText');
  if (!source || !target) return;

  function syncSocialRangeText() {
    const rows = [...source.querySelectorAll('tr')]
      .filter(row => !row.classList.contains('fund-source-row'))
      .map(row => [...row.cells].map(cell => cell.textContent.trim()))
      .filter(cells => cells.length >= 2 && cells[0] && cells[1]);
    if (!rows.length) return;

    const groups = new Map();
    for (const cells of rows) {
      const range = cells[1];
      if (!groups.has(range)) groups.set(range, []);
      groups.get(range).push(cells[0]);
    }

    if (groups.size === 1) {
      const [[range]] = groups.entries();
      target.textContent = `当前五险缴费基数范围：${range}；实际参与计算的基数见下表。`;
      return;
    }

    const detail = [...groups.entries()]
      .map(([range, names]) => `${names.join('、')} ${range}`)
      .join('；');
    target.textContent = `当前各险种缴费基数范围：${detail}。实际参与计算的基数见下表。`;
  }

  new MutationObserver(syncSocialRangeText).observe(source, { childList:true, subtree:true });
  syncSocialRangeText();
})();
