export const WEB_FEATURE_GROUPS = [
  { title: "Files & everyday tasks", description: "Capture, find and act on your information.", links: [
    { label: "All files", href: "/files" }, { label: "Scan or upload", href: "/capture" },
    { label: "Inbox", href: "/intake" }, { label: "Review captured details", href: "/review-inbox" },
    { label: "Reminders", href: "/reminders" }, { label: "Search", href: "/search" },
    { label: "Ask DiaryDock", href: "/ask" }, { label: "Guardian", href: "/guardian" },
    { label: "Review actions", href: "/review-actions" },
  ] },
  { title: "Kitchen & household", description: "Meals, shopping, notes and the family calendar.", links: [
    { label: "Kitchen", href: "/room/kitchen" }, { label: "Calendar", href: "/kitchen/calendar" },
    { label: "Meal planner", href: "/kitchen/meal-planner" }, { label: "Pantry & shopping", href: "/kitchen/pantry" },
    { label: "Recipes", href: "/kitchen/recipes" }, { label: "Noticeboard", href: "/kitchen/notes" },
    { label: "Kitchen documents", href: "/kitchen/documents" },
  ] },
  { title: "Family & health", description: "People, shared plans and health records.", links: [
    { label: "Family Room", href: "/family" }, { label: "Household access", href: "/family/household" },
    { label: "Family profiles", href: "/family/household/profiles" }, { label: "Family schedules", href: "/family/schedules" },
    { label: "Children’s schedules", href: "/family/kids-schedules" }, { label: "Health & medical records", href: "/bedroom" },
  ] },
  { title: "Office & important records", description: "Bills, policies, contracts and professional contacts.", links: [
    { label: "Office", href: "/room/office" }, { label: "Bills", href: "/office/bills" },
    { label: "Insurance", href: "/office/insurance" }, { label: "Contracts", href: "/office/contracts" },
    { label: "Correspondence", href: "/office/correspondence" }, { label: "Professional contacts", href: "/office/contacts" },
    { label: "Vault documents", href: "/vault" }, { label: "Password Vault", href: "/passwords" },
  ] },
  { title: "Home, vehicles & travel", description: "Look after your property and prepare for time away.", links: [
    { label: "Garage & vehicles", href: "/room/garage" }, { label: "Garden", href: "/garden" },
    { label: "Driveway", href: "/room/driveway" }, { label: "Trips", href: "/driveway/trips" },
    { label: "Travel checklist", href: "/driveway/travel-checklist" }, { label: "Parking permits", href: "/driveway/parking-permits" },
    { label: "Home Handover", href: "/home-handover" }, { label: "Physical Links", href: "/physical-links" },
  ] },
  { title: "Memories & emergency planning", description: "Keep what matters ready for the people you trust.", links: [
    { label: "Attic & memories", href: "/room/attic" }, { label: "Wills & wishes", href: "/wills" },
    { label: "Letters of wishes", href: "/wills/letters-of-wishes" }, { label: "Emergency information", href: "/emergency" },
    { label: "Trusted emergency access", href: "/emergency/access" },
  ] },
  { title: "Your account", description: "The same account you use in the DiaryDock app.", links: [
    { label: "Settings", href: "/settings" }, { label: "Plans & storage", href: "/subscription" },
    { label: "Life Check", href: "/life-check" }, { label: "Home setup", href: "/onboarding" },
    { label: "Analytics privacy", href: "/analytics-privacy" }, { label: "Support", href: "/support" },
  ] },
] as const;
