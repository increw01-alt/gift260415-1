import test from "node:test";
import assert from "node:assert/strict";
import {
  INQUIRY_TYPES,
  LIMITS,
  validateInquiry,
  normalizeContact,
  isMobilePhone,
  containsSensitiveNumber,
  isHoneypotTripped,
  parseConsent,
} from "../functions/lib/validate.js";

const validInput = {
  type: "mobile-payment",
  name: "테스트",
  contact: "010-1234-5678",
  message: "상품권 구입 방법을 문의합니다.",
  consent: true,
};
const messages = {
  type: "문의 유형을 선택해 주세요",
  name: "이름 또는 닉네임을 입력해 주세요 (30자 이내)",
  contact: "연락 가능한 휴대폰 번호를 입력해 주세요",
  message: "문의 내용을 10자 이상 입력해 주세요 (1000자 이내)",
  sensitive: "주민등록번호·카드번호·계좌번호는 적지 말아 주세요",
  consent: "개인정보 수집·이용에 동의해야 문의를 보낼 수 있습니다",
};

function expectFieldError(field, value, message = messages[field]) {
  assert.deepEqual(validateInquiry({ ...validInput, [field]: value }), {
    ok: false,
    errors: { [field]: message },
    data: null,
  });
}

test("공개 문의 유형과 길이 제한이 계약과 일치한다", () => {
  assert.deepEqual(INQUIRY_TYPES, {
    "mobile-payment": "휴대폰결제 구입",
    "micro-payment": "소액결제 구입",
    "voucher-type": "상품권 종류 문의",
    other: "기타",
  });
  assert.deepEqual(LIMITS, { name: 30, messageMin: 10, messageMax: 1000, contactMax: 40 });
});

test("정상 입력의 앞뒤 공백과 휴대폰 구분자를 정리한다", () => {
  const input = Object.freeze({
    type: " mobile-payment ",
    name: "  테스트  ",
    contact: " 010-1234-5678 ",
    message: "  상품권 구입 방법을 문의합니다.  ",
    consent: "on",
    page: "/contact/",
  });
  assert.deepEqual(validateInquiry(input), {
    ok: true,
    errors: {},
    data: { ...validInput, contact: "01012345678" },
  });
  assert.equal(input.contact, " 010-1234-5678 ");
});

for (const type of ["mobile-payment", "micro-payment", "voucher-type", "other"]) {
  test(`문의 유형 ${type}을 허용한다`, () => {
    assert.equal(validateInquiry({ ...validInput, type }).data.type, type);
  });
}

for (const type of [undefined, "unknown", "toString", "constructor", "__proto__"]) {
  test(`누락되거나 목록에 없는 유형 ${String(type)}을 거부한다`, () => {
    expectFieldError("type", type);
  });
}

for (const [label, name] of [["빈 값", ""], ["공백", " \t\n "], ["31자", "가".repeat(31)]]) {
  test(`이름 ${label}를 거부한다`, () => expectFieldError("name", name));
}

for (const length of [1, 30]) {
  test(`이름 ${length}자를 허용한다`, () => {
    const name = "가".repeat(length);
    assert.equal(validateInquiry({ ...validInput, name: ` ${name} ` }).data.name, name);
  });
}

for (const [raw, normalized] of [
  ["010-1234-5678", "01012345678"],
  ["010 1234 5678", "01012345678"],
  ["010.1234.5678", "01012345678"],
  ["01012345678", "01012345678"],
  ["0111234567", "0111234567"],
]) {
  test(`휴대폰 ${raw}를 숫자만 남겨 정규화한다`, () => {
    assert.equal(isMobilePhone(raw), true);
    assert.equal(normalizeContact(raw), normalized);
    assert.equal(validateInquiry({ ...validInput, contact: raw }).data.contact, normalized);
  });
}

for (const raw of ["02-123-4567", "1234", "홍길동", "ab", "a".repeat(31)]) {
  test(`잘못된 연락처 ${raw}를 거부한다`, () => {
    assert.equal(normalizeContact(raw), null);
    expectFieldError("contact", raw);
  });
}

test("휴대폰 번호가 아닌 메신저 ID 형태는 거부한다 (연락처는 휴대폰 번호만)", () => {
  for (const contact of ["money_plan.1", "Money-Plan_1", "abc", "a".repeat(30), "plan@id"]) {
    assert.equal(normalizeContact(contact), null);
    expectFieldError("contact", contact);
  }
});

test("휴대폰의 자리수와 허용하지 않은 문자를 검사한다", () => {
  for (const raw of ["010123456", "010123456789", "02-123-4567", "+82-10-1234-5678", "010/1234/5678", "(010)1234-5678", "010a12345678"]) {
    assert.equal(isMobilePhone(raw), false, raw);
  }
});

