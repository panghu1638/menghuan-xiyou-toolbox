import assert from "node:assert/strict";
import test from "node:test";
import "./equipment-prices.js";

const prices = globalThis.XYQEquipmentPrices;

test("内置宝宝装备价格覆盖截图关键数据", () => {
  assert.equal(prices.defaultEquipmentRecords.length, 63);
  assert.deepEqual(
    prices.findEquipmentRecord(prices.defaultEquipmentRecords, "护腕", 58),
    { category: "护腕", damage: 58, stallPriceWan: null, treasurePriceRmb: 114 },
  );
  assert.deepEqual(
    prices.findEquipmentRecord(prices.defaultEquipmentRecords, "项圈", 65),
    { category: "项圈", damage: 65, stallPriceWan: 12, treasurePriceRmb: null },
  );
  assert.deepEqual(
    prices.findEquipmentRecord(prices.defaultEquipmentRecords, "衣服", 59),
    { category: "衣服", damage: 59, stallPriceWan: 1150, treasurePriceRmb: 83 },
  );
});

test("内置三眼九眼天珠价格默认留空", () => {
  assert.equal(prices.defaultEyePriceRecords.length, 144);
  assert.deepEqual(
    [...new Set(prices.defaultEyePriceRecords.map((record) => record.level))],
    [115, 125, 105],
  );
  assert.deepEqual(
    [...new Set(prices.defaultEyePriceRecords.map((record) => record.type))],
    ["三眼天珠", "九眼天珠"],
  );
  assert.ok(
    prices.defaultEyePriceRecords.every((record) => record.priceWan === null),
  );
  assert.deepEqual(prices.findEyePriceRecord(prices.defaultEyePriceRecords, 105, "三眼天珠", 93), {
    level: 105,
    type: "三眼天珠",
    power: 93,
    priceWan: null,
  });
  assert.deepEqual(prices.findEyePriceRecord(prices.defaultEyePriceRecords, 115, "九眼天珠", 98), {
    level: 115,
    type: "九眼天珠",
    power: 98,
    priceWan: null,
  });
  assert.deepEqual(prices.findEyePriceRecord(prices.defaultEyePriceRecords, 125, "九眼天珠", 99), {
    level: 125,
    type: "九眼天珠",
    power: 99,
    priceWan: null,
  });
  assert.deepEqual(prices.defaultEyeNotes, [
    { source: "105三九眼", label: "40–50", price: 18.8 },
    { source: "105三九眼", label: "60+", price: 30 },
    { source: "125九眼", label: "灵力50", price: 99 },
  ]);
});

test("宝宝装备按金价折算并扣除藏宝阁手续费", () => {
  assert.deepEqual(
    prices.calculateEquipmentArbitrage({
      stallPriceWan: 100,
      treasurePriceRmb: 20,
      goldPricePerMillion: 7.2,
      feeRate: 0.05,
      feeCap: 1000,
    }),
    {
      stallCostRmb: 7.2,
      fee: 1,
      netProceeds: 19,
      profit: 11.8,
    },
  );
  assert.equal(
    prices.calculateEquipmentArbitrage({
      stallPriceWan: null,
      treasurePriceRmb: 20,
      goldPricePerMillion: 7.2,
      feeRate: 0.05,
      feeCap: 1000,
    }),
    null,
  );
});
