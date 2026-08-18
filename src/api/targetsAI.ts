/**
 * Shape of a `set_nutrition_targets` tool call from the assistant chat (see
 * assistantAI.ts) — the model computes these directly via Claude's tool-calling
 * rather than a separate structured-output endpoint; this type is shared by the
 * validator and TargetsProposalCard.
 */
export interface ProposedTargets {
  calorieTarget: number
  protein: number
  carbs: number
  fat: number
  goalLabel: string
  reasoning: string
  tips: string[]
}
