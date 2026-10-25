import { NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";

export async function POST() {
  try {
    const count = await ProfileService.verifyAllFacts();
    return NextResponse.json({ success: true, count, message: `${count} facts verified successfully.` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
