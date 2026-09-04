import { inspectProductionReleaseEnvironment } from "../lib/config/production-environment.ts";

const explicitlyRequested = process.argv.includes("--production");
const isVercelProduction = process.env.VERCEL_ENV === "production";

if (!explicitlyRequested && !isVercelProduction) {
  console.info("Production environment preflight skipped outside a production release.");
} else {
  const issues = inspectProductionReleaseEnvironment(process.env);
  if (issues.length) {
    console.error("Production environment preflight failed:");
    for (const current of issues) console.error(`- ${current.key}: ${current.reason}`);
    process.exitCode = 1;
  } else {
    console.info("Production environment preflight passed without reading out secret values.");
  }
}
