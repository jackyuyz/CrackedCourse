import { randomUUID } from "node:crypto";

export function errorResponse(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId: randomUUID(),
      },
      ...extra,
    },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
