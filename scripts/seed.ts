/**
 * Minimal dev seed — one admin, a few products, one partner.
 * Run: npm run seed   (needs MONGODB_URI in .env)
 *
 * Real product list, rates and commission values come from the business
 * (FRS §13, PRD Open Questions #1/#2) — treat these as placeholders.
 */
import "dotenv/config";
import { connect, disconnect, model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { StaffSchema } from "../src/staff/schemas/staff.schema";
import { ProductSchema } from "../src/catalogue/schemas/product.schema";
import { PartnerSchema } from "../src/partners/schemas/partner.schema";
import { Role, StaffRole, PartnerStatus } from "../src/common/constants";
import { CommissionType } from "../src/catalogue/schemas/product.schema";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await connect(uri);

  const Staff = model("Staff", StaffSchema);
  const Product = model("Product", ProductSchema);
  const Partner = model("Partner", PartnerSchema);

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

  const products = [
    { name: "Personal Loan", interestRateMin: 10.5, interestRateMax: 24 },
    { name: "Business Loan", interestRateMin: 14, interestRateMax: 28 },
    { name: "Home Loan", interestRateMin: 8.4, interestRateMax: 11 },
    { name: "Car Loan", interestRateMin: 9, interestRateMax: 14 },
    { name: "Mortgage Loan (LAP)", interestRateMin: 9.5, interestRateMax: 16 },
  ];
  for (const p of products) {
    await Product.updateOne(
      { name: p.name },
      {
        $setOnInsert: {
          ...p,
          commissionType: CommissionType.Percentage,
          commissionValue: 1.0,
          active: true,
        },
      },
      { upsert: true },
    );
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

  await disconnect();
  console.log("done");
}

void main();
