import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstructorExternalReference } from "@/components/instructor-external-reference";
import {
  buildRateMyProfessorsSearchUrl,
  getSafeRateMyProfessorsProfileUrl,
} from "@/lib/rate-my-professors";

describe("Rate My Professors external references", () => {
  it("builds a name search when no verified profile is linked", () => {
    render(
      <InstructorExternalReference
        instructorName="Gordon Weinberg"
        institutionName="Carnegie Mellon University"
        externalProfileUrl={null}
      />,
    );

    const link = screen.getByRole("link", { name: /search professor/i });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin).toBe("https://www.ratemyprofessors.com");
    expect(url.pathname).toBe("/search/professors/");
    expect(url.searchParams.get("q")).toBe("Gordon Weinberg");
    expect(link).toHaveAttribute(
      "href",
      "https://www.ratemyprofessors.com/search/professors/?q=Gordon%20Weinberg",
    );
    expect(link.getAttribute("href")).not.toContain("+");
    expect(
      screen.getByText(/no verified profile is linked yet/i),
    ).toBeVisible();
    expect(screen.getByText(/for reference only/i)).toBeVisible();
  });

  it("uses only a safe Rate My Professors professor profile URL", () => {
    expect(
      getSafeRateMyProfessorsProfileUrl(
        "https://www.ratemyprofessors.com/professor/12345",
      ),
    ).toBe("https://www.ratemyprofessors.com/professor/12345");
    expect(
      getSafeRateMyProfessorsProfileUrl("javascript:alert('unsafe')"),
    ).toBeNull();
    expect(
      getSafeRateMyProfessorsProfileUrl("https://example.com/professor/12345"),
    ).toBeNull();
  });

  it("reports missing school context without blocking the external search", () => {
    render(
      <InstructorExternalReference
        instructorName="Lena Ortiz"
        institutionName={null}
        externalProfileUrl={null}
      />,
    );

    expect(screen.getByText(/no confirmed school/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /search professor/i }),
    ).toHaveAttribute("href", buildRateMyProfessorsSearchUrl("Lena Ortiz"));
  });
});
