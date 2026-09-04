import "server-only";

import type { SearchCandidate } from "@diarydock/search";

import { createAskAnswer } from "./openai";
import { deterministicAskAnswer, retrieveAskCitations } from "./retrieval";

export async function answerAuthorizedQuestion(
  candidates: SearchCandidate[],
  question: string,
) {
  const citations = retrieveAskCitations(candidates, question);
  if (!citations.length) {
    return { answer: deterministicAskAnswer([]), citations: [], usedAI: false };
  }

  let answer = deterministicAskAnswer(citations);
  let cited = citations;
  let usedAI = false;
  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await createAskAnswer({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
        question,
        citations,
      });
      const allowedRefs = new Set(generated.citationRefs);
      const verified = citations.filter((citation) => allowedRefs.has(citation.ref));
      if (generated.answer.trim() && verified.length) {
        answer = generated.answer.trim();
        cited = verified;
        usedAI = true;
      }
    } catch {
      // Deterministic output preserves availability without widening retrieval.
    }
  }

  return {
    answer,
    citations: cited.map((citation) => ({
      id: citation.id,
      category: citation.category,
      title: citation.title,
      detail: citation.detail,
      href: citation.href,
      dueAt: citation.dueAt,
      badge: citation.badge,
    })),
    usedAI,
  };
}
