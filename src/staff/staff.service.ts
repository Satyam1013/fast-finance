import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { ConfigService } from "@nestjs/config";
import { Staff, StaffDocument } from "./schemas/staff.schema";
import { Role, StaffRole } from "../common/constants";

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staff: Model<StaffDocument>,
    private readonly config: ConfigService,
  ) {}

  findById(id: string) {
    return this.staff.findById(id).lean();
  }

  /** FR-ADM-10 — list all staff with role + assigned customer count. */
  list(): Promise<never> {
    // TODO(FR-ADM-10, FR-ADM-13): join assigned-application counts + monthly closures.
    throw new NotImplementedException("staff.list — not built");
  }

  /** FR-ADM-11 — add a staff member (name, phone, role). */
  async create(dto: {
    name: string;
    email: string;
    phone: string;
    password: string;
    staffRole: StaffRole;
  }): Promise<StaffDocument> {
    const rounds = this.config.get<number>("BCRYPT_ROUNDS", 12);
    return this.staff.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: await bcrypt.hash(dto.password, rounds),
      role: Role.Staff,
      staffRole: dto.staffRole,
    });
  }

  /**
   * Pick the staff member a new application is assigned to (FR-PTR-12,
   * Journey B step 6). Placeholder = least-loaded active LOAN_OFFICER;
   * confirm the rule with the business.
   */
  pickAssignee(): Promise<never> {
    // TODO(assignment rule): round-robin vs least-loaded — see PRD open items.
    throw new NotImplementedException("staff.pickAssignee — not built");
  }
}
