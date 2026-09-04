import { exact, optionalText, record, text } from "./helpers.ts";
import { parseNoticeCategory, parseNoticeColour } from "./notice-parser.ts";
import type { NoticeCategory, NoticeColour } from "./notice-types.ts";

export type CapturedNotice = {
  title: string;
  detail: string;
  category: NoticeCategory;
  assignedTo: string;
  due: string;
  colour: NoticeColour;
};

export type NoticeCaptureResponse = {
  notice: CapturedNotice;
  transcript?: string;
};

function boundedString(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value.trim();
}

export function parseCapturedNotice(value: unknown): CapturedNotice {
  const notice = record(value, "Captured notice");
  exact(notice, ["title", "detail", "category", "assignedTo", "due", "colour"], "Captured notice");
  return {
    title: text(notice.title, "Captured notice title", 54),
    detail: boundedString(notice.detail, "Captured notice detail", 120),
    category: parseNoticeCategory(notice.category),
    assignedTo: text(notice.assignedTo, "Captured notice assignee", 120),
    due: boundedString(notice.due, "Captured notice due label", 60),
    colour: parseNoticeColour(notice.colour),
  };
}

export function parseNoticeCaptureResponse(value: unknown): NoticeCaptureResponse {
  const response = record(value, "Notice capture response");
  exact(response, ["notice", "transcript"], "Notice capture response");
  return {
    notice: parseCapturedNotice(response.notice),
    transcript: optionalText(response.transcript, "Notice capture transcript", 8_000),
  };
}
