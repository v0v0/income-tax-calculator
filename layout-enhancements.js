(() => {
  "use strict";

  function scrollTo(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  document.getElementById("floatTop")?.addEventListener("click", () => {
    window.scrollTo({ top:0, behavior:"smooth" });
  });

  document.getElementById("floatResult")?.addEventListener("click", () => {
    scrollTo("totalSection");
  });

  document.getElementById("floatDetail")?.addEventListener("click", () => {
    const monthly = document.querySelector('#detailTabs button[data-value="monthly"]');
    if (monthly && !monthly.classList.contains("active")) monthly.click();
    scrollTo("detailSection");
  });
})();