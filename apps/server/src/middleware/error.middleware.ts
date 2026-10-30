import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  // Seeking/reloading a video normally cancels the previous media response.
  if (request.aborted || response.destroyed) return;
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid request." },
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error." },
  });
};
