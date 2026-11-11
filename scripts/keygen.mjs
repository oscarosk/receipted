// Prints a new Ed25519 signing key as one line, ready to paste into Render as RECEIPTED_SIGNING_KEY.
// Run: node scripts/keygen.mjs
import { generateKeyPairSync } from "crypto";
const { privateKey } = generateKeyPairSync("ed25519");
console.log(privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim().replace(/\n/g, "\\n"));
