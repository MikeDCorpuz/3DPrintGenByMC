/**
 * Loads .env.signing.local (if present) and builds a signed Windows portable exe
 * via Azure Trusted Signing or CSC_LINK (.pfx).
 *
 * Usage: node scripts/sign-windows.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.signing.local"));

const hasAzure =
  process.env.AZURE_TENANT_ID &&
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_CLIENT_SECRET &&
  process.env.AZURE_TRUSTED_SIGNING_ACCOUNT &&
  process.env.AZURE_TRUSTED_SIGNING_PROFILE &&
  process.env.AZURE_TRUSTED_SIGNING_ENDPOINT &&
  process.env.AZURE_TRUSTED_SIGNING_PUBLISHER;

const hasPfx = process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD;

if (!hasAzure && !hasPfx) {
  console.error(`
No signing credentials found.

1) Copy .env.signing.example → .env.signing.local
2) Either fill Azure Trusted Signing fields, or set CSC_LINK + CSC_KEY_PASSWORD for a .pfx
3) Re-run: npm run desktop:win:signed

Azure portal setup (recommended):
  - Register resource provider Microsoft.CodeSigning
  - Create an Artifact / Trusted Signing account + identity validation
  - Create a certificate profile
  - Create an App Registration, grant it "Trusted Signing Certificate Profile Signer"
  - Put tenant/client/secret + account/profile/endpoint/publisher into .env.signing.local
`);
  process.exit(1);
}

process.env.CSC_IDENTITY_AUTO_DISCOVERY = hasPfx ? "true" : "false";

const builderArgs = [
  "electron-builder",
  "--win",
  "portable",
  "--config.npmRebuild=false",
];

if (hasAzure) {
  // electron-builder 26: azureSignOptions
  builderArgs.push(
    `--config.win.azureSignOptions.publisherName=${process.env.AZURE_TRUSTED_SIGNING_PUBLISHER}`,
    `--config.win.azureSignOptions.endpoint=${process.env.AZURE_TRUSTED_SIGNING_ENDPOINT}`,
    `--config.win.azureSignOptions.codeSigningAccountName=${process.env.AZURE_TRUSTED_SIGNING_ACCOUNT}`,
    `--config.win.azureSignOptions.certificateProfileName=${process.env.AZURE_TRUSTED_SIGNING_PROFILE}`,
  );
  // Re-enable executable signing (unsigned builds set this false)
  builderArgs.push("--config.win.signAndEditExecutable=true");
} else {
  builderArgs.push("--config.win.signAndEditExecutable=true");
}

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

await run("npm", ["run", "build:desktop"]);
await run("npx", builderArgs);
console.log("\nSigned build ready under release\\KeychainMaker-1.0.0-Windows.exe");
