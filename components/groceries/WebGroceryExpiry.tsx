"use client";
import { useMemo } from "react";
import Link from "next/link";
import { groceryRequest } from "../../lib/groceries/client";
import { GroceryExpiryPreview } from "./GroceryExpiryPreview";

export function WebGroceryExpiry() {
  const request = useMemo(() => groceryRequest(typeof window === "undefined" ? "https://diarydock.com" : window.location.origin), []);
  return <GroceryExpiryPreview request={request} openGroceries={<Link href="/kitchen/groceries">My groceries →</Link>} />;
}
