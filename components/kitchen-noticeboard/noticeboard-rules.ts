import type { CSSProperties } from "react";

import {
  buildNoticeArtifacts,
  emptyNoticeDraft,
  noticeCategories,
  noticeReminderGroup,
  resolveNoticeDate,
  toNoticeDateKey,
  type KitchenNoticeDraft,
} from "@diarydock/kitchen";

import type { KitchenNotice } from "@/lib/diarydock-data";

export {
  buildNoticeArtifacts,
  emptyNoticeDraft,
  noticeCategories,
  noticeReminderGroup,
  resolveNoticeDate,
  toNoticeDateKey,
};
export type NoticeDraft = KitchenNoticeDraft;

export const noticeColourStyles: Record<KitchenNotice["colour"], string> = {
  cream: "bg-[#fff8df] border-[#eadcb5]",
  sage: "bg-[#e8f0df] border-[#c9d6b9]",
  blue: "bg-[#e8f1f4] border-[#cadce2]",
  clay: "bg-[#f4e4da] border-[#dfc6b6]",
};

export const noticePinStyles: Record<KitchenNotice["colour"], string> = {
  cream: "bg-[#d5a842]",
  sage: "bg-[#718b62]",
  blue: "bg-[#6f8f9b]",
  clay: "bg-[#b87961]",
};

export function noticePlacement(index: number, total: number): CSSProperties {
  const simple = [
    [1, 1, -0.8], [51, 2, 0.8], [2, 51, 0.7], [52, 50, -0.7],
  ];
  if (total <= 4) {
    const [left, top, rotate] = simple[index] ?? simple[0]!;
    return { left: `${left}%`, top: `${top}%`, width: "47%", height: "47%",
      transform: `rotate(${rotate}deg)`, zIndex: total - index };
  }
  const natural = [
    [1, 1, 47, 27, -1.2], [51, 2, 47, 27, 1.1], [2, 30, 47, 27, 0.8],
    [51, 30, 47, 27, -0.9], [1, 59, 31, 23, -1.8], [34.5, 58, 31, 24, 1.3],
    [68, 59, 31, 23, -1], [18, 83, 64, 15, 0.5],
  ];
  const position = natural[index];
  if (position) {
    const [left, top, width, height, rotate] = position;
    return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
      transform: `rotate(${rotate}deg)`, zIndex: total - index };
  }
  const extra = index - natural.length;
  return { left: `${3 + ((extra * 29 + 11) % 63)}%`, top: `${8 + ((extra * 19 + 17) % 66)}%`,
    width: "32%", height: "22%", transform: `rotate(${((extra * 7) % 11) - 5}deg)`,
    zIndex: total - index };
}
