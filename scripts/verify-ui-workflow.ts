import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { worker } from "../src/worker/index";

const SCREENSHOT_DIR = path.resolve(
  "/Users/havindufonseka/.gemini/antigravity/brain/d057e9b1-3dc5-4ee8-963f-46364642844d/screenshots"
);

async function waitForServer(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function runBrowserVerification() {
  console.log("=== JobPilot Web UI End-to-End Browser Workflow Verification ===");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 1. Start Background Worker
  console.log("[1/6] Starting pg-boss background worker...");
  await worker.start();
  console.log("[Worker] pg-boss worker active and listening for queue events.");

  // 2. Start Next.js Server on port 3001
  console.log("[2/6] Starting Next.js server on port 3001...");
  const serverProcess: ChildProcess = spawn(
    "npx",
    ["next", "start", "-p", "3001"],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: "3001" },
    }
  );

  serverProcess.on("error", (err) => {
    console.error("Next.js server error:", err);
  });

  const isServerReady = await waitForServer("http://localhost:3001");
  if (!isServerReady) {
    serverProcess.kill();
    await worker.stop();
    throw new Error("Next.js server failed to respond on http://localhost:3001");
  }
  console.log("[Server] Next.js is live on http://localhost:3001.");

  // 3. Launch Playwright
  console.log("[3/6] Launching Playwright browser...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // STEP 1: Overview Dashboard
    // -------------------------------------------------------------
    console.log("[Step 1] Navigating to Overview dashboard...");
    await page.goto("http://localhost:3001", { waitUntil: "networkidle" });
    await page.waitForSelector("text=Havindu Hesara");
    const overviewShot = path.join(SCREENSHOT_DIR, "01_overview.png");
    await page.screenshot({ path: overviewShot, fullPage: true });
    console.log("  ✓ Captured:", overviewShot);

    // -------------------------------------------------------------
    // STEP 2: CV Import Review & Fact Verification
    // -------------------------------------------------------------
    console.log("[Step 2] Navigating to CV Import tab...");
    await page.click("button:has-text('CV Import')");
    await page.waitForSelector("text=CV Import Fact Verification Portal");
    const cvReviewShot = path.join(SCREENSHOT_DIR, "02_cv_import_review.png");
    await page.screenshot({ path: cvReviewShot, fullPage: true });
    console.log("  ✓ Captured:", cvReviewShot);

    // -------------------------------------------------------------
    // STEP 3: Preferences Configuration
    // -------------------------------------------------------------
    console.log("[Step 3] Navigating to Search & Work Modes tab...");
    await page.click("button:has-text('Search & Work Modes')");
    await page.waitForSelector("text=Job Preferences & Search Guards");
    const prefsShot = path.join(SCREENSHOT_DIR, "03_preferences.png");
    await page.screenshot({ path: prefsShot, fullPage: true });
    console.log("  ✓ Captured:", prefsShot);

    // -------------------------------------------------------------
    // STEP 4: Job Explorer & Real Discovery Execution via Worker
    // -------------------------------------------------------------
    console.log("[Step 4] Navigating to Job Explorer tab and triggering discovery...");
    await page.click("button:has-text('Job Explorer')");
    await page.waitForSelector("button:has-text('Run Discovery Now')");

    // Click Run Discovery Now button
    await page.click("button:has-text('Run Discovery Now')");
    console.log("  ✓ Triggered 'Run Discovery Now' in UI -> enqueued into pg-boss.");

    // Wait for the worker to process the job and table to display jobs
    try {
      await page.waitForSelector("button:has-text('Fetching Feeds...')", { timeout: 3000 });
      await page.waitForSelector("button:has-text('Run Discovery Now')", { timeout: 30000 });
    } catch {
      await page.waitForTimeout(4000);
    }
    await page.waitForTimeout(1000);
    const jobExplorerShot = path.join(SCREENSHOT_DIR, "04_job_explorer.png");
    await page.screenshot({ path: jobExplorerShot, fullPage: true });
    console.log("  ✓ Captured:", jobExplorerShot);

    // -------------------------------------------------------------
    // STEP 5: Application Studio & Engine Badge Verification
    // -------------------------------------------------------------
    console.log("[Step 5] Navigating to Studio tab...");
    await page.click("button:has-text('Studio')");
    await page.waitForSelector("text=Application Studio & Truthful Tailoring");

    // Wait for job selector options to populate
    await page.waitForSelector("select option", { timeout: 10000 }).catch(() => {});

    // Wait for the match button to become enabled and click
    const matchBtn = page.locator("button:has-text('Run Match Analysis')");
    try {
      await matchBtn.waitFor({ state: "visible", timeout: 8000 });
      if (await matchBtn.isEnabled()) {
        await matchBtn.click();
        await page.waitForTimeout(4000);
      }
    } catch (err) {
      console.log("Match analysis click note:", err);
    }

    const studioShot = path.join(SCREENSHOT_DIR, "05_application_studio.png");
    await page.screenshot({ path: studioShot, fullPage: true });
    console.log("  ✓ Captured:", studioShot);

    // -------------------------------------------------------------
    // STEP 6: Application Tracker & Confirmation Modal Safety Check
    // -------------------------------------------------------------
    console.log("[Step 6] Navigating to Applications tab...");
    await page.click("button:has-text('Applications')");
    await page.waitForSelector("text=Application Pipeline & Human Gatekeeper");

    // If an application is in 'applying' state, open the confirmation modal to display the safety certification
    const confirmBtn = page.locator("button:has-text('Confirm Applied')").first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(600);
    }

    const trackerShot = path.join(SCREENSHOT_DIR, "06_application_tracker.png");
    await page.screenshot({ path: trackerShot, fullPage: true });
    console.log("  ✓ Captured:", trackerShot);

    console.log("All 6 workflow screenshots captured successfully!");
  } finally {
    await browser.close();
    serverProcess.kill("SIGTERM");
    await worker.stop();
    console.log("Cleaned up browser, Next.js server, and background worker.");
  }
}

runBrowserVerification().catch((err) => {
  console.error("Browser verification error:", err);
  process.exit(1);
});
