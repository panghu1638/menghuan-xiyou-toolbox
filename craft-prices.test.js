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

test("打造材料等级表并入区内行情", async () => {
  const page = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /id="craft-price-table"/);
  assert.match(page, /<th[^>]*>打造指南书<\/th>/);
  assert.match(page, /<th[^>]*>铁<\/th>/);
  assert.match(page, /<th[^>]*>灵饰指南书<\/th>/);
  assert.match(page, /<th[^>]*>元灵晶石<\/th>/);
  assert.match(page, /craft-prices\.js/);
  assert.doesNotMatch(page, /href="\.\/craft\.html"/);
  assert.match(app, /craftPriceRecords/);
  assert.match(app, /renderCraftPriceMarket\(\)/);
});
