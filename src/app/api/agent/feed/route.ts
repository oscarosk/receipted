import { NextResponse, connection } from "next/server";
import { PRODUCTS } from "@/lib/catalog";
import { provenReviews } from "@/lib/feed";
import { baseUrl } from "@/lib/baseUrl";

// Plain JSON feed for agents that don't speak MCP. ?product=qh-1 for one product.
export async function GET(req: Request) {
  await connection();
  const base = baseUrl(req);
  const id = new URL(req.url).searchParams.get("product");
  const ids = id ? [id] : PRODUCTS.map((p) => p.id);
  const items = (await Promise.all(ids.map((x) => provenReviews(x, base)))).filter(Boolean);
  return NextResponse.json({ issuer: "Receipted", key: `${base}/.well-known/receipted-key.json`, products: items });
}
