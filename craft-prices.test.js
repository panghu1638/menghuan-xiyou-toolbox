import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./craft-prices.js";

const prices = globalThis.XYQCraftPrices;

test("打造材料按四类和指定等级生成", () => {
  assert.deepEqual(
    [...new Set(prices.defaultCraftPriceRecords.map((record) => record.category))],
    ["打造指南书", "铁", "灵饰指南书", "元灵晶石"],
  );
  assert.deepEqual(
    [...new Set(prices.defaultCraftPriceRecords.map((record) => record.level))].sort(
      (first, second) => first - second,
    ),
    [60, 80, 100, 110, 120, 130, 140, 150, 160],
  );
  assert.deepEqual(
    prices.findCraftPriceRecord(prices.defaultCraftPriceRecords, "打造指南书", 100),
    { category: "打造指南书", level: 100, priceWan: null },
  );
  assert.deepEqual(
    prices.findCraftPriceRecord(prices.defaultCraftPriceRecords, "元灵晶石", 140),
    { category: "元灵晶石", level: 140, priceWan: null },
  );
  assert.deepEqual(
    prices.findCraftPriceRecord(prices.defaultCraftPriceRecords, "灵饰指南书", 60),
    { category: "灵饰指南书", level: 60, priceWan: null },
  );
  assert.deepEqual(
    prices.findCraftPriceRecord(prices.defaultCraftPriceRecords, "灵饰指南书", 80),
    { category: "灵饰指南书", level: 80, priceWan: null },
  );
  assert.equal(
    prices.findCraftPriceRecord(prices.defaultCraftPriceRecords, "元灵晶石", 160),
    null,
  );
});

test("强化石数量按装备等级固定消耗", () => {
  assert.equal(prices.enhanceStoneCount(100), 20);
  assert.equal(prices.enhanceStoneCount(110), 24);
  assert.equal(prices.enhanceStoneCount(120), 30);
  assert.equal(prices.enhanceStoneCount(160), 30);
  assert.equal(prices.enhanceStoneCount(60), null);
  assert.equal(prices.enhanceStoneCount(115), null);
});

test("灵饰强化石数量按灵饰等级固定消耗", () => {
  assert.equal(prices.lingShiEnhanceStoneCount(60), 5);
  assert.equal(prices.lingShiEnhanceStoneCount(80), 9);
  assert.equal(prices.lingShiEnhanceStoneCount(100), 13);
  assert.equal(prices.lingShiEnhanceStoneCount(120), 17);
  assert.equal(prices.lingShiEnhanceStoneCount(140), 21);
  assert.equal(prices.lingShiEnhanceStoneCount(160), null);
});

test("装备总成本包含指南书、铁和强化石", () => {
  assert.equal(prices.calculateEquipmentCraftCost(100, 100, 30, 1.5), 160);
  assert.equal(prices.calculateEquipmentCraftCost(160, 500, 200, 2), 760);
  assert.equal(prices.calculateEquipmentCraftCost(100, 100, 30, 0), 130);
  assert.equal(prices.calculateEquipmentCraftCost(100, 100, 30, null), null);
  assert.equal(prices.calculateEquipmentCraftCost(100, null, 30, 1.5), null);
  assert.equal(prices.calculateEquipmentCraftCost(60, 100, 30, 1.5), null);
});

test("灵饰总成本包含指南书、元灵晶石和强化石", () => {
  assert.equal(prices.calculateLingShiCraftCost(60, 20, 15, 1), 40);
  assert.equal(prices.calculateLingShiCraftCost(100, 20, 15, 1), 48);
  assert.equal(prices.calculateLingShiCraftCost(140, 20, 15, 0), 35);
  assert.equal(prices.calculateLingShiCraftCost(60, 20, null, 1), null);
  assert.equal(prices.calculateLingShiCraftCost(60, 20, 15, null), null);
  assert.equal(prices.calculateLingShiCraftCost(160, 20, 15, 1), null);
});

test("打造材料等级表并入区内行情", async () => {
  const page = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /id="craft-price-table"/);
  assert.match(page, /id="craft-enhance-stone-price"/);
  assert.match(page, /<th[^>]*>打造指南书<\/th>/);
  assert.match(page, /<th[^>]*>铁<\/th>/);
  assert.match(page, /<th[^>]*>装备强化石<\/th>/);
  assert.match(page, /<th[^>]*>装备总成本<\/th>/);
  assert.match(page, /<th[^>]*>灵饰指南书<\/th>/);
  assert.match(page, /<th[^>]*>元灵晶石<\/th>/);
  assert.match(page, /<th[^>]*>灵饰强化石<\/th>/);
  assert.match(page, /<th[^>]*>灵饰总成本<\/th>/);
  assert.match(page, /craft-prices\.js/);
  assert.doesNotMatch(page, /href="\.\/craft\.html"/);
  assert.match(app, /craftPriceRecords/);
  assert.match(app, /craftEnhanceStonePriceWan/);
  assert.match(app, /calculateEquipmentCraftCost/);
  assert.match(app, /calculateLingShiCraftCost/);
  assert.match(app, /lingShiEnhanceStoneCount/);
  assert.match(app, /renderCraftPriceMarket\(\)/);
});
