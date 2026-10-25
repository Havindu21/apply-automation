import { describe, it, expect } from "vitest";
import { ApplicationStateMachine } from "../state-machine";

describe("ApplicationStateMachine", () => {
  it("allows legal progression through the pipeline", () => {
    // discovered -> matched -> prepared -> review -> approved -> applying -> submitted -> confirmed
    expect(ApplicationStateMachine.validateTransition("discovered", "matched", "system").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("matched", "prepared", "system").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("prepared", "review", "system").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("review", "approved", "human").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("approved", "applying", "human").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("applying", "submitted", "human").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("submitted", "confirmed", "human", "Ref #12345 verified via email").valid).toBe(true);
  });

  it("strictly blocks confirmed state without actual submission outcome evidence", () => {
    const noEvidence = ApplicationStateMachine.validateTransition("submitted", "confirmed", "human");
    expect(noEvidence.valid).toBe(false);
    expect(noEvidence.error).toContain("requires actual user-confirmed submission outcome evidence");

    const shortEvidence = ApplicationStateMachine.validateTransition("submitted", "confirmed", "human", "ok");
    expect(shortEvidence.valid).toBe(false);
    expect(shortEvidence.error).toContain("requires actual user-confirmed submission outcome evidence");
  });

  it("strictly blocks automated system actors from approving an application", () => {
    const result = ApplicationStateMachine.validateTransition("review", "approved", "system");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Policy violation: An application can only be approved by a verified human action");
  });

  it("strictly blocks illegal state skips (e.g. review straight to applying or submitted)", () => {
    const resultToApplying = ApplicationStateMachine.validateTransition("review", "applying", "human");
    expect(resultToApplying.valid).toBe(false);
    expect(resultToApplying.error).toContain("Illegal state transition");

    const resultToSubmitted = ApplicationStateMachine.validateTransition("review", "submitted", "human");
    expect(resultToSubmitted.valid).toBe(false);
  });

  it("strictly requires human action for confirmed state", () => {
    const result = ApplicationStateMachine.validateTransition("submitted", "confirmed", "system");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("requires explicit human confirmation evidence");
  });

  it("allows un-approving or withdrawing from review", () => {
    expect(ApplicationStateMachine.validateTransition("approved", "review", "human").valid).toBe(true);
    expect(ApplicationStateMachine.validateTransition("review", "withdrawn", "human").valid).toBe(true);
  });

  it("provides correct available transitions for human actor", () => {
    const availableFromReview = ApplicationStateMachine.getAvailableTransitions("review", "human");
    expect(availableFromReview).toContain("approved");
    expect(availableFromReview).toContain("prepared");
    expect(availableFromReview).toContain("withdrawn");
    expect(availableFromReview).not.toContain("applying");
  });
});
