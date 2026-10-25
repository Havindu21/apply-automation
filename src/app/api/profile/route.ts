import { NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";

export async function GET() {
  try {
    const profile = await ProfileService.getProfile();
    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
