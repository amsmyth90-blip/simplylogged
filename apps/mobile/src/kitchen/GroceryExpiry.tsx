import { useMemo } from "react";
import { groceryRequest } from "../../../../lib/groceries/client";
import { GroceryExpiryPreview } from "../../../../components/groceries/GroceryExpiryPreview";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

export function GroceryExpiry({ accessToken, onOpen }: { accessToken: string; onOpen: () => void }) {
  const request = useMemo(() => groceryRequest(getSecureRuntime().apiOrigin, accessToken), [accessToken]);
  return <GroceryExpiryPreview request={request} openGroceries={<button onClick={onOpen}>My groceries →</button>} />;
}
