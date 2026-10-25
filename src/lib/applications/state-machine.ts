export type ApplicationStatus =
  | "discovered"
  | "matched"
  | "prepared"
  | "review"
  | "approved"
  | "applying"
  | "submitted"
  | "confirmed"
  | "responded"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type TransitionActor = "human" | "system";

export interface StateTransitionEvent {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  actor: TransitionActor;
  reason?: string;
  evidence?: string;
  timestamp: string;
}

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
}

export class ApplicationStateMachine {
  /**
   * Allowed state transitions map.
   * Key: current status, Value: array of allowed target statuses
   */
  private static readonly ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    discovered: ["matched", "withdrawn"],
    matched: ["prepared", "withdrawn"],
    prepared: ["review", "withdrawn"],
    review: ["approved", "prepared", "rejected", "withdrawn"],
    approved: ["applying", "review", "withdrawn"],
    applying: ["submitted", "approved", "withdrawn"],
    submitted: ["confirmed", "applying", "responded", "interview", "rejected", "withdrawn"],
    confirmed: ["responded", "interview", "offer", "rejected", "withdrawn"],
    responded: ["interview", "rejected", "withdrawn"],
    interview: ["offer", "rejected", "withdrawn"],
    offer: ["withdrawn"], // e.g. accepted offer or declined
    rejected: ["review", "withdrawn"], // Can be manually re-evaluated if desired
    withdrawn: ["review"], // Can be reopened
  };

  /**
   * Validates if a transition is legal given the actor and current state.
   */
  static validateTransition(
    from: ApplicationStatus,
    to: ApplicationStatus,
    actor: TransitionActor = "human",
    evidence?: string
  ): TransitionValidationResult {
    // 1. Same state is a no-op
    if (from === to) {
      return { valid: true };
    }

    // 2. Check if transition is in the graph
    const allowed = this.ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      return {
        valid: false,
        error: `Illegal state transition from "${from}" to "${to}". Allowed transitions: ${allowed ? allowed.join(", ") : "none"}.`,
      };
    }

    // 3. Human Gatekeeper Rule: ONLY humans can approve an application
    if (to === "approved" && actor !== "human") {
      return {
        valid: false,
        error: `Policy violation: An application can only be approved by a verified human action. System/AI actors cannot approve applications.`,
      };
    }

    // 4. Human Confirmation Rule: Confirmed applications require explicit human signoff and submission evidence
    if (to === "confirmed") {
      if (actor !== "human") {
        return {
          valid: false,
          error: `Policy violation: "confirmed" state requires explicit human confirmation evidence. System/AI actors cannot confirm submission.`,
        };
      }
      if (!evidence || evidence.trim().length < 5) {
        return {
          valid: false,
          error: `Policy violation: "confirmed" state requires actual user-confirmed submission outcome evidence (e.g. Confirmation Reference Number, Confirmation URL, or Email proof). An attempted form fill does not qualify as confirmation.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Returns list of reachable states from current status for the given actor.
   */
  static getAvailableTransitions(
    current: ApplicationStatus,
    actor: TransitionActor = "human"
  ): ApplicationStatus[] {
    const reachable = this.ALLOWED_TRANSITIONS[current] || [];
    return reachable.filter((target) => this.validateTransition(current, target, actor).valid);
  }

  /**
   * Human-readable label for application statuses.
   */
  static getStatusLabel(status: ApplicationStatus): string {
    const labels: Record<ApplicationStatus, string> = {
      discovered: "Discovered",
      matched: "Matched & Scored",
      prepared: "Package Prepared",
      review: "Pending Review",
      approved: "Approved for Apply",
      applying: "Applying in Progress",
      submitted: "Submitted / Awaiting Conf",
      confirmed: "Confirmed Applied",
      responded: "Employer Responded",
      interview: "Interview Scheduled",
      offer: "Job Offer Received",
      rejected: "Not Selected",
      withdrawn: "Withdrawn / Archived",
    };
    return labels[status] || status;
  }
}
