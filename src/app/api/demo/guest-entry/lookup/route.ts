import { tooManyFromClient } from "@/server/rate-limit/client-key";
import { lookupDemoGuest } from "@/lib/demo-guest-entry";

export async function POST(request: Request) {
  const limited = tooManyFromClient(request, "demo-lookup", 60);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (typeof body?.query !== "string" || body.query.length > 80) {
    return Response.json({ status: "bad_request" }, { status: 400 });
  }
  return Response.json(lookupDemoGuest(body.query));
}
