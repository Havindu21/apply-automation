import { chromium, Browser } from "playwright";
import { FullProfile } from "../validation/profile";
import { TailoredCVSchema } from "../tailoring/verifier";
import { generateATSSemanticHTML, generateCoverLetterSemanticHTML } from "./ats-template";

export class PDFGenerator {
  /**
   * Generates a high-fidelity, single-column ATS PDF from a tailored CV and profile.
   */
  static async generateCVPdf(
    tailoredCV: TailoredCVSchema,
    profile: FullProfile
  ): Promise<Buffer> {
    const html = generateATSSemanticHTML(tailoredCV, profile);
    return this.renderHtmlToPdf(html);
  }

  /**
   * Generates a formal Cover Letter PDF.
   */
  static async generateCoverLetterPdf(
    coverLetterText: string,
    profile: FullProfile,
    jobTitle?: string,
    company?: string
  ): Promise<Buffer> {
    const html = generateCoverLetterSemanticHTML(coverLetterText, profile, jobTitle, company);
    return this.renderHtmlToPdf(html);
  }

  /**
   * Internal renderer utilizing Playwright Chromium in headless mode.
   */
  private static async renderHtmlToPdf(html: string): Promise<Buffer> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "15mm",
          bottom: "15mm",
          left: "15mm",
          right: "15mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}
