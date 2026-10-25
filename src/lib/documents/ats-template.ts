import { FullProfile } from "../validation/profile";
import { TailoredCVSchema } from "../tailoring/verifier";

export function generateATSSemanticHTML(
  tailoredCV: TailoredCVSchema,
  profile: FullProfile
): string {
  const skillsByCategory = groupSkills(tailoredCV.highlightSkills, profile);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(profile.fullName)} — ATS Resume</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, "Nimbus Sans L", sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      text-align: center;
      margin-bottom: 12pt;
      padding-bottom: 6pt;
      border-bottom: 1.5pt solid #222222;
    }
    .name {
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: -0.5pt;
      text-transform: uppercase;
      margin: 0 0 3pt 0;
      color: #000000;
    }
    .headline {
      font-size: 10.5pt;
      font-weight: bold;
      color: #333333;
      margin: 0 0 4pt 0;
    }
    .contact-line {
      font-size: 9pt;
      color: #444444;
      margin: 0;
    }
    .contact-line a {
      color: #111111;
      text-decoration: none;
    }
    .section {
      margin-bottom: 11pt;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      border-bottom: 1pt solid #444444;
      padding-bottom: 2pt;
      margin: 0 0 6pt 0;
      color: #111111;
    }
    .summary-text {
      margin: 0;
      text-align: justify;
    }
    .skills-line {
      margin-bottom: 3pt;
      font-size: 9.5pt;
    }
    .skills-category {
      font-weight: bold;
      color: #222222;
    }
    .entry {
      margin-bottom: 8pt;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1pt;
    }
    .entry-title {
      font-weight: bold;
      font-size: 10pt;
      color: #000000;
    }
    .entry-company {
      font-weight: bold;
      color: #333333;
    }
    .entry-dates {
      font-size: 9pt;
      font-weight: normal;
      color: #444444;
      text-align: right;
      white-space: nowrap;
    }
    .entry-location {
      font-size: 8.5pt;
      color: #666666;
      font-style: italic;
    }
    ul.bullets {
      margin: 3pt 0 0 0;
      padding-left: 14pt;
    }
    ul.bullets li {
      margin-bottom: 2.5pt;
      text-align: justify;
    }
    .fact-tag {
      font-size: 7pt;
      color: #888888;
      font-family: monospace;
      margin-left: 4pt;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <h1 class="name">${escapeHtml(profile.fullName)}</h1>
    <div class="headline">${escapeHtml(tailoredCV.headline || profile.headline || "Software Engineer")}</div>
    <div class="contact-line">
      ${profile.phone ? `${escapeHtml(profile.phone)} • ` : ""}
      <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
      ${profile.location ? ` • ${escapeHtml(profile.location)}` : ""}
      ${profile.linkedinUrl ? ` • <a href="${escapeHtml(profile.linkedinUrl)}">LinkedIn</a>` : ""}
      ${profile.githubUrl ? ` • <a href="${escapeHtml(profile.githubUrl)}">GitHub</a>` : ""}
    </div>
  </div>

  <!-- PROFESSIONAL SUMMARY -->
  ${tailoredCV.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary-text">${escapeHtml(tailoredCV.summary)}</p>
  </div>
  ` : ""}

  <!-- TECHNICAL SKILLS -->
  <div class="section">
    <div class="section-title">Technical Skills</div>
    ${skillsByCategory.map((cat) => `
      <div class="skills-line">
        <span class="skills-category">${escapeHtml(cat.name)}:</span>
        ${cat.skills.map((s) => escapeHtml(s)).join(", ")}
      </div>
    `).join("")}
  </div>

  <!-- PROFESSIONAL EXPERIENCE -->
  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${tailoredCV.experiences.map((exp) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(exp.role)} — <span class="entry-company">${escapeHtml(exp.company)}</span></span>
          <span class="entry-dates">${formatDates(exp.startDate, exp.endDate)}</span>
        </div>
        <ul class="bullets">
          ${exp.bullets.map((b) => `
            <li>
              ${escapeHtml(b.text)}
              <span class="fact-tag">[${b.citedFactIds.join(",")}]</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("")}
  </div>

  <!-- PROJECTS & ENGINEERING CONTRIBUTIONS -->
  <div class="section">
    <div class="section-title">Key Projects & Systems</div>
    ${tailoredCV.projects.map((proj) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(proj.name)} ${proj.role ? `— ${escapeHtml(proj.role)}` : ""}</span>
          <span class="entry-dates">${proj.technologies.slice(0, 4).join(", ")}</span>
        </div>
        <ul class="bullets">
          ${proj.bullets.map((b) => `
            <li>
              ${escapeHtml(b.text)}
              <span class="fact-tag">[${b.citedFactIds.join(",")}]</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("")}
  </div>

  <!-- EDUCATION -->
  <div class="section">
    <div class="section-title">Education & Qualifications</div>
    ${profile.educations.map((edu) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(edu.degree)} — <span class="entry-company">${escapeHtml(edu.institution)}</span></span>
          <span class="entry-dates">${formatDates(edu.startDate, edu.endDate)}</span>
        </div>
      </div>
    `).join("")}
  </div>

</body>
</html>`;
}

export function generateCoverLetterSemanticHTML(
  coverLetterText: string,
  profile: FullProfile,
  jobTitle?: string,
  company?: string
): string {
  const paragraphs = coverLetterText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(profile.fullName)} — Cover Letter${company ? ` (${company})` : ""}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 20mm 20mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, "Nimbus Sans L", sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      margin-bottom: 20pt;
      padding-bottom: 10pt;
      border-bottom: 1.5pt solid #222222;
    }
    .name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 3pt 0;
      color: #000000;
    }
    .headline {
      font-size: 10pt;
      font-weight: bold;
      color: #444444;
      margin: 0 0 4pt 0;
    }
    .contact-line {
      font-size: 9pt;
      color: #555555;
    }
    .contact-line a {
      color: #111111;
      text-decoration: none;
    }
    .letter-meta {
      margin-bottom: 20pt;
      font-size: 9.5pt;
      color: #333333;
    }
    .letter-body p {
      margin: 0 0 12pt 0;
      text-align: justify;
    }
    .sign-off {
      margin-top: 24pt;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <h1 class="name">${escapeHtml(profile.fullName)}</h1>
    <div class="headline">${escapeHtml(profile.headline || "Software Engineer")}</div>
    <div class="contact-line">
      ${profile.phone ? `${escapeHtml(profile.phone)} • ` : ""}
      <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
      ${profile.location ? ` • ${escapeHtml(profile.location)}` : ""}
      ${profile.linkedinUrl ? ` • <a href="${escapeHtml(profile.linkedinUrl)}">LinkedIn</a>` : ""}
      ${profile.githubUrl ? ` • <a href="${escapeHtml(profile.githubUrl)}">GitHub</a>` : ""}
    </div>
  </div>

  <div class="letter-meta">
    <div>${formattedDate}</div>
    ${company ? `<div style="margin-top: 8pt; font-weight: bold;">Hiring Team</div><div>${escapeHtml(company)}</div>` : ""}
    ${jobTitle ? `<div style="margin-top: 4pt; font-style: italic;">Application for: ${escapeHtml(jobTitle)}</div>` : ""}
  </div>

  <div class="letter-body">
    ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
  </div>

  <div class="sign-off">
    <div>Sincerely,</div>
    <div style="margin-top: 16pt; font-weight: bold;">${escapeHtml(profile.fullName)}</div>
  </div>

</body>
</html>`;
}

function groupSkills(highlightSkills: string[], profile: FullProfile): Array<{ name: string; skills: string[] }> {
  const profileSkillsMap = new Map(profile.skills.map((s) => [s.name.toLowerCase(), s]));

  const groups: Record<string, string[]> = {
    "Frontend & UI": [],
    "Backend & APIs": [],
    "Mobile Development": [],
    "AI & Data": [],
    "Databases & Tools": [],
  };

  for (const skill of highlightSkills) {
    const meta = profileSkillsMap.get(skill.toLowerCase());
    const cat = meta?.category || "general";

    if (cat === "frontend") groups["Frontend & UI"].push(skill);
    else if (cat === "backend" || cat === "auth") groups["Backend & APIs"].push(skill);
    else if (cat === "mobile") groups["Mobile Development"].push(skill);
    else if (cat === "ai_ml") groups["AI & Data"].push(skill);
    else groups["Databases & Tools"].push(skill);
  }

  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([name, skills]) => ({ name, skills }));
}

function formatDates(start: string, end: string | null | undefined): string {
  if (!end) return `${start} — Present`;
  return `${start} — ${end}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
