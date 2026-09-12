"use client";

import { useState } from "react";
import Link from "next/link";
import { WEB_FEATURE_GROUPS } from "@/lib/web-features";

export function WebFeatureDirectory() {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const groups = WEB_FEATURE_GROUPS.map((group) => ({ ...group,
    links: group.links.filter((link) => `${group.title} ${link.label}`.toLowerCase().includes(term)),
  })).filter((group) => group.links.length);
  return (
    <div className="space-y-7">
      <label className="block max-w-xl">
        <span className="mb-2 block text-sm font-semibold text-[#20352a]">Find a feature</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Try recipes, insurance or family…"
          className="w-full rounded-2xl border border-[#20352a]/20 bg-white px-4 py-3 text-base text-[#20352a] outline-none focus:ring-2 focus:ring-[#486a50]" />
      </label>
      <p className="sr-only" role="status">{groups.reduce((count, group) => count + group.links.length, 0)} features found</p>
      {groups.length ? <div className="grid items-start gap-5 md:grid-cols-2">
        {groups.map((group) => <section key={group.title} className="rounded-3xl border border-[#20352a]/10 bg-[#fffdf8] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#20352a]">{group.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667068]">{group.description}</p>
          <ul className="mt-4 divide-y divide-[#20352a]/10">
            {group.links.map((link) => <li key={link.href}>
              <Link href={link.href} className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-1 py-3 text-base font-medium text-[#315443] hover:bg-[#edf1e7] focus-visible:outline-2 focus-visible:outline-offset-2">
                {link.label}<span aria-hidden="true">›</span>
              </Link>
            </li>)}
          </ul>
        </section>)}
      </div> : <p className="rounded-2xl bg-white p-6 text-[#667068]">No matching features. Try a different word.</p>}
    </div>
  );
}
