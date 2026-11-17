// 공통 동작: 모바일 메뉴, 하단 바 여백, 문의 유형 미리 선택, CTA 클릭 이벤트(dataLayer).
(function () {
  document.body.classList.add("has-bottom-bar");

  var header = document.querySelector("[data-site-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("hidden") === false;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    });
  }

  // /contact/?type=mobile-payment 처럼 들어오면 문의 유형을 미리 고른다.
  var typeField = document.querySelector("select[name='type']");
  if (typeField) {
    var wanted = new URLSearchParams(location.search).get("type");
    if (wanted && Array.prototype.some.call(typeField.options, function (o) { return o.value === wanted; })) typeField.value = wanted;
  }

  // 채팅 상담 버튼: 채널톡 채팅 페이지(src/site.json channel_url)를 새 창으로 연다. 열림 이벤트는 기존 GTM 트리거 이름 그대로.
  var chatLinks = document.querySelectorAll("[data-channel-link]");
  for (var i = 0; i < chatLinks.length; i++) {
    chatLinks[i].addEventListener("click", function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "channeltalk_open", page: location.pathname });
    });
  }

  // 전화 클릭은 기존 GTM 트리거(phone_click)와 같은 이름으로 보낸다.
  document.addEventListener("click", function (e) {
    var tel = e.target.closest('a[href^="tel:"]');
    if (!tel) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "phone_click", phone_number: tel.getAttribute("href").replace("tel:", ""), page: location.pathname });
  });

  // 문의 페이지에서는 하단 바·퀵바의 "문의하기"가 작성 중인 폼으로 이동한다 (페이지를 다시 열어 입력이 사라지지 않게).
  if (location.pathname.replace(/\/?$/, "/") === "/contact/") {
    var contactLinks = document.querySelectorAll("[data-contact-link]");
    for (var c = 0; c < contactLinks.length; c++) contactLinks[c].setAttribute("href", "#inquiry-form");
  }

  // 전화·채팅 상담·문의 CTA 클릭을 GTM 으로 보낸다. 태그 구성은 GTM 컨테이너에서 한다.
  window.dataLayer = window.dataLayer || [];
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-cta]");
    if (!el) return;
    window.dataLayer.push({ event: "cta_click", cta: el.getAttribute("data-cta"), page: location.pathname });
  });
})();
