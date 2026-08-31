import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { pickFile, uploadOptions } from "../common/util/upload";

const PROFILE_FILE_FIELDS = [
  { name: "photo", maxCount: 1 },
  { name: "aadhaarFront", maxCount: 1 },
  { name: "aadhaarBack", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
];

@ApiTags("customers")
@ApiBearerAuth()
@Controller()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  /** Customer's own profile — FR-CUS-23. */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Get("me/profile")
  myProfile(@CurrentUser() user: AuthUser) {
    return this.customers.getOwnProfile(user);
  }

  /** Create Profile screen — FR-CUS-07. Multipart: fields + 4 mandatory files. */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post("me/profile")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor(PROFILE_FILE_FIELDS, uploadOptions))
  createProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProfileDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  ) {
    return this.customers.createProfile(user, dto, {
      photo: pickFile(files, "photo"),
      aadhaarFront: pickFile(files, "aadhaarFront"),
      aadhaarBack: pickFile(files, "aadhaarBack"),
      panCard: pickFile(files, "panCard"),
    });
  }

  /** Edit Profile screen — partial update, optional replacement photo. */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Patch("me/profile")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(FileFieldsInterceptor(PROFILE_FILE_FIELDS, uploadOptions))
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  ) {
    return this.customers.updateOwnProfile(user, dto, {
      photo: pickFile(files, "photo"),
    });
  }

  /** Admin register — FR-ADM-04. Staff assigned list lives in staff module. */
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/customers")
  adminList() {
    return this.customers.adminList({});
  }
}
