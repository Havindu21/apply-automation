import { NextResponse } from "next/server";
import { ApplicationService } from "@/lib/services/application-service";
import { ApplicationStatus, TransitionActor } from "@/lib/applications/state-machine";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const { status, actor = "human", reason, evidence } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Target status is required" },
        { status: 400 }
      );
    }

    const updated = await ApplicationService.transitionStatus(
      id,
      status as ApplicationStatus,
      actor as TransitionActor,
      { reason, evidence }
    );

    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
