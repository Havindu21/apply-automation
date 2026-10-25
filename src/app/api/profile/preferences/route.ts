import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";
import { UserPreferencesSchema } from "@/lib/validation/profile";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const partialSchema = UserPreferencesSchema.partial();
    const parsed = partialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const updated = await ProfileService.updatePreferences(parsed.data);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
