import Link from "next/link";
import { Plus } from "lucide-react";

export function FloatingAddButton({
  href = "/add",
  label = "Add",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-900/30"
      aria-label={label}
    >
      <Plus className="h-7 w-7" />
    </Link>
  );
}
