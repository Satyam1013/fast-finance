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
   * TODO(macropage): confirm the exact request contract and adjust
   * {@link buildConnectPayload} + the endpoint path. WhatsApp requires a
   * pre-approved template — its name goes in MACROPAGE_CONNECT_OTP_TEMPLATE and
   * it must take exactly one body variable (the code).
   */
  private async sendWhatsAppOtp(mobile: string, code: string): Promise<string> {
    const baseUrl = this.required("MACROPAGE_CONNECT_BASE_URL");
    const apiKey = this.required("MACROPAGE_CONNECT_API_KEY");
    const template = this.required("MACROPAGE_CONNECT_OTP_TEMPLATE");
    const to = this.toE164(mobile);

    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(this.buildConnectPayload(to, template, code)),
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(
        `MacroPage Connect send failed (${res.status}): ${text}`,
      );
      throw new Error(`OTP delivery failed (${res.status})`);
    }

    let messageId = "";
    try {
      const json = JSON.parse(text) as {
        messageId?: string;
        id?: string;
        data?: { id?: string };
      };
      messageId = json.messageId ?? json.id ?? json.data?.id ?? "";
    } catch {
      /* provider returned non-JSON — non-fatal */
    }
    return messageId;
  }

  /** The WhatsApp template send body — Meta Cloud API shape by default. */
  private buildConnectPayload(to: string, template: string, code: string) {
    const sender = this.config.get<string>("MACROPAGE_CONNECT_SENDER", "");
    const lang = this.config.get<string>(
      "MACROPAGE_CONNECT_TEMPLATE_LANG",
      "en",
    );
    return {
      ...(sender ? { from: sender } : {}),
      to,
      type: "template",
      template: {
        name: template,
        language: { code: lang },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    };
  }

  /** 10-digit Indian mobile -> `919876543210` (no `+`, per WhatsApp). */
  private toE164(mobile: string): string {
    const cc = this.config.get<string>("MACROPAGE_CONNECT_COUNTRY_CODE", "91");
    const digits = mobile.replace(/\D/g, "");
    return digits.length > 10 ? digits : `${cc}${digits}`;
  }

  private required(key: string): string {
    const v = this.config.get<string>(key, "");
    if (!v) {
      throw new Error(`${key} is not set — required when OTP_CHANNEL=whatsapp`);
    }
    return v;
  }
}
