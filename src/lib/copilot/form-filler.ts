import { FullProfile } from "../validation/profile";
import { TailoredCVSchema } from "../tailoring/verifier";
import { validateSafeJobUrl } from "../validation/url";
import { chromium, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CandidateFormPayload {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  headline: string;
  summary: string;
  skillsList: string;
}

export type SupportedAtsPlatform = "greenhouse" | "lever" | "ashby" | "generic";

export interface AssistedSessionResult {
  sessionId: string;
  platform: SupportedAtsPlatform;
  url: string;
  filledFields: string[];
  unfilledFields: string[];
  status: "ready_for_human_review" | "error";
  message: string;
}

// Active interactive sessions store
const activeSessions = new Map<string, { context: BrowserContext; page: Page; tempFilePath?: string }>();

export class FormCopilot {
  /**
   * Extracts clean, structured candidate info from verified profile and tailored CV.
   */
  static prepareFormPayload(profile: FullProfile, tailoredCV: TailoredCVSchema): CandidateFormPayload {
    const parts = (profile.fullName || "").trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    return {
      fullName: profile.fullName,
      firstName,
      lastName,
      email: profile.email,
      phone: profile.phone || "",
      location: profile.location || "Colombo, Sri Lanka",
      linkedinUrl: profile.linkedinUrl || "",
      githubUrl: profile.githubUrl || "",
      headline: tailoredCV.headline || profile.headline || "Software Engineer",
      summary: tailoredCV.summary || profile.summary || "",
      skillsList: tailoredCV.highlightSkills.join(", "),
    };
  }

  /**
   * Identifies ATS platform from URL.
   */
  static detectAtsPlatform(url: string): SupportedAtsPlatform {
    const lower = url.toLowerCase();
    if (lower.includes("greenhouse.io") || lower.includes("gh_jid")) return "greenhouse";
    if (lower.includes("lever.co")) return "lever";
    if (lower.includes("ashbyhq.com")) return "ashby";
    return "generic";
  }

  /**
   * Launches an assisted browser session with standard fields pre-filled,
   * strictly halting before submission for human review and click.
   */
  static async launchAssistedSession(
    url: string,
    profile: FullProfile,
    tailoredCv: TailoredCVSchema,
    pdfBuffer?: Buffer,
    headed: boolean = true
  ): Promise<AssistedSessionResult> {
    const urlCheck = validateSafeJobUrl(url);
    if (!urlCheck.isValid || !urlCheck.cleanUrl) {
      return {
        sessionId: `err_${Date.now()}`,
        platform: "generic",
        url,
        filledFields: [],
        unfilledFields: [],
        status: "error",
        message: urlCheck.error || "Disallowed or invalid application URL",
      };
    }
    const safeUrl = urlCheck.cleanUrl;

    const payload = this.prepareFormPayload(profile, tailoredCv);
    const platform = this.detectAtsPlatform(safeUrl);
    const sessionId = `assist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const filledFields: string[] = [];
    const unfilledFields: string[] = [];

    let tempFilePath: string | undefined;

    if (pdfBuffer) {
      const sanitizedName = profile.fullName.replace(/[^a-zA-Z0-9]/g, "_");
      tempFilePath = path.join(os.tmpdir(), `${sanitizedName}_Tailored_Resume_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);
    }

    try {
      const browser = await chromium.launch({
        headless: !headed,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });

      // Intelligent selector matching based on ATS or generic form inputs
      await this.fillFormField(page, ['#first_name', 'input[name*="first_name" i]', 'input[name*="firstName" i]', '#firstName'], payload.firstName, "First Name", filledFields, unfilledFields);
      await this.fillFormField(page, ['#last_name', 'input[name*="last_name" i]', 'input[name*="lastName" i]', '#lastName'], payload.lastName, "Last Name", filledFields, unfilledFields);
      await this.fillFormField(page, ['#name', 'input[name="name" i]', 'input[autocomplete="name"]'], payload.fullName, "Full Name", filledFields, unfilledFields);
      await this.fillFormField(page, ['#email', 'input[type="email"]', 'input[name*="email" i]'], payload.email, "Email", filledFields, unfilledFields);
      await this.fillFormField(page, ['#phone', 'input[type="tel"]', 'input[name*="phone" i]'], payload.phone, "Phone", filledFields, unfilledFields);
      await this.fillFormField(page, ['input[name*="linkedin" i]', 'input[id*="linkedin" i]'], payload.linkedinUrl, "LinkedIn URL", filledFields, unfilledFields);
      await this.fillFormField(page, ['input[name*="github" i]', 'input[id*="github" i]'], payload.githubUrl, "GitHub URL", filledFields, unfilledFields);

      // Attach PDF resume if available and file upload input exists
      if (tempFilePath) {
        try {
          const fileInput = await page.$('input[type="file"][id*="resume" i], input[type="file"][name*="resume" i], input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(tempFilePath);
            filledFields.push("Resume PDF File");
          } else {
            unfilledFields.push("Resume PDF File (no upload input located)");
          }
        } catch {
          unfilledFields.push("Resume PDF File");
        }
      }

      // Store active session so user or worker can track it
      activeSessions.set(sessionId, { context, page, tempFilePath });

      return {
        sessionId,
        platform,
        url,
        filledFields,
        unfilledFields,
        status: "ready_for_human_review",
        message: `Assisted session active. Form fields populated (${filledFields.join(", ")}). Browser is open for your final review and human submission.`,
      };
    } catch (err: unknown) {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
      const message = err instanceof Error ? err.message : "Error launching assisted browser session";
      return {
        sessionId,
        platform,
        url,
        filledFields,
        unfilledFields,
        status: "error",
        message,
      };
    }
  }

  /**
   * Helper to fill an input matching one of several candidate selectors.
   */
  private static async fillFormField(
    page: Page,
    selectors: string[],
    value: string,
    fieldName: string,
    filled: string[],
    unfilled: string[]
  ): Promise<boolean> {
    if (!value) return false;

    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await el.fill(value);
          filled.push(fieldName);
          return true;
        }
      } catch {
        // continue to next selector
      }
    }
    unfilled.push(fieldName);
    return false;
  }

  /**
   * Closes an active assisted browser session when application is confirmed or cancelled.
   */
  static async closeSession(sessionId: string): Promise<void> {
    const session = activeSessions.get(sessionId);
    if (session) {
      try {
        await session.context.close();
      } catch {}
      if (session.tempFilePath && fs.existsSync(session.tempFilePath)) {
        try { fs.unlinkSync(session.tempFilePath); } catch {}
      }
      activeSessions.delete(sessionId);
    }
  }
}
