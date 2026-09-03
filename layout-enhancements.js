(() => {
  "use strict";

  const FAVICON_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAE7ElEQVR42u2bXWwUVRTHz52d7tLRhhS2LaJixQAPSEyQECPGmBofTE2x5cMmkIhGkKqB2hg0IG0Xlm6hjWmJL408mKpQBWwkPGhjSB8kIUajiSFpJCENGpRtS8SEZbvbzvGhne3O7nyce3e3OzP2nzS7vfN1f2fuxznn3gVY0IL+12K5XFz91ggCICBDAJj9Ywg4+6mVpY7PfiKoc8e189OPZ52Ptuff6qxl82KA6qbf0bCyRYTPfH40spnl3QCPNl1DysOLDZ/+/GhHgy2f5FV4ZAgVh85hzgZwK7x2rOLDr1DYAG6H154fPHwGuQ3gFXjt+9LWL5BsAK/BY8oInyHJAF6EnztuMw3mY57/o2djrFCeW9XBC4oovFb32+27Utyy0fsXhb/RsyFWaNf1VkddDACg6tCgIgI/U2bVBRwMrzPEsfqYGLyFAUR9+/mG1xQNb4nxwiNDKA+dQpMW4B74lBGObouJtVoDA7gNXtPYkcYYb91NWwDXVOMo8dTdygAOmOpENB7aESPDm3UBPifDeaLDm40BPB6eI/NbRHirFkB1b8GhbYDualsMgjTf3qGdgALPLAxADmyciE+Gt/MDSFGdQ7sACX6u/rL5DaxDWjtd+OE33xudpwPpZQG/DJdO7uveqjC0Ilo6v7Sf374V12d1j22XP3uo7fjsk8iD4J28Gg3CNLieWvVPbNuuvbptdPpZZOJKdjfc86vYvb1Qz+O+DLhZZ8Evfu3JkjwqXmMAm81BlCTGQQdb9qcKC9TdCf/NHJD6vvmsg70zt04e+/jQX/m9fu2PZd8fOUDKscQSIM3jQW4Mjn2qiwvw6O7a5OZ5ZH+If/1m+OppETrJxdL/r79ry45s2ZFldrSWJMU8gOEYwGONBZV22vWTz2/YY2uK8QTSWjuPR9ARBj+5ZrvzPc/61qET5Kgt3lLwi/7hAbB/MQCdjk8DnW/U5+4vzSgu+jK1VGp9+xwScvJr7Oa/psvb0quX/0wf7SVt1iAlMCk68HgYmx7/cWs5tzRP1Ty59g/uqa/cnkQP9j5QlJsEuSPBWRSNtjiBma6czfOVr0SKuWFuH5znK1oaFW0//fUbZoK73kpMT+xAEfq2t2xgGrjB3AEE+6LBVRrT5C8aGGjxfctwujFSFbS5MrVUanu/b5FmeU1T66eHgi9NlnYWEAl5gRJKzZiempttfrIsiVoNF0WNhZQDadxmSuYKOAguLdrILC3ayCrXGQQtIMnxAKYcyxQvKQYBd4yFsC8xQJFzQlawlv5AdRVWsFBEABg4+7u0tG/JnQOUN+Bxsn6Z5+YzktO0A6e5RILuCAhYgcvHgs43Q+gwgvFAiY3cNb7p8JbrQtw3sCxOUHiErluIFp24FvkWWmNhhscszxWdqJT4an7vZYws48FiHk1p/R/kbrntD+g8vBZxRFvvyuiFGV/AIIKFa0DivvgTQwws+WcfytasO204ib4e+9GmEkXAOF9eMG2zxU3wGf6MDJ/Xs18Q9LS9n4FGMJE26sxp4z2dvlMw/30lQcHUXQTItcSNdf5PE6O+f3izcd1zBI9teR+eKOp29AAM7+08B58vPkEIxkAAGDs2FbmdXhLAwAAjIW3My/Dmw6CmZr5sYH34G1bgKaJIzuYF+HJLSBdS9o/RbdNdXk1QLrKQ6fQKfDp7u2CFkTXfz0nAJTPltUFAAAAAElFTkSuQmCC";

  function installFavicon() {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(link => link.remove());

    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.sizes = '64x64';
    icon.href = FAVICON_PNG;

    const shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    shortcut.type = 'image/png';
    shortcut.href = FAVICON_PNG;

    document.head.append(icon, shortcut);
  }

  function scrollTo(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  installFavicon();

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