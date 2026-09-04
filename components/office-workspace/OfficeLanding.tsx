import Image from "next/image";
import Link from "next/link";

import { DesktopSpaceLanding } from "@/components/DesktopSpaceLanding";
import { RoomSceneHeader, roomImageLabelClass } from "@/components/RoomSceneChrome";
import type { OfficeController } from "@/components/office-workspace/useOfficeController";

export function OfficeLanding({ controller }: { controller: OfficeController }) {
  return (
    <>
      <DesktopSpaceLanding
        title="Documents"
        eyebrow="Office"
        description="Organise personal documents, household administration, bills, correspondence and future wishes."
        image="/images/office-interactive-v1.webp"
        imageAlt="A warm organised home office"
        imagePosition="center 45%"
        items={[
          { label: "Admin inbox", description: controller.officeInbox.length ? `${controller.officeInbox.length} incoming items` : "Incoming household paperwork", icon: "mail", onClick: () => controller.setPanel("inbox") },
          { label: "Today’s admin", description: controller.adminCount ? `${controller.adminCount} tasks and reminders` : "Tasks and reminders", icon: "check", onClick: () => controller.setPanel("admin") },
          { label: "Personal ID", description: "Passports, licences and certificates", icon: "file", onClick: () => controller.openDocumentDrawer("identity") },
          { label: "Wills & wishes", description: "Wills, wishes and trusted access", icon: "heart", href: "/wills" },
          { label: "Home & insurance", description: "Home policies, deeds and mortgage", icon: "home", onClick: () => controller.openDocumentDrawer("home") },
          { label: "Bills & contracts", description: "Household finances and regular commitments", icon: "chart", href: "/office/bills" },
        ]}
      />
      <main className="fixed inset-0 overflow-hidden bg-[#7c634c] lg:hidden">
        <Image src="/images/office-interactive-v1.webp" alt="" fill priority unoptimized aria-hidden="true" className="scale-110 object-cover opacity-45 blur-2xl" sizes="100vw" />
        <div className="absolute inset-0 bg-[#3c2e24]/15" />
        <section aria-label="Interactive Office" className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#c9ae8d] shadow-[0_0_70px_rgba(38,28,19,0.4)]">
          <Image src="/images/office-interactive-v1.webp" alt="A warm home office with a desk, incoming post tray, laptop, scanner, filing drawers and a secure safe" fill priority unoptimized className="object-cover object-center" sizes="(max-width: 544px) 100vw, 544px" />
          <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#33261c]/42 via-[#33261c]/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#2f251c]/46 via-[#2f251c]/10 to-transparent" />
          <OfficeHotspot label={controller.officeInbox.length ? `Admin inbox · ${controller.officeInbox.length}` : "Admin inbox"} position={{ left: "18%", top: "52%" }} onClick={() => controller.setPanel("inbox")} />
          <OfficeHotspot label={controller.adminCount ? `Today's admin · ${controller.adminCount}` : "Today's admin"} position={{ left: "50%", top: "53%" }} onClick={() => controller.setPanel("admin")} />
          <OfficeHotspot label={`Personal ID · ${controller.drawerFiles.identity.length}`} position={{ left: "80%", top: "42%" }} onClick={() => controller.openDocumentDrawer("identity")} />
          <OfficeHotspot label={`Wills & wishes · ${controller.drawerFiles.wishes.length}`} position={{ left: "79%", top: "32%" }} href="/wills" />
          <OfficeHotspot label={`Home & insurance · ${controller.drawerFiles.home.length}`} position={{ left: "78%", top: "56%" }} onClick={() => controller.openDocumentDrawer("home")} />
          <OfficeHotspot label={`Bills & contracts · ${controller.drawerFiles.finance.length}`} position={{ left: "25%", top: "61%" }} onClick={() => controller.openDocumentDrawer("finance")} />
        </section>
        <RoomSceneHeader roomName="Office" eyebrow="Household administration" />
      </main>
    </>
  );
}

function OfficeHotspot({
  label,
  position,
  onClick,
  href,
}: {
  label: string;
  position: { left: string; top: string };
  onClick?: () => void;
  href?: string;
}) {
  const visibleLabel = href === "/office/bills" ? "Household bills" : label;
  const className = `group absolute z-20 flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${roomImageLabelClass}`;
  return href
    ? <Link href={href} aria-label={visibleLabel} className={className} style={position}>{visibleLabel}</Link>
    : <button type="button" onClick={onClick} aria-label={label} className={className} style={position}>{visibleLabel}</button>;
}
