import atticImage from "../../../../public/images/pages/attic-memory-room-v1.webp";
import bedroomImage from "../../../../public/images/pages/bedroom-health-room-clean.webp";
import drivewayImage from "../../../../public/images/designs/driveway/08-car-boot-departure.webp";
import familyImage from "../../../../public/images/family-fireside-clean.webp";
import garageImage from "../../../../public/images/pages/garage-folio-hero-v5.webp";
import gardenImage from "../../../../public/images/pages/garden-command-centre-v2.webp";
import kitchenImage from "../../../../public/images/kitchen-coastal-cottage.webp";
import mailboxImage from "../../../../public/images/pages/mailbox-hero.webp";
import officeImage from "../../../../public/images/office-interactive-v1.webp";
import safeRoomImage from "../../../../public/images/pages/safe-room-hero.webp";

export type RoomSceneAction = {
  id: string;
  label: string;
  description: string;
  left: string;
  top: string;
};

export type RoomScene = {
  image: string;
  imageAlt: string;
  name: string;
  tone: string;
  actions: readonly RoomSceneAction[];
};

const action = (
  id: string,
  label: string,
  description: string,
  left: string,
  top: string,
): RoomSceneAction => ({ id, label, description, left, top });

export const roomScenes: Record<string, RoomScene> = {
  attic: {
    image: atticImage, imageAlt: "A warm attic filled with albums, keepsakes and family memories",
    name: "Attic", tone: "#3d372c",
    actions: [
      action("photo-albums", "Photos", "Scanned photographs and albums", "22.5%", "77%"),
      action("keepsakes", "Keepsakes", "Meaningful objects and their stories", "42.5%", "46%"),
      action("family-history", "Family history", "Family stories and timelines", "79%", "30%"),
      action("letters-journals", "Letters", "Letters and handwritten memories", "20%", "63%"),
      action("memory-box", "Memory box", "Voice notes and small memories", "80%", "72.5%"),
    ],
  },
  bedroom: {
    image: bedroomImage, imageAlt: "A calm private bedroom for health and wellbeing records",
    name: "Health", tone: "#3d4030",
    actions: [
      action("health-profile", "Health profile", "Your personal health profile", "30%", "33.5%"),
      action("medical-records", "Health files", "Records, letters and results", "44%", "56%"),
      action("medications", "Medication", "Medicines and prescriptions", "72.5%", "41.5%"),
      action("appointments", "Appointments", "Upcoming and previous visits", "28%", "70%"),
      action("emergency", "Emergency", "Essential information when needed", "70%", "74%"),
    ],
  },
  office: {
    image: officeImage, imageAlt: "A warm home office with a desk, post tray and secure filing",
    name: "Office", tone: "#7c634c",
    actions: [
      action("correspondence", "Inbox", "Incoming household paperwork", "18%", "52%"),
      action("bills", "Bills", "Tasks, bills and reminders", "50%", "53%"),
      action("contacts", "Contacts", "Passports, licences and certificates", "80%", "42%"),
      action("safe-room", "Wills", "Wills, wishes and trusted access", "79%", "32%"),
      action("insurance", "Insurance", "Policies, deeds and mortgage records", "78%", "56%"),
      action("contracts", "Contracts", "Finances and regular commitments", "25%", "61%"),
    ],
  },
  "family-room": {
    image: familyImage, imageAlt: "A warm fireside family room with household shelves",
    name: "Family Room", tone: "#6d5942",
    actions: [
      action("people", "People", "Household members and app access", "47%", "26%"),
      action("schedules", "Schedules", "Plans, routines and responsibilities", "82%", "21%"),
      action("inbox", "Files", "Shared household files and reminders", "65%", "38%"),
    ],
  },
  kitchen: {
    image: kitchenImage, imageAlt: "A coastal cottage kitchen with planning areas and storage",
    name: "Kitchen", tone: "#625742",
    actions: [
      action("calendar", "Calendar", "Family dates and plans", "47%", "26%"),
      action("meal-planner", "Meal planner", "Plan the week’s meals", "79%", "52%"),
      action("pantry", "Pantry", "Food, staples and shopping", "18%", "28%"),
      action("noticeboard", "Notes", "Notes for the household", "46.5%", "44.5%"),
      action("recipes", "Recipes", "Find, save and cook favourites", "65%", "58%"),
      action("documents", "Documents", "Appliance and kitchen records", "80%", "73.5%"),
    ],
  },
  garage: {
    image: garageImage, imageAlt: "A warm organised garage with a car and workbench",
    name: "Garage", tone: "#4b4033",
    actions: [
      action("profile", "Vehicle", "Identity and ownership", "70.5%", "58%"),
      action("mot-tax", "MOT & tax", "Tests and renewals", "70.5%", "63.5%"),
      action("insurance", "Insurance", "Motor and breakdown cover", "70.5%", "69%"),
      action("services", "Service history", "Maintenance and repairs", "70.5%", "74.5%"),
      action("costs", "Receipts", "Vehicle costs and proof", "70.5%", "80%"),
    ],
  },
  garden: {
    image: gardenImage, imageAlt: "A garden workspace with pets, tools and planning areas",
    name: "Pets & Garden", tone: "#2f3626",
    actions: [
      action("pets", "Pets", "Profiles, care and important dates", "18%", "38%"),
      action("outdoor-spaces", "Garden", "Your garden and outdoor areas", "73%", "42%"),
      action("jobs", "Jobs", "Seasonal tasks and maintenance", "50%", "69%"),
      action("tools-shed", "Tools", "Equipment and outbuildings", "24%", "51%"),
      action("bins", "Bins", "Collection days and reminders", "78%", "56%"),
    ],
  },
  driveway: {
    image: drivewayImage, imageAlt: "A country driveway with a packed car and travel cases",
    name: "Travel", tone: "#594b3b",
    actions: [
      action("trips", "Trips", "Journeys, bookings and travel plans", "30.5%", "64.5%"),
      action("travel-checklist", "Packing list", "Packing lists and departure checks", "74.5%", "69.5%"),
      action("parking-permits", "Parking", "Visitor parking and access permits", "70%", "52.5%"),
    ],
  },
  mailbox: {
    image: mailboxImage, imageAlt: "A calm place for incoming letters and household paperwork",
    name: "Inbox", tone: "#5b5148",
    actions: [
      action("all", "All items", "Letters and paperwork to review", "50%", "52%"),
      action("new", "To file", "Send paperwork to the right room", "50%", "62%"),
      action("scan", "Scan post", "Add a new incoming document", "50%", "72%"),
    ],
  },
  "safe-room": {
    image: safeRoomImage, imageAlt: "A private secure room for wills, wishes and planning",
    name: "Wills & Wishes", tone: "#343a34",
    actions: [
      action("will", "Will", "Will records and versions", "50%", "46%"),
      action("wishes", "Wishes", "Personal wishes and preferences", "50%", "55%"),
      action("letters", "Letters", "Private letters of wishes", "50%", "64%"),
      action("planning", "Planning", "Preparation and review steps", "50%", "73%"),
    ],
  },
};
