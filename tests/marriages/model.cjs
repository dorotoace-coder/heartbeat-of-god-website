const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("src/lib/marriages/model.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const output = {};
vm.runInNewContext(code, { exports: output });
const { newCase, registryBlockers, canAccess, initialCases } = output;
let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log(`PASS ${name}`);
}
test("Blank wedding cannot be verified", () =>
  assert.ok(
    registryBlockers(newCase("1", "Demo", "Premarital"), "Verified").length >=
      3,
  ));
test("Ceremony planning does not need legal authority", () =>
  assert.equal(
    registryBlockers(newCase("1", "Demo", "Premarital"), "Planning").length,
    0,
  ));
const c = newCase("1", "Demo", "Premarital");
Object.assign(c.wedding, {
  authority: true,
  eligibility: true,
  evidence: "SAMPLE-REVIEW",
  actualDate: "2026-12-15",
  venue: "Fictional venue",
  officiant: "Fictional officiant",
  witnesses: "Fictional witnesses A and B",
  country: "Nigeria",
  region: "Example district",
});
test("Reviewed ceremony can be recorded", () =>
  assert.equal(registryBlockers(c, "Ceremony recorded").length, 0));
test("Return cannot be recorded without receipt", () =>
  assert.ok(registryBlockers(c, "Return submitted").length));
c.wedding.receipt = "SAMPLE-RECEIPT";
test("Receipt alone is not verification", () =>
  assert.ok(registryBlockers(c, "Verified").length));
c.wedding.acknowledgement = "SAMPLE-ACK";
test("All sample evidence allows simulated verification", () =>
  assert.equal(registryBlockers(c, "Verified").length, 0));
c.wedding.authority = false;
test("Removing authority invalidates verification", () =>
  assert.ok(registryBlockers(c, "Verified").length));
for (const role of ["Records officer", "Coordinator"])
  for (const section of [
    "Background",
    "Wellbeing",
    "RTT & preparation",
    "Family visits",
  ])
    test(`${role} excludes ${section} in simulation`, () =>
      assert.equal(canAccess(role, section), false));
test("Coordinator cannot see registry documents", () =>
  assert.equal(canAccess("Coordinator", "Wedding records"), false));
test("Records officer can see wedding records", () =>
  assert.equal(canAccess("Records officer", "Wedding records"), true));
test("Each fixture starts with independent arrays", () => {
  const a = initialCases();
  a[0].preparation.push("unique");
  assert.equal(a[1].preparation.includes("unique"), false);
});
test("New enquiry does not imply follow-up permission", () =>
  assert.equal(
    newCase("x", "Example", "Personal support").aftercare.permission,
    false,
  ));
console.log(
  `${count} checks passed. These are prototype rules, not server authorization tests.`,
);
