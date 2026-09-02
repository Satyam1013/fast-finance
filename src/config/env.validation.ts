import * as Joi from "joi";

/**
 * Fail fast on boot if the environment is misconfigured. Keep this in sync
 * with .env.example.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().default(4000),
  ALLOWED_ORIGINS: Joi.string().default("http://localhost:3000"),

  MONGODB_URI: Joi.string()
    .uri({ scheme: [/mongodb(\+srv)?/] })
    .required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: Joi.number().default(30),
  BCRYPT_ROUNDS: Joi.number().default(12),

  OTP_TTL_SECONDS: Joi.number().default(300),
  OTP_DEV_MODE: Joi.boolean().default(true),
  // Digit count for customer login OTP — 4 matches the mobile app OTP screen.
  OTP_LENGTH: Joi.number().integer().min(4).max(8).default(4),
  OTP_DEV_CODE: Joi.string().pattern(/^\d+$/).default("0000"),

  // Delivery channel when OTP_DEV_MODE=false. WhatsApp only (no SMS).
  OTP_CHANNEL: Joi.string().valid("dev", "whatsapp").default("dev"),
  MACROPAGE_CONNECT_BASE_URL: Joi.string().allow("").default(""),
  MACROPAGE_CONNECT_API_KEY: Joi.string().allow("").default(""),
  MACROPAGE_CONNECT_OTP_TEMPLATE: Joi.string().allow("").default(""),
  MACROPAGE_CONNECT_SENDER: Joi.string().allow("").default(""),
  MACROPAGE_CONNECT_TEMPLATE_LANG: Joi.string().default("en"),
  MACROPAGE_CONNECT_COUNTRY_CODE: Joi.string().default("91"),

  PARTNER_CODE_PREFIX: Joi.string().default("FFP"),

  FEATURE_ACCOUNT_AGGREGATOR: Joi.boolean().default(false),
  AA_PROVIDER: Joi.string().allow("").default(""),
  AA_CLIENT_ID: Joi.string().allow("").default(""),
  AA_CLIENT_SECRET: Joi.string().allow("").default(""),

  STORAGE_DRIVER: Joi.string().valid("local", "s3").default("local"),
  PUBLIC_ASSET_BASE_URL: Joi.string()
    .allow("")
    .default("http://localhost:4000/api/v1/files"),
  S3_ENDPOINT: Joi.string().allow("").default(""),
  S3_REGION: Joi.string().allow("").default(""),
  S3_BUCKET: Joi.string().allow("").default(""),
  S3_ACCESS_KEY: Joi.string().allow("").default(""),
  S3_SECRET_KEY: Joi.string().allow("").default(""),

  GST_RATE_PERCENT: Joi.number().default(18),
  GSTIN: Joi.string().allow("").default(""),

  // ─── Support screen (FR-CUS-22) ───
  SUPPORT_PHONE: Joi.string().allow("").default(""),
  SUPPORT_WHATSAPP: Joi.string().allow("").default(""),
  SUPPORT_EMAIL: Joi.string().allow("").default(""),
  SUPPORT_RESPONSE_LABEL: Joi.string()
    .allow("")
    .default("Our team responds within 5 minutes"),
});
