import { convertQuantity, displayQuantity, displayUnitCost, inventoryQuantityError, inventoryUnit, shiftDecimal, storedQuantity } from "./inventoryUnits";

it("uses kilograms and litres without changing the value of existing inventory", () => {
  expect(inventoryUnit("g")).toBe("kg"); expect(inventoryUnit("kg")).toBe("kg");
  expect(inventoryUnit("ml")).toBe("l"); expect(inventoryUnit("l")).toBe("l"); expect(inventoryUnit("piece")).toBe("piece");
  expect(displayQuantity("1500.000", "g")).toBe("1.5");
  expect(displayQuantity("2500.125", "ml")).toBe("2.500125");
  expect(displayQuantity("0.001", "g")).toBe("0.000001");
  expect(displayQuantity("-1.125", "g")).toBe("-0.001125");
  expect(displayQuantity("2.000", "piece")).toBe("2");
  expect(displayUnitCost("1000.000001", "g")).toBe("1000000.001");
  expect(displayUnitCost("100.000001", "ml")).toBe("100000.001");
  expect(displayUnitCost("5000.123456", "piece")).toBe("5000.123456");
});

it("round trips tiny and maximum legacy quantities exactly, including Persian input", () => {
  for (const value of ["0.001", "18.125", "999999999999999.999"]) {
    expect(storedQuantity(displayQuantity(value, "g"), "kg")).toEqual({quantity: value, unit: "g"});
    expect(storedQuantity(displayQuantity(value, "ml"), "l")).toEqual({quantity: value, unit: "ml"});
  }
  expect(storedQuantity("۱٫۲۵۰", "kg")).toEqual({quantity:"1250",unit:"g"});
  expect(storedQuantity("۰٫۰۰۰۰۰۱", "l")).toEqual({quantity:"0.001",unit:"ml"});
  expect(storedQuantity("2", "piece")).toEqual({quantity:"2",unit:"piece"});
  expect(shiftDecimal("-0.000", -3)).toBe("0");
  expect(() => shiftDecimal("bad", 3)).toThrow();
});

it("validates precision and server bounds before sending converted values", () => {
  expect(inventoryQuantityError("0.000001", "kg")).toBe("");
  expect(inventoryQuantityError("0.0000001", "l")).not.toBe("");
  expect(inventoryQuantityError("1000000000000", "kg")).not.toBe("");
  expect(inventoryQuantityError("0", "kg")).not.toBe("");
  expect(inventoryQuantityError("0", "kg", true)).toBe("");
  expect(inventoryQuantityError("1.5", "piece")).not.toBe("");
  expect(inventoryQuantityError("1.001", "g")).toBe("");
});

it("converts recipe drafts when switching units without changing the actual dose", () => {
  expect(convertQuantity("۱۸", "g", "kg")).toBe("0.018");
  expect(convertQuantity("0.018", "kg", "g")).toBe("18");
  expect(convertQuantity("250", "ml", "l")).toBe("0.25");
  expect(convertQuantity("2", "piece", "piece")).toBe("2");
  expect(convertQuantity("", "g", "kg")).toBe("");
  expect(convertQuantity("bad", "g", "kg")).toBe("bad");
});
