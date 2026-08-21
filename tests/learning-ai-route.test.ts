import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/courses/[courseId]/learning-units/[unitId]/ai/route";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

describe("POST Learning Assistant", () => {
  it("requires only the server-side OpenAI API key configuration", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await POST(
      new Request(
        "http://localhost/api/courses/course-id/learning-units/unit-id/ai",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "summary",
            question: null,
            sources: [{ kind: "note", visibility: "private" }],
          }),
        },
      ),
      { params: Promise.resolve({ courseId: "course-id", unitId: "unit-id" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AI_NOT_CONFIGURED",
        message:
          "Add OPENAI_API_KEY to the server environment to enable the Learning Assistant.",
      },
    });
  });
});
