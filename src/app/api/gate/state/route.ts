import { NextResponse } from "next/server";
import { connection } from "next/server";
import { readGate } from "@/lib/gateStore";

export async function GET() {
  await connection();
  return NextResponse.json(await readGate());
}
