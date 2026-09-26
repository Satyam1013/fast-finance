import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type OtpChannel = "dev" | "whatsapp";

export interface OtpDeliveryResult {
  channel: OtpChannel;
  delivered: boolean;
  /** Only set on the `dev` channel — echoed back so the client can autofill. */
  devCode?: string;
  /** Provider message id, when the provider returns one. */
  messageId?: string;
}

/** Thrown when the provider rejects or can't be reached — callers map it to a 503. */
export class OtpDeliveryError extends Error {}

const SEND_PATH = "/api/v1/public/messages/send";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Outbound messaging — OTP delivery (FR-CUS login) and, later, referral-link
 * sharing (FRS §5). The channel is `OTP_CHANNEL`:
 *   - `dev`      — log the code, return it in the response (no send)
 *   - `whatsapp` — MacroPage Connect (the in-house WhatsApp platform)
 *
 * SMS is intentionally not wired — the product wants WhatsApp only.
 */
@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(private readonly config: ConfigService) {}

  private get channel(): OtpChannel {
    return this.config.get<OtpChannel>("OTP_CHANNEL", "dev");
  }

  async sendOtp(mobile: string, code: string): Promise<OtpDeliveryResult> {
    if (this.channel === "whatsapp") {
      const messageId = await this.sendWhatsAppOtp(mobile, code);
      return { channel: "whatsapp", delivered: true, messageId };
    }

    // dev
    this.logger.warn(`DEV OTP for ${mobile}: ${code}`);
    return { channel: "dev", delivered: false, devCode: code };
  }

  // ─────────────────────────── MacroPage Connect ──────────────────────────

  /**
   * Send the OTP as a WhatsApp template message via MacroPage Connect.
   *
   * Contract (verified by probing): `POST {BASE}/api/v1/public/messages/send`,
   * auth via `x-api-key` (Bearer is rejected with 401), body requires `phone`
   * (E.164 with a leading `+`) and `templateName`. The template must be
   * APPROVED in MacroPage → Templates and take exactly one body variable.
   *
   * Template variables go in `templateVars`, an object keyed by placeholder
   * position (`{ "1": code }` for `{{1}}`) — same shape the macropage website
   * and quiz backends use. Unknown body fields are silently stripped
   * server-side, so a wrong field name would arrive as an empty variable.
   */
  private async sendWhatsAppOtp(mobile: string, code: string): Promise<string> {
    const baseUrl = this.required("MACROPAGE_CONNECT_BASE_URL");
    const apiKey = this.required("MACROPAGE_CONNECT_API_KEY");
    const template = this.required("MACROPAGE_CONNECT_OTP_TEMPLATE");
    const phone = this.toE164(mobile);

    let res: Response;
    try {
      res = await fetch(`${baseUrl.replace(/\/+$/, "")}${SEND_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(this.buildPayload(phone, template, code)),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(
        `MacroPage Connect unreachable for ${this.mask(phone)}: ${(err as Error).message}`,
      );
      throw new OtpDeliveryError("MacroPage Connect unreachable");
    }

    const text = await res.text();
    let json: {
      success?: boolean;
      message?: string;
      messageId?: string;
      id?: string;
      data?: { id?: string; messageId?: string };
    } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      /* non-JSON body — judged by HTTP status alone */
    }

    // The provider can answer 2xx with `success:false`, so check both.
    if (!res.ok || json.success === false) {
      this.logger.error(
        `MacroPage Connect send failed for ${this.mask(phone)} ` +
          `(HTTP ${res.status}, template "${template}"): ${text.slice(0, 500)}`,
      );
      throw new OtpDeliveryError(`OTP delivery failed (${res.status})`);
    }

    const messageId =
      json.messageId ?? json.id ?? json.data?.messageId ?? json.data?.id ?? "";
    this.logger.log(
      `OTP sent to ${this.mask(phone)} via MacroPage Connect` +
        (messageId ? ` (id ${messageId})` : ""),
    );
    return messageId;
  }

  private buildPayload(phone: string, templateName: string, code: string) {
    return { phone, templateName, templateVars: { "1": code } };
  }

  /** 10-digit Indian mobile -> `+919876543210` (leading `+` is mandatory). */
  private toE164(mobile: string): string {
    const cc = this.config.get<string>("MACROPAGE_CONNECT_COUNTRY_CODE", "91");
    const digits = mobile.replace(/\D/g, "");
    return `+${digits.length > 10 ? digits : `${cc}${digits}`}`;
  }

  /** `+919876543210` -> `+91******3210` — keep the number out of the logs. */
  private mask(phone: string): string {
    return `${phone.slice(0, 3)}${"*".repeat(Math.max(phone.length - 7, 0))}${phone.slice(-4)}`;
  }

  private required(key: string): string {
    const v = this.config.get<string>(key, "");
    if (!v) {
      const msg = `${key} is not set — required when OTP_CHANNEL=whatsapp`;
      this.logger.error(msg);
      throw new OtpDeliveryError(msg);
    }
    return v;
  }
}
