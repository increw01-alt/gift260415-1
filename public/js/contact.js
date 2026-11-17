import { validateInquiry, isHoneypotTripped } from "/js/validate.js";

const form = document.getElementById("inquiry-form");

if (form) {
  const consent = form.elements.namedItem("consent");
  const submit = form.querySelector('button[type="submit"]');
  const status = document.querySelector("[data-form-status]");
  const success = document.querySelector("[data-form-success]");
  const fields = ["type", "name", "contact", "message", "consent"];
  let sending = false;
  let completed = false;

  form.elements.namedItem("page").value = location.pathname + location.search;

  function syncSubmit() {
    submit.disabled = sending || completed || !consent.checked;
    submit.textContent = sending ? "보내는 중…" : "문의 보내기";
    form.setAttribute("aria-busy", String(sending));
  }

  function clearErrors() {
    status.textContent = "";
    for (const name of fields) {
      form.querySelector(`[data-error-for="${name}"]`).textContent = "";
      form.elements.namedItem(name).removeAttribute("aria-invalid");
    }
  }

  function showErrors(errors, fallback = "입력한 내용을 확인해 주세요.") {
    let firstField;
    for (const name of fields) {
      if (typeof errors?.[name] !== "string") continue;
      const field = form.elements.namedItem(name);
      form.querySelector(`[data-error-for="${name}"]`).textContent = errors[name];
      field.setAttribute("aria-invalid", "true");
      if (!firstField) firstField = field;
    }
    status.textContent = typeof errors?._ === "string" ? errors._ : fallback;
    firstField?.focus();
  }

  function showSuccess(type, track = true) {
    completed = true;
    form.hidden = true;
    success.hidden = false;
    status.textContent = "문의가 접수되었습니다.";
    success.focus();
    form.reset();
    if (track) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "inquiry_submit", type });
      // 기존 GTM 전환 트리거와 같은 이름: 문의 폼 접수 = 리드 + 연락처 확보
      window.dataLayer.push({ event: "qualify_lead", source: "form", type });
      window.dataLayer.push({ event: "close_convert_lead", source: "form", has_mobile: true, type });
    }
  }

  consent.addEventListener("change", syncSubmit);
  window.addEventListener("pageshow", syncSubmit);
  syncSubmit();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || completed) return;
    clearErrors();

    const input = Object.fromEntries(new FormData(form));
    input.consent = consent.checked;
    let validation;
    try {
      validation = validateInquiry(input);
    } catch (error) {
      status.textContent = "입력 확인 중 문제가 생겼습니다. 전화로 문의해 주세요.";
      return;
    }
    if (!validation.ok) {
      showErrors(validation.errors);
      return;
    }

    // 숨긴 항목이 채워진 요청은 전송하지 않고 접수 이벤트 집계에서도 제외한다.
    if (isHoneypotTripped(input)) {
      showSuccess(validation.data.type, false);
      syncSubmit();
      return;
    }

    sending = true;
    syncSubmit();
    status.textContent = "문의 내용을 보내고 있습니다.";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validation.data, website: "", page: location.pathname + location.search }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.ok && result?.ok === true) {
        showSuccess(validation.data.type);
      } else {
        showErrors(result?.errors, "문의 접수를 완료하지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.");
      }
    } catch (error) {
      status.textContent = error.name === "AbortError"
        ? "응답이 지연되어 접수 여부를 확인하지 못했습니다. 중복 문의를 피하려면 전화로 접수 여부를 확인해 주세요."
        : "접수 여부를 확인하지 못했습니다. 연결 상태를 확인해 주세요. 전송 후 연결이 끊겼다면 전화로 접수 여부를 확인해 주세요.";
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      syncSubmit();
    }
  });
}
