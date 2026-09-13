import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { WebGroceries } from "@/components/groceries/WebGroceries";
export const metadata={title:"Groceries"};
export default async function GroceriesPage(){
 await requireUser();
 return <><main className="px-4 pt-5 pb-28 sm:px-6 lg:pb-6"><div className="mx-auto mb-4 max-w-[1200px]"><Link href="/kitchen/pantry">← Pantry & shopping</Link></div><WebGroceries/></main><BottomNav/></>;
}
