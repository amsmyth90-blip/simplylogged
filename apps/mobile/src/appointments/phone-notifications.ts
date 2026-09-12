import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { appointmentRequest, type AppointmentConnection } from "../../../../lib/appointments/client.ts";
import { appointmentSchedule, type AppointmentDraft } from "../../../../lib/appointments/model.ts";

const deviceKey = "diarydock-appointment-device";
const enabledKey = "diarydock-appointment-alerts";
let registering: Promise<boolean> | null = null;

function deviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
  return id;
}

export function enableAppointmentPush(connection: AppointmentConnection, prompt = true): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || (!prompt && localStorage.getItem(enabledKey) !== "yes")) return Promise.resolve(false);
  registering ??= register(connection, prompt).finally(() => { registering = null; });
  return registering;
}

async function register(connection: AppointmentConnection, prompt: boolean) {
  const platform = Capacitor.getPlatform();
  const configured = await appointmentRequest(connection, "/api/appointments/devices", undefined, "GET");
  if (configured[platform] !== true) return false;
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted" && prompt) permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return false;
  if (platform === "android") await PushNotifications.createChannel({ id: "appointments", name: "Appointments", importance: 4 });
  const listeners: PluginListenerHandle[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Phone registration timed out.")), 15_000);
      void (async () => {
        listeners.push(await PushNotifications.addListener("registration", (value) => resolve(value.value)));
        listeners.push(await PushNotifications.addListener("registrationError", () => reject(new Error("Phone registration failed."))));
        await PushNotifications.register();
      })().catch(reject);
    });
    const result = await appointmentRequest(connection, "/api/appointments/devices", { id: deviceId(), platform, token });
    if (typeof result.id === "string") localStorage.setItem(deviceKey, result.id);
    localStorage.setItem(enabledKey, "yes");
    return result.registered === true;
  } finally {
    clearTimeout(timer);
    await Promise.all(listeners.map((listener) => listener.remove()));
  }
}

const notificationIds = new Map<string, number>();
function notificationId(key: string, used: Set<number>) {
  const existing = notificationIds.get(key);
  if (existing) return existing;
  let value: number;
  do { value = crypto.getRandomValues(new Uint32Array(1))[0]! % 2147483646 + 1; } while (used.has(value));
  used.add(value); notificationIds.set(key, value); return value;
}

export async function schedulePhoneAppointment(id: string, draft: AppointmentDraft, offset: number | null) {
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") throw new Error("Phone notifications are not allowed.");
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 60) throw new Error("This phone has too many scheduled reminders.");
  const used = new Set(pending.notifications.map((notification) => notification.id));
  const schedule = appointmentSchedule(draft, offset);
  const notifications = [{ id: notificationId(`${id}:added`, used), title: "DiaryDock",
    body: "Your appointment has been added. Open DiaryDock to view it.",
    schedule: { at: new Date(Date.now() + 1000) }, extra: { diarydockAppointment: true, route: "appointments" } }];
  if (schedule.remindAt && Date.parse(schedule.remindAt) > Date.now()) notifications.push({
    id: notificationId(`${id}:reminder`, used), title: "DiaryDock",
    body: "You have an upcoming appointment. Open DiaryDock for the details.",
    schedule: { at: new Date(schedule.remindAt) }, extra: { diarydockAppointment: true, route: "appointments" },
  });
  await LocalNotifications.schedule({ notifications });
}

export async function disableAppointmentPush(connection: AppointmentConnection) {
  if (!Capacitor.isNativePlatform()) return;
  const id = localStorage.getItem(deviceKey);
  if (id && localStorage.getItem(enabledKey) === "yes") {
    await appointmentRequest(connection, "/api/appointments/devices", { id }, "DELETE");
  }
  await PushNotifications.unregister().catch(() => undefined);
  const pending = await LocalNotifications.getPending();
  await LocalNotifications.cancel({ notifications: pending.notifications.filter((n) => n.extra?.diarydockAppointment).map((n) => ({ id: n.id })) });
  localStorage.removeItem(enabledKey);
}
