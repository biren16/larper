import { expect, test } from "@playwright/test";

test("a story has a rendered social preview", async ({ request }) => {
  const response = await request.get("/discover/the-silver-runner-resurgence/opengraph-image");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect([...new Uint8Array(await response.body()).slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});
