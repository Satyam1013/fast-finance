/**
 * Minimal dev seed — one admin, a staff member, products, a partner, plus the
 * Home/Support content the customer app expects (FAQs, a lender).
 * Run: npm run seed   (needs MONGODB_URI in .env)
 *
 * Real product list, rates and commission values come from the business
 * (FRS §13, PRD Open Questions #1/#2) — treat these as placeholders.
 */
import "dotenv/config";
import { connect, disconnect, model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { StaffSchema } from "../src/staff/schemas/staff.schema";
import {
  ProductSchema,
  CommissionType,
  ProductKind,
} from "../src/catalogue/schemas/product.schema";
import { PartnerSchema } from "../src/partners/schemas/partner.schema";
import { FaqSchema } from "../src/support/schemas/faq.schema";
import { LenderSchema, LenderKind } from "../src/content/schemas/lender.schema";
import { Role, StaffRole, PartnerStatus } from "../src/common/constants";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await connect(uri);

  const Staff = model("Staff", StaffSchema);
  const Product = model("Product", ProductSchema);
  const Partner = model("Partner", PartnerSchema);
  const Faq = model("Faq", FaqSchema);
  const Lender = model("Lender", LenderSchema);

  const adminEmail = "admin@fastfinance.in";
  if (!(await Staff.exists({ email: adminEmail }))) {
    await Staff.create({
      name: "Fast Finance Admin",
      email: adminEmail,
      phone: "9999999999",
      passwordHash: await bcrypt.hash("admin12345", 12),
      role: Role.Admin,
    });
    console.log(`admin  -> ${adminEmail} / admin12345`);
  }

  // At least one assignable staff member — applications need an assignee.
  const officerEmail = "officer@fastfinance.in";
  if (!(await Staff.exists({ email: officerEmail }))) {
    await Staff.create({
      name: "Ravi Kumar",
      email: officerEmail,
      phone: "9812345678",
      passwordHash: await bcrypt.hash("officer12345", 12),
      role: Role.Staff,
      staffRole: StaffRole.LoanOfficer,
    });
    console.log(`staff  -> ${officerEmail} / officer12345`);
  }

  const products = [
    { name: "Personal Loan", code: "PL", interestRateMin: 10.5, interestRateMax: 24 },
    { name: "Business Loan", code: "BL", interestRateMin: 14, interestRateMax: 28 },
    { name: "Home Loan", code: "HL", interestRateMin: 8.4, interestRateMax: 11 },
    { name: "Car Loan", code: "CL", interestRateMin: 9, interestRateMax: 14 },
    {
      name: "Mortgage Loan (LAP)",
      code: "MLAP",
      interestRateMin: 9.5,
      interestRateMax: 16,
    },
    {
      name: "Insurance",
      code: "INS",
      kind: ProductKind.Insurance,
      subtitle: "Life, Health, Vehicle",
      interestRateMin: 0,
      interestRateMax: 0,
    },
  ];
  for (const p of products) {
    await Product.updateOne(
      { name: p.name },
      {
        $set: { code: p.code, kind: p.kind ?? ProductKind.Loan },
        $setOnInsert: {
          name: p.name,
          subtitle: p.subtitle,
          interestRateMin: p.interestRateMin,
          interestRateMax: p.interestRateMax,
          commissionType: CommissionType.Percentage,
          commissionValue: 1.0,
          active: true,
        },
      },
      { upsert: true },
    );
  }
  // Backfill a code on any legacy product the list above doesn't cover — the
  // unique index on `code` needs every row to have one.
  for (const p of await Product.find({
    $or: [{ code: { $exists: false } }, { code: null }],
  })) {
    const code = String(p.get("name"))
      .replace(/\([^)]*\)/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 6);
    await Product.updateOne({ _id: p._id }, { $set: { code } });
  }
  console.log(`products -> ${products.length} upserted`);

  if (!(await Partner.exists({ partnerCode: "FFP-DEMO1" }))) {
    await Partner.create({
      name: "Demo Partner",
      phone: "8888888888",
      city: "Indore",
      partnerCode: "FFP-DEMO1",
      status: PartnerStatus.Active,
      joinedAt: new Date(),
    });
    console.log("partner -> FFP-DEMO1");
  }

  const faqs = [
    {
      question: "How long does loan approval take?",
      answer:
        "Approval usually takes up to 7 days, depending on your documents and the verification process.",
      category: "Loans",
      order: 1,
    },
    {
      question: "What documents are required for KYC?",
      answer:
        "PAN card, Aadhaar card, a selfie, address proof, a recent salary slip and a bank statement.",
      category: "KYC",
      order: 2,
    },
    {
      question: "How is my interest rate decided?",
      answer:
        "The lender sets your rate based on your profile, credit history and the product you choose.",
      category: "Loans",
      order: 3,
    },
    {
      question: "When will my EMI start?",
      answer:
        "Your first EMI is typically due one month after the loan amount is disbursed.",
      category: "EMI",
      order: 4,
    },
    {
      question: "Can I prepay my loan early?",
      answer:
        "Yes. Prepayment terms and any charges depend on the lender and are shared with your loan offer.",
      category: "Loans",
      order: 5,
    },
  ];
  for (const f of faqs) {
    await Faq.updateOne(
      { question: f.question },
      { $setOnInsert: { ...f, active: true } },
      { upsert: true },
    );
  }
  console.log(`faqs -> ${faqs.length} upserted`);

  if (!(await Lender.exists({ name: "Demo NBFC" }))) {
    await Lender.create({
      name: "Demo NBFC",
      kind: LenderKind.Nbfc,
      startingRate: 10.5,
      order: 1,
      branches: [
        {
          label: "Indore — MG Road",
          address: "MG Road, Indore",
          city: "Indore",
          state: "Madhya Pradesh",
          pincode: "452001",
          phone: "0731-4000000",
        },
      ],
    });
    console.log("lender -> Demo NBFC");
  }

  await disconnect();
  console.log("done");
}

void main();
