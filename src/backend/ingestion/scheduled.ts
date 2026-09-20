type ScheduledResult = { status: string; [key: string]: unknown };

function secretsMatch(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export function createScheduledIngestionHandler(options: { secret: string; run: () => Promise<ScheduledResult> }) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const authorization = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${options.secret}`;
    if (!options.secret || !secretsMatch(authorization, expected)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      return Response.json(await options.run());
    } catch {
      return Response.json({ status: "failed" }, { status: 500 });
    }
  };
}
