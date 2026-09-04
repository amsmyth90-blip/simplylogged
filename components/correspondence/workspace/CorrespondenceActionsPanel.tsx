"use client";

import { useState } from "react";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";

import type { CorrespondenceDetailController } from "./useCorrespondenceDetail";

export function CorrespondenceActionsPanel({
  controller,
}: {
  controller: CorrespondenceDetailController;
}) {
  const { draft, update, addAction, createReminder } = controller;
  const [newAction, setNewAction] = useState("");
  if (!draft) return null;
  const remaining = draft.actions.filter((action) => !action.completed).length;
  const submitAction = () => {
    addAction(newAction);
    setNewAction("");
  };
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="check"
        title="Actions required"
        detail={
          draft.actions.length
            ? `${remaining} action${remaining === 1 ? "" : "s"} remaining`
            : "Add practical next steps from the letter"
        }
      />
      <div className="mt-4 space-y-2">
        {draft.actions.map((action) => (
          <label
            key={action.id}
            className="flex min-h-11 items-center gap-3 rounded-[14px] bg-[#f7f7f1] px-3 text-sm text-[#20352a]"
          >
            <input
              type="checkbox"
              checked={action.completed}
              onChange={(event) =>
                update(
                  "actions",
                  draft.actions.map((item) =>
                    item.id === action.id
                      ? { ...item, completed: event.target.checked }
                      : item,
                  ),
                )
              }
              className="h-4 w-4 accent-[#45604d]"
            />
            <span className={action.completed ? "line-through opacity-55" : ""}>
              {action.label}
            </span>
          </label>
        ))}
        <div className="flex gap-2">
          <input
            value={newAction}
            onChange={(event) => setNewAction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitAction();
            }}
            className={fieldClass}
            placeholder="Add another action"
          />
          <button
            type="button"
            onClick={submitAction}
            className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
          >
            Add
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void createReminder()}
        className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
      >
        Create deadline reminder
      </button>
    </BillsCard>
  );
}
