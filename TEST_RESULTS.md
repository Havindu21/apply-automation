# JobPilot Test Results & Verification Report

## Test Summary
* **Test Runner:** Vitest v5.0.5
* **Total Test Suites:** 9 passed (9 total)
* **Total Tests:** 47 passed (47 total)
* **Execution Time:** ~1.3s
* **Linting:** Clean (0 errors, 0 warnings across all `.ts` and `.tsx` files)
* **Production Build:** Clean (Next.js 16 Webpack build, 18 routes compiled)
* **Status:** ALL TESTS PASSING

---

## Detailed Test Breakdown

### 1. Application State Machine & Human Gatekeeper (`src/lib/applications/__tests__/state-machine.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Allows legal progression through the pipeline | PASS | Validated `discovered -> matched -> prepared -> review -> approved -> applying -> submitted -> confirmed`. |
| 2 | Strictly blocks automated system actors from approving an application | PASS | Enforced human-gatekeeper rule: system/AI actor cannot transition to `approved`. |
| 3 | Strictly blocks illegal state skips (e.g. review straight to applying or submitted) | PASS | Blocked skipping human review and approval gates. |
| 4 | Strictly requires human action for confirmed state | PASS | Enforced human confirmation evidence requirement for `confirmed`. |
| 5 | Allows un-approving or withdrawing from review | PASS | Verified bidirectional adjustments (e.g. withdraw, return to review). |
| 6 | Provides correct available transitions for human actor | PASS | Verified available transition list from `review`. |

---

### 2. PDF Generator & ATS Semantic Templates (`src/lib/documents/__tests__/pdf-generator.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Generates semantic ATS HTML with proper sections and escaping | PASS | Verified semantic typography, standard headers, and contact metadata. |
| 2 | Generates semantic cover letter HTML | PASS | Verified formal letter styling, recipient, and signature formatting. |
| 3 | Renders a binary PDF buffer from the tailored CV via Playwright | PASS | Chromium rendered vector ATS PDF with `%PDF-` magic header bytes (~10KB). |

---

### 3. Assisted Form Copilot (`src/lib/copilot/__tests__/form-filler.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Extracts clean candidate form payload with first/last names separated | PASS | Validated name splitting, contact info, headline, and skills list. |
| 2 | Accurately detects ATS platforms from URLs | PASS | Correctly identified Greenhouse, Lever, Ashby, and Generic portals. |

---

### 4. CV Truth Verifier & Hallucination Guard (`src/lib/tailoring/__tests__/verifier.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Passes when all claims cite verified fact IDs | PASS | Validated 100% verified fact tracing. |
| 2 | Fails verification if a bullet has zero cited fact IDs | PASS | Blocked ungrounded statement. |
| 3 | Fails verification if a bullet cites an UNVERIFIED fact | PASS | Blocked citation of imported but unreviewed fact. |
| 4 | Fails verification if fact ID does not exist | PASS | Caught non-existent ID. |
| 5 | Fails verification if LLM introduces hallucinated metric | PASS | Blocked invented numbers (e.g. "50% speed increase", "10,000 users"). |
| 6 | Fails verification if undeclared skill is inserted | PASS | Blocked hallucinated skills (e.g. "Kubernetes"). |

---

### 5. Two-Tier Job Matcher (`src/lib/matching/__tests__/matcher.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Tier 1: Rejects jobs failing geographic eligibility | PASS | Blocked US-only job immediately without LLM tokens. |
| 2 | Tier 1: Rejects jobs with incompatible work mode (onsite) | PASS | Blocked onsite role when remote-only mode active. |
| 3 | Tier 1: Rejects jobs from excluded companies | PASS | Filtered out excluded employer. |
| 4 | Tier 2: Assigns Frontend profile for React role | PASS | Selected `cp-frontend` and verified alignment. |
| 5 | Tier 2: Assigns Flutter profile for Mobile role | PASS | Selected `cp-flutter` based on StoreKit & in-app purchases. |
| 6 | Tier 2: Assigns Backend profile for Spring Boot role | PASS | Selected `cp-backend` based on Spring AOP & database facts. |

---

### 6. Geographic Hiring Eligibility & Deduplication (`src/lib/discovery/__tests__/discovery.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Approves explicit Worldwide & Work-From-Anywhere jobs | PASS | Verified positive detection on "Worldwide" and "Open to all countries". |
| 2 | Approves jobs explicitly mentioning Sri Lanka or APAC | PASS | Verified APAC and Sri Lanka regional flags. |
| 3 | Strictly rejects US-only and US Work Auth restricted roles | PASS | Caught "Must reside in US", "US Work Auth Required", and "W2 only". |
| 4 | Rejects Europe/UK only and Canada only restricted roles | PASS | Discarded jurisdiction-locked European and Canadian listings. |
| 5 | Prioritizes negative restrictions over generic 'remote' | PASS | Confirmed "100% remote" + "US only" resolves as ineligible. |
| 6 | Normalizes tracking parameters and generates stable hash | PASS | Stripped `utm_source`, `ref`, and trailing slashes to produce matching hashes. |
| 7 | Computes normalized composite dedupe keys | PASS | Normalized "Sr. Frontend Engineer" vs "Senior Frontend Engineer". |

---

### 7. Spec 001: Profile Schema Validation (`src/lib/validation/__tests__/profile.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Criterion 1: valid profile passes successfully | PASS | Validated comprehensive profile payload against FullProfileSchema. |
| 2 | Criterion 2: bad date format fails | PASS | Caught non-YYYY-MM format strings (`2025/09/01`). |
| 3 | Criterion 3: end date before start date fails | PASS | Caught `endDate < startDate` cross-field refinement error. |
| 4 | Criterion 4: all work modes off fails | PASS | Caught `{ remote: false, hybrid: false, onsite: false }` violation. |
| 5 | Criterion 5: fact referencing an unknown skill fails | PASS | Caught fact citing skill ID absent from candidate skills catalog. |
| 6 | Criterion 6: duplicate skill IDs within a fact fails | PASS | Caught duplicate skill IDs (`["spring-boot", "spring-boot"]`). |
| 7 | Criterion 7: empty or over-300-character fact fails | PASS | Verified lower (1 char) and upper (300 char) boundaries. |
| 8 | Criterion 8: experience with no facts fails | PASS | Enforced requirement that every experience entry has at least 1 fact. |

---

### 8. Initial Profile Data Integrity (`src/lib/cv/__tests__/initial-cv-data.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | Initial profile matches candidate's actual extracted credentials | PASS | Verified Havindu Hesara's core identity, email, and phone. |
| 2 | All imported facts are initialized with isVerified: false | PASS | Guarded zero-hallucination baseline. |
| 3 | Skills map contains required core competencies | PASS | Verified React, Next.js, Spring Boot, MySQL, Flutter presence. |
| 4 | Experience and project entries have valid atomic facts | PASS | Verified Mobios & Arimac experience facts exist. |

---

### 9. Profile Service & In-Memory Fallback (`src/lib/services/__tests__/profile-service.test.ts`)
| # | Test Name | Result | Details |
|---|---|---|---|
| 1 | In-memory fallback functions when database is offline | PASS | Confirmed resilient zero-downtime development workflow. |
| 2 | Updates atomic fact verification status | PASS | Verified fact status toggling (`isVerified: true`). |
| 3 | Verifies all unverified facts in bulk | PASS | Verified bulk approval functionality. |
| 4 | Updates user preferences with immediate effect | PASS | Verified work-mode and country filtering persistence. |
| 5 | Toggles active career profiles | PASS | Verified selective enabling/disabling of target role profiles. |
