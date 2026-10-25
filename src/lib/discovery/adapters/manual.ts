import { RawDiscoveredJob } from "../types";

export interface ManualImportInput {
  url: string;
  title: string;
  company: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite" | "unknown";
  description: string;
  salaryRaw?: string;
}

export function parseManualJobInput(input: ManualImportInput): RawDiscoveredJob {
  const cleanUrl = input.url.trim();
  const id = `manual-${Date.now()}`;

  return {
    source: "manual",
    sourceId: id,
    url: cleanUrl,
    title: input.title.trim(),
    company: input.company.trim(),
    location: input.location?.trim() || "Remote",
    workMode: input.workMode || "remote",
    description: input.description.trim(),
    salaryRaw: input.salaryRaw?.trim(),
    postedAt: new Date(),
  };
}
