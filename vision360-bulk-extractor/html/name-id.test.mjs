import fs from "node:fs";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const code = fs.readFileSync(new URL("./name-id.js", import.meta.url), "utf8");
const sandbox = { globalThis: {}, TextDecoder, TextEncoder, Uint8Array, DataView };
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const { V360Names } = sandbox;

const html = `<table><tr><th>Name ID</th></tr><tr><td> 00123 </td></tr><tr><td></td></tr><tr><td>00123</td></tr><tr><td>10001</td></tr></table>`;
const parsedHtml = V360Names.parseHtml(html);
assert.equal(JSON.stringify(parsedHtml.ids), JSON.stringify(["00123", "10001"]));
assert.equal(parsedHtml.duplicates, 1);
assert.equal(parsedHtml.emptyRows, 1);
assert.throws(() => V360Names.parseHtml("<table><tr><td>Stone</td></tr></table>"), /NAME ID/);

const bytes = fs.readFileSync("/tmp/maketpl/name-id-template.xlsx");
const fromXlsx = await V360Names.parseXlsx(bytes, async (compressed) => zlib.inflateRawSync(Buffer.from(compressed)));
assert.equal(JSON.stringify(fromXlsx.ids), JSON.stringify(["10001", "10002", "10003"]));

const plan = V360Names.planCopies([
  "DiamondData/10001/sub/a.txt",
  "DiamondData/10001/10002/clip.mp4",
  "media/10005.mp4",
  "media/10005.extra.mp4",
  "media/readme.txt",
], ["10001", "10002", "10005", "404"]);

const dests = plan.copies.map((copy) => copy.dest).sort();
assert.ok(dests.includes("10001/sub/a.txt"));
assert.ok(dests.includes("10001/10002/clip.mp4"));
assert.ok(dests.includes("10002/clip.mp4"));
assert.ok(dests.includes("10005.mp4"));
assert.equal(dests.some((path) => path.endsWith("readme.txt") || path.endsWith("10005.extra.mp4")), false);
assert.equal(JSON.stringify(plan.missing), JSON.stringify(["404"]));

const zipBytes = await V360Names.buildZip([
  { path: "10001/a.txt", bytes: new TextEncoder().encode("diamond-a") },
], async (raw) => zlib.deflateRawSync(Buffer.from(raw)));
fs.writeFileSync("/tmp/v360-html-plan.zip", zipBytes);
execFileSync("python3", ["-c", "import zipfile; z=zipfile.ZipFile('/tmp/v360-html-plan.zip'); assert z.read('10001/a.txt')==b'diamond-a'"]);

console.log("name-id tests passed");
