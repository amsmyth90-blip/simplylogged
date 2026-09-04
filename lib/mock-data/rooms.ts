import { roomProfiles, type RoomProfile, type RoomQuickAction } from "@diarydock/home";

export type RoomTask = { id: string; label: string; due?: string; done: boolean };
export type RoomDocument = {
  id: string;
  title: string;
  kind: "PDF" | "Scan" | "Note" | "Image";
  size: string;
  updated: string;
};
export type RoomActivity = { id: string; text: string; when: string; by: string };
export type { RoomQuickAction };
export type RoomDetail = RoomProfile & {
  stats: { records: number; documents: number; updated: string };
  tasks: RoomTask[];
  documents: RoomDocument[];
  activity: RoomActivity[];
};

function emptyRoom(profile: RoomProfile): RoomDetail {
  return {
    ...profile,
    stats: { records: 0, documents: 0, updated: "Not started" },
    tasks: [],
    documents: [],
    activity: [],
  };
}

export const roomDetails: Record<string, RoomDetail> = Object.fromEntries(
  Object.entries(roomProfiles).map(([id, profile]) => [id, emptyRoom(profile)]),
);
