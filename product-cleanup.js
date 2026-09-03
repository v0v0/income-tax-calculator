(() => {
  'use strict';

  const sourceFooter = document.getElementById('sourceFooter');
  if (!sourceFooter) return;

  function cleanProductCopy() {
    let text = sourceFooter.textContent || '';
    text = text
      .replace(/(?:。|；|;|\s)*详细核验记录见仓库\s*DATA_SOURCES\.md\s*[。.]?/gi, '')
      .replace(/[^。！？!?]*DATA_SOURCES\.md[^。！？!?]*[。！？!?]?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[·•｜|、，,；;\s]+|[·•｜|、，,；;\s]+$/g, '')
      .trim();

    if (sourceFooter.textContent !== text) sourceFooter.textContent = text;
    sourceFooter.hidden = !text;
  }

  new MutationObserver(cleanProductCopy).observe(sourceFooter, {
    childList: true,
    subtree: true,
    characterData: true
  });
  cleanProductCopy();
})();
