import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [portText, pageUrl, widthText, heightText, outputPath, ...buttonTexts] = process.argv.slice(2);
const port = Number.parseInt(portText ?? "", 10);
const width = Number.parseInt(widthText ?? "", 10);
const height = Number.parseInt(heightText ?? "", 10);

if (!Number.isSafeInteger(port) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || !pageUrl || !outputPath) {
  throw new Error("Usage: node capture-mobile-viewport.mjs <port> <url> <width> <height> <output> [buttons...]");
}
if (width < 240 || width > 2048 || height < 320 || height > 4096) {
  throw new Error("Viewport dimensions are outside the supported QA range");
}

const targetsResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
if (!targetsResponse.ok) throw new Error(`Chrome debugging endpoint returned ${targetsResponse.status}`);
const targets = await targetsResponse.json();
const target = targets.find((candidate) => candidate.type === "page" && candidate.webSocketDebuggerUrl);
if (!target) throw new Error("Chrome did not expose a page target");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", () => rejectOpen(new Error("Chrome debugging socket failed")), { once: true });
});

let nextId = 1;
const pending = new Map();
const listeners = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }
  if (message.method !== "Page.loadEventFired") return;
  const listener = listeners.get("Page.loadEventFired");
  if (listener) {
    listeners.delete("Page.loadEventFired");
    listener(message.params);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function waitFor(method, timeoutMs = 15_000) {
  if (method !== "Page.loadEventFired") throw new Error(`Unsupported browser event: ${method}`);
  return new Promise((resolveEvent, rejectEvent) => {
    const timeout = setTimeout(() => {
      listeners.delete(method);
      rejectEvent(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    listeners.set(method, (params) => {
      clearTimeout(timeout);
      resolveEvent(params);
    });
  });
}

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  });
  const loaded = waitFor("Page.loadEventFired");
  await send("Page.navigate", { url: pageUrl });
  await loaded;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));

  for (const buttonText of buttonTexts) {
    const scrollText = buttonText.startsWith("@scroll:") ? buttonText.slice(8) : null;
    if (scrollText) {
      const scrolled = await send("Runtime.evaluate", {
        expression: `(() => {
          const label = ${JSON.stringify(scrollText)};
          const element = [...document.querySelectorAll("h1,h2,h3,p,strong")]
            .find((candidate) => candidate.textContent?.includes(label));
          if (!element) return false;
          element.scrollIntoView({ block: "center" });
          return true;
        })()`,
        returnByValue: true,
      });
      if (!scrolled.result.value) throw new Error(`Scroll target not found: ${scrollText}`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
      continue;
    }
    const clicked = await send("Runtime.evaluate", {
      expression: `(() => {
        const label = ${JSON.stringify(buttonText)};
        const button = [...document.querySelectorAll("button")]
          .find((candidate) => candidate.textContent?.includes(label));
        if (!button) return false;
        button.click();
        return true;
      })()`,
      returnByValue: true,
    });
    if (!clicked.result.value) throw new Error(`Button not found: ${buttonText}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }

  const dimensions = await send("Runtime.evaluate", {
    expression: "JSON.stringify({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth })",
    returnByValue: true,
  });
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(resolve(outputPath), Buffer.from(screenshot.data, "base64"));
  process.stdout.write(`${dimensions.result.value}\n`);
} finally {
  socket.close();
}
