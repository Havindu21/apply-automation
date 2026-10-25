import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobExecutionLogs } from "@/db/schema";
import { ProfileService } from "@/lib/services/profile-service";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    if (await ProfileService.isDbAvailable()) {
      const logs = await db
        .select()
        .from(jobExecutionLogs)
        .orderBy(desc(jobExecutionLogs.startedAt))
        .limit(20);
      return NextResponse.json({ success: true, logs });
    }

    return NextResponse.json({
      success: true,
      logs: [
        {
          id: "mock-log-01",
          jobType: "discovery",
          status: "completed",
          source: "all",
          itemsProcessed: 0,
          itemsSucceeded: 0,
          itemsFailed: 0,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
