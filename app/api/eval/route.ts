import dataset from "@/data/eval-variants.json";

// Serves the static evaluation dataset. The eval page runs each variant
// through /api/interpret and compares the result to the expected label here.
export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return Response.json(dataset);
}
