import { ConfigService } from "@nestjs/config";
import { CommsService, OtpDeliveryError } from "./comms.service";

const ENV: Record<string, string> = {
  OTP_CHANNEL: "whatsapp",
  MACROPAGE_CONNECT_BASE_URL: "https://connect.example.test/",
  MACROPAGE_CONNECT_API_KEY: "mk_test_key",
  MACROPAGE_CONNECT_OTP_TEMPLATE: "fast_finance_otp",
  MACROPAGE_CONNECT_COUNTRY_CODE: "91",
};

const service = (env = ENV) =>
  new CommsService({
    get: (key: string, fallback?: string) => env[key] ?? fallback,
  } as unknown as ConfigService);

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("CommsService (whatsapp)", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, "fetch");
  });
  afterEach(() => jest.restoreAllMocks());

  it("posts to the public send endpoint with x-api-key and a +91 phone", async () => {
    fetchMock.mockReturnValue(
      reply(200, { success: true, data: { id: "m1" } }),
    );

    const result = await service().sendOtp("9876543210", "4821");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://connect.example.test/api/v1/public/messages/send",
    );
    expect(init.headers).toMatchObject({ "x-api-key": "mk_test_key" });
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body as string)).toEqual({
      phone: "+919876543210",
      templateName: "fast_finance_otp",
      variables: ["4821"],
    });
    expect(result).toMatchObject({ channel: "whatsapp", messageId: "m1" });
  });

  it("treats a 2xx with success:false as a failure", async () => {
    fetchMock.mockReturnValue(reply(200, { success: false, message: "nope" }));
    await expect(
      service().sendOtp("9876543210", "4821"),
    ).rejects.toBeInstanceOf(OtpDeliveryError);
  });

  it("fails on a non-2xx provider response", async () => {
    fetchMock.mockReturnValue(
      reply(401, { success: false, code: "UNAUTHORIZED" }),
    );
    await expect(
      service().sendOtp("9876543210", "4821"),
    ).rejects.toBeInstanceOf(OtpDeliveryError);
  });

  it("wraps network errors and never throws a raw fetch error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      service().sendOtp("9876543210", "4821"),
    ).rejects.toBeInstanceOf(OtpDeliveryError);
  });

  it("fails fast when credentials are missing", async () => {
    const env = { ...ENV, MACROPAGE_CONNECT_API_KEY: "" };
    await expect(service(env).sendOtp("9876543210", "4821")).rejects.toThrow(
      /MACROPAGE_CONNECT_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
