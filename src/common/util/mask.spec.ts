import { maskAadhaar, maskAccountNumber, maskMobile, maskPan } from "./mask";

describe("mask helpers", () => {
  it("masks Aadhaar to the last 4 digits", () => {
    expect(maskAadhaar("1234 5678 9012")).toBe("XXXXXXXX9012");
  });

  it("masks PAN to first 3 + last 2", () => {
    expect(maskPan("abcde1234f")).toBe("ABCXXXXX4F");
  });

  it("masks a bank account to the last 4", () => {
    expect(maskAccountNumber("123456789012")).toBe("XXXXXXXX9012");
  });

  it("masks a mobile to the last 4", () => {
    expect(maskMobile("9876543210")).toBe("XXXXXX3210");
  });

  it("returns undefined for empty input", () => {
    expect(maskAadhaar(undefined)).toBeUndefined();
    expect(maskPan(null)).toBeUndefined();
  });
});
