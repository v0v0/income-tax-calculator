(() => {
  'use strict';

  const source = document.getElementById('contributionBody');
  if (!source) return;

  const text = id => document.getElementById(id);

  function syncFundDetails() {
    const rows = [...source.querySelectorAll('tr')];
    const fundRow = rows.find(row => row.textContent.includes('住房公积金'));
    if (!fundRow) return;
    const cells = [...fundRow.cells].map(cell => cell.textContent.trim());
    if (cells.length < 6) return;

    const range = text('fundPolicyRange');
    const base = text('fundActualBase');
    const rate = text('fundPersonalRateText');
    if (range) range.textContent = cells[1] || '—';
    if (base) base.textContent = cells[2] || '—';
    if (rate) rate.textContent = cells[3] || '—';
  }

  new MutationObserver(syncFundDetails).observe(source, { childList: true, subtree: true });
  syncFundDetails();
})();