test("연락처 길이 40자는 허용하고 41자는 거부한다", () => {
  const atLimit = `010${" ".repeat(29)}12345678`;
  assert.equal(atLimit.length, 40);
  assert.equal(normalizeContact(atLimit), "01012345678");
  assert.equal(validateInquiry({ ...validInput, contact: ` ${atLimit} ` }).ok, true);
  const overLimit = `010${" ".repeat(30)}12345678`;
  assert.equal(normalizeContact(overLimit), null);
  expectFieldError("contact", overLimit);
});

for (const length of [9, 1001]) {
  test(`문의 내용 ${length}자를 거부한다`, () => expectFieldError("message", "가".repeat(length)));
}

for (const length of [10, 1000]) {
  test(`문의 내용 ${length}자를 허용한다`, () => {
    const message = "가".repeat(length);
    assert.equal(validateInquiry({ ...validInput, message: ` ${message} ` }).data.message, message);
  });
}

// 아래 번호는 지시문에 명시된 형태 검사용 예시이며 실제 고객 데이터가 아니다.
for (const number of [
  "901231-1234567",
  "9012311234567",
  "1234-5678-9012-3456",
  "1234 5678 9012 3456",
  "12345678901234",
  "123456789012345",
  "1234567890123456",
]) {
  test(`민감번호 형태 ${number}가 들어간 문의를 거부한다`, () => {
    const message = `문의 예시 ${number} 입니다.`;
    assert.equal(containsSensitiveNumber(message), true);
    expectFieldError("message", message, messages.sensitive);
  });
}

test("휴대폰 번호만 들어간 문의는 민감번호로 판정하지 않는다", () => {
  for (const number of ["010-1234-5678", "01012345678"]) {
    const message = `연락처는 ${number} 입니다.`;
    assert.equal(containsSensitiveNumber(message), false);
    assert.equal(validateInquiry({ ...validInput, message }).ok, true);
  }
});

test("민감번호보다 문의 내용 길이 오류를 먼저 반환한다", () => {
  expectFieldError("message", `901231-1234567${"가".repeat(1000)}`);
});

for (const consent of [true, "true", "on", "1", 1]) {
  test(`동의 값 ${JSON.stringify(consent)}을 true로 정규화한다`, () => {
    assert.equal(parseConsent(consent), true);
    assert.equal(validateInquiry({ ...validInput, consent }).data.consent, true);
  });
}

for (const consent of [false, "off", undefined, "yes", "false", "0", 0, "", "TRUE", 2]) {
  test(`동의 값 ${JSON.stringify(consent)}을 거부한다`, () => {
    assert.equal(parseConsent(consent), false);
    expectFieldError("consent", consent);
  });
}

test("여러 오류를 모두 반환하고 정규화 데이터는 반환하지 않는다", () => {
  assert.deepEqual(validateInquiry({ type: "invalid", name: " ", contact: "ab", message: "짧음", consent: false }), {
    ok: false,
    errors: {
      type: messages.type,
      name: messages.name,
      contact: messages.contact,
      message: messages.message,
      consent: messages.consent,
    },
    data: null,
  });
});

test("문자열 항목의 숫자·불리언·누락 값을 문자열로 오인하지 않는다", () => {
  for (const field of ["type", "name", "contact", "message"]) {
    for (const value of [true, false, 1234, undefined]) expectFieldError(field, value);
  }
  for (const raw of [true, false, 1234, undefined]) {
    assert.equal(isMobilePhone(raw), false);
    assert.equal(normalizeContact(raw), null);
    assert.equal(containsSensitiveNumber(raw), false);
  }
});

test("입력 객체가 없으면 예외 대신 모든 필수 항목 오류를 반환한다", () => {
  for (const input of [undefined, null, {}]) {
    const result = validateInquiry(input);
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.deepEqual(Object.keys(result.errors), ["type", "name", "contact", "message", "consent"]);
  }
});

test("값이 있는 honeypot을 감지한다", () => {
  assert.equal(isHoneypotTripped({ website: "http://x" }), true);
  assert.equal(isHoneypotTripped({ website: " hidden " }), true);
  assert.equal(isHoneypotTripped({ website: 0 }), true);
  assert.equal(isHoneypotTripped({ website: false }), true);
});

test("비거나 누락된 honeypot은 감지하지 않는다", () => {
  assert.equal(isHoneypotTripped({ website: "" }), false);
  assert.equal(isHoneypotTripped({ website: " \t " }), false);
  assert.equal(isHoneypotTripped({}), false);
  assert.equal(isHoneypotTripped(), false);
});

test("문의 검증은 honeypot을 판단하거나 반환 데이터에 포함하지 않는다", () => {
  assert.deepEqual(validateInquiry({ ...validInput, website: "http://x" }), validateInquiry(validInput));
});
