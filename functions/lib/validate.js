export const INQUIRY_TYPES = {
  "mobile-payment": "휴대폰결제 구입",
  "micro-payment": "소액결제 구입",
  "voucher-type": "상품권 종류 문의",
  other: "기타",
};

export const LIMITS = { name: 30, messageMin: 10, messageMax: 1000, contactMax: 40 };

function trimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isMobilePhone(raw) {
  const value = trimmedString(raw);
  return /^[0-9\s.-]+$/.test(value) && /^01[0-9]{8,9}$/.test(value.replace(/[\s.-]/g, ""));
}

export function normalizeContact(raw) {
  // 연락처는 답변을 드릴 휴대폰 번호만 받는다 (채팅 상담은 채널톡으로 따로 연결된다).
  const value = trimmedString(raw);
  if (!value || value.length > LIMITS.contactMax) return null;
  return isMobilePhone(value) ? value.replace(/[\s.-]/g, "") : null;
}

export function containsSensitiveNumber(text) {
  if (typeof text !== "string") return false;
  return /[0-9]{6}-?[0-9]{7}|[0-9]{14,16}|[0-9]{4}(?:[-\s]+[0-9]{4}){3}/.test(text);
}

export function isHoneypotTripped(input) {
  const value = input?.website;
  return value != null && (typeof value !== "string" || value.trim() !== "");
}

export function parseConsent(value) {
  return value === true || value === "true" || value === "on" || value === "1" || value === 1;
}

export function validateInquiry(input) {
  const type = trimmedString(input?.type);
  const name = trimmedString(input?.name);
  const contact = normalizeContact(input?.contact);
  const message = trimmedString(input?.message);
  const consent = parseConsent(input?.consent);
  const errors = {};

  if (!Object.prototype.hasOwnProperty.call(INQUIRY_TYPES, type)) {
    errors.type = "문의 유형을 선택해 주세요";
  }
  if (!name || name.length > LIMITS.name) {
    errors.name = "이름 또는 닉네임을 입력해 주세요 (30자 이내)";
  }
  if (contact === null) {
    errors.contact = "연락 가능한 휴대폰 번호를 입력해 주세요";
  }
  if (message.length < LIMITS.messageMin || message.length > LIMITS.messageMax) {
    errors.message = "문의 내용을 10자 이상 입력해 주세요 (1000자 이내)";
  } else if (containsSensitiveNumber(message)) {
    errors.message = "주민등록번호·카드번호·계좌번호는 적지 말아 주세요";
  }
  if (!consent) {
    errors.consent = "개인정보 수집·이용에 동의해야 문의를 보낼 수 있습니다";
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    data: ok ? { type, name, contact, message, consent: true } : null,
  };
}
