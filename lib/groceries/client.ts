import type { GroceryCommand, GroceryDraft, GroceryItem } from "./model";
import { readBoundedJsonResponse } from "../http/bounded-json-response";
export type GroceryRequest = (method: "GET" | "POST", body?: GroceryCommand | FormData) => Promise<{items?: GroceryItem[] | GroceryDraft[]}>;
export class GroceryRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export function groceryRequest(origin: string | URL, token?: string): GroceryRequest {
  return async (method,body)=>{
    const scan=body instanceof FormData;
    const response=await fetch(new URL(scan ? "/api/groceries/scan" : "/api/groceries",origin),{
      method,credentials:token ? "omit":"same-origin",cache:"no-store",redirect:"error",
      signal:AbortSignal.timeout(90_000),
      headers:{...(token ? {Authorization:"Bearer "+token}:{}),
        ...(scan ? {"X-Grocery-Consent":"labels-v1"}:{"Content-Type":"application/json"})},
      body:body === undefined ? undefined : scan ? body : JSON.stringify(body)
    });
    const result=await readBoundedJsonResponse(response,128_000) as {items?: GroceryItem[];error?:string};
    if(!response.ok) throw new GroceryRequestError(result.error || "Groceries could not be updated.", response.status);
    return result;
  };
}
