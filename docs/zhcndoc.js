(function () {
  function injectAdsIntoLayout() {
    const toc = document.getElementById("table-of-contents");
    if (toc && !toc.querySelector(".wwads-cn.wwads-vertical")) {
      const verticalAd = document.createElement("div");
      verticalAd.className = "wwads-cn wwads-vertical";
      verticalAd.setAttribute("style", "margin-top: 0; margin-bottom: 1rem; max-width: 200px;");
      verticalAd.setAttribute("data-id", "354");
      toc.insertBefore(verticalAd, toc.firstChild);
    }

    const pagination = document.getElementById("pagination");
    if (pagination && !pagination.nextElementSibling?.classList.contains("wwads-horizontal")) {
      const horizontalAd = document.createElement("div");
      horizontalAd.className = "wwads-cn wwads-horizontal";
      horizontalAd.setAttribute("style", "margin-top: 1rem; width: 100%");
      horizontalAd.setAttribute("data-id", "354");
      pagination.insertAdjacentElement("afterend", horizontalAd);
    }
  }

  function runWhenDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  runWhenDomReady(() => {
    injectAdsIntoLayout();
    const observer = new MutationObserver(injectAdsIntoLayout);
    observer.observe(document.body, { childList: true, subtree: true });
  });

  const script = document.createElement("script");
  script.src = "https://www.zhcndoc.com/js/common.js";
  script.async = true;
  document.head.appendChild(script);
})();
