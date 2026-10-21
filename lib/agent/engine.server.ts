// Picks which LLM drives the agent. LLM_PROVIDER = "claude" | "sarvam" | "offline" forces one;
// otherwise Claude if ANTHROPIC_API_KEY is set, then Sarvam (free) if SARVAM_API_KEY is set,
// else the offline rule-based agent. All engines use the same tools.
import { claudeConfigured } from "./claude";
import { sarvamChatConfigured } from "./sarvam";

export type Engine = "claude" | "sarvam" | "offline";

export function activeEngine(): Engine {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "offline") return "offline";
  if (forced === "claude" && claudeConfigured()) return "claude";
  if (forced === "sarvam" && sarvamChatConfigured()) return "sarvam";
  if (claudeConfigured()) return "claude";
  if (sarvamChatConfigured()) return "sarvam";
  return "offline";
}
