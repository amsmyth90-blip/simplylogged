import {
  HealthProfileEditor,
  useHealthProfileEditor,
} from "./HealthProfileEditor";
import { HealthProfileLists } from "./HealthProfileLists";
import { HealthProfileOverview } from "./HealthProfileOverview";

export function HealthProfileSection({
  emergencyOnly,
  onMessage,
}: {
  emergencyOnly: boolean;
  onMessage: (message: string) => void;
}) {
  const editor = useHealthProfileEditor(onMessage);
  return (
    <div className="space-y-4">
      <HealthProfileOverview
        emergencyOnly={emergencyOnly}
        onEdit={editor.begin}
      />
      {!emergencyOnly ? <HealthProfileLists /> : null}
      <HealthProfileEditor editor={editor} emergencyOnly={emergencyOnly} />
    </div>
  );
}
