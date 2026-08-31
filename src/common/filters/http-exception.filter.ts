import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { HTTP_STATUS_CODE_MAP } from "./http-exception.constants";
import { Response } from "express";

interface ExceptionBody {
  success?: boolean;
  message?: string | string[];
  code?: string;
  [key: string]: unknown;
}

/** Consistent `{ success, message, code, errors? }` error shape across the API. */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse() as string | ExceptionBody;

    // Service threw an already-structured error — pass it through untouched.
    if (typeof body === "object" && body.success === false) {
      return response.status(status).json(body);
    }

    // class-validator error (message is an array).
    if (typeof body === "object" && Array.isArray(body.message)) {
      return response.status(status).json({
        success: false,
        message: body.message[0],
        code: "VALIDATION_ERROR",
        errors: body.message,
      });
    }

    return response.status(status).json({
      success: false,
      message:
        typeof body === "string" ? body : (body.message ?? "An error occurred"),
      code:
        (typeof body === "object" && body.code) ||
        HTTP_STATUS_CODE_MAP[status] ||
        "UNKNOWN_ERROR",
    });
  }
}
