import test from "node:test";
import assert from "node:assert/strict";
import { bindFlightLookup, fillFlightForm } from "../src/forms.js";

function makeButton() {
  return {
    disabled: false,
    textContent: "Lookup",
    addEventListener(event, handler) {
      if (event === "click") this._click = handler;
    }
  };
}

function makeDom() {
  const nodes = {
    "flight-lookup-btn": makeButton(),
    "flight-number": { value: "" },
    "flight-airline": { value: "" },
    "flight-pnr": { value: "" },
    "flight-lookup-date": { value: "" },
    "flight-dep-name": { value: "" },
    "flight-dep-code": { value: "" },
    "flight-arr-name": { value: "" },
    "flight-arr-code": { value: "" },
    "flight-dep-time": { value: "" },
    "flight-arr-time": { value: "" },
    "flight-passengers": { value: "" },
    "flight-lookup-status": { textContent: "" }
  };
  return {
    nodes,
    document: { getElementById(id) { return nodes[id] || null; } }
  };
}

test("flight lookup preserves manual PNR and passengers when provider omits them", async () => {
  const previousDocument = globalThis.document;
  const { nodes, document } = makeDom();
  globalThis.document = document;
  try {
    fillFlightForm({
      flight_number: "LX100",
      pnr: "ABC123",
      departure_scheduled: "2026-03-08T08:00:00Z",
      arrival_scheduled: "2026-03-08T10:00:00Z",
      passenger_names: ["Alice", "Bob"]
    });
    nodes["flight-lookup-date"].value = "2026-03-08";
    bindFlightLookup(async () => ({
      flight_number: "LX100",
      airline: "Luxair",
      departure_airport_name: "Luxembourg",
      departure_airport_code: "LUX",
      arrival_airport_name: "London City",
      arrival_airport_code: "LCY",
      departure_scheduled: "2026-03-08T08:15:00Z",
      arrival_scheduled: "2026-03-08T10:05:00Z",
      pnr: null,
      passenger_names: []
    }));
    await nodes["flight-lookup-btn"]._click();
    assert.equal(nodes["flight-pnr"].value, "ABC123");
    assert.equal(nodes["flight-passengers"].value, "Alice, Bob");
    assert.equal(nodes["flight-airline"].value, "Luxair");
    assert.equal(nodes["flight-lookup-status"].textContent, "✓ Details auto-filled");
  } finally {
    globalThis.document = previousDocument;
  }
});
