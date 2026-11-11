import { NextResponse } from "next/server";
import { connection } from "next/server";
import { publicKeyJwk } from "@/lib/proof";

// Public key for checking Receipted proofs offline (JWK set).
export async function GET() {
  await connection();
  return NextResponse.json({ keys: [await publicKeyJwk()] });
}
