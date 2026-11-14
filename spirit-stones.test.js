import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./spirit-stones.js";

const stones = globalThis.XYQSpiritStones;

test("精魄灵石使用专用合成倍率", () => {
  assert.equal(stones.stoneMultiplier("速度灵石", 8), 132);
  assert.equal(stones.stoneMultiplier("防御灵石", 10), 724);
  assert.equal(stones.calculateStonePrice("速度灵石", 10, 10), 7240);
});

test("普通宝石一到十级按合成数量推导", () => {
  for (const gem of ["月亮石", "光芒石", "黑宝石", "太阳石", "红玛瑙", "舍利子", "翡翠石"]) {
    assert.equal(stones.stoneMultiplier(gem, 8), 128);
    assert.equal(stones.stoneMultiplier(gem, 10), 512);
  }
  assert.equal(stones.calculateStonePrice("太阳石", 8.8, 10), 4505.6);
});

test("星辉石和五色石使用独立倍率", () => {
  assert.equal(stones.stoneMultiplier("星辉石", 9), 6642);
  assert.equal(stones.stoneMultiplier("星辉石", 10), 20898);
  assert.equal(stones.stoneMultiplier("五色", 10), 2378);
  assert.equal(stones.calculateStonePrice("星辉石", 14.6, 10), 305110.8);
  assert.equal(stones.calculateStonePrice("五色", 42.5, 10), 101065);
});

test("灵饰分解按星辉石等级折算并计算保本收购价", () => {
  const result = stones.calculateLingShiBreakEven({
    stoneCount: 4,
    stoneLevel: 1,
    levelOnePriceWan: 14.5,
    symbolCount: 4,
    symbolPriceWan: 0.1,
  });
  assert.equal(result.equivalentCount, 4);
  assert.equal(result.grossWan, 58);
  assert.equal(result.symbolCostWan, 0.4);
  assert.equal(result.maxCostWan, 57.6);

  const levelTwo = stones.calculateLingShiBreakEven({
    stoneCount: 3,
    stoneLevel: 2,
    levelOnePriceWan: 14.5,
    symbolCount: 8,
    symbolPriceWan: 0.1,
  });
  assert.equal(levelTwo.equivalentCount, 9);
  assert.equal(levelTwo.grossWan, 130.5);
  assert.equal(levelTwo.symbolCostWan, 0.8);
  assert.equal(levelTwo.maxCostWan, 129.7);

  assert.equal(stones.calculateLingShiBreakEven({
    stoneCount: 0,
    stoneLevel: 1,
    levelOnePriceWan: 14.5,
    symbolCount: 4,
    symbolPriceWan: 0.1,
  }), null);
  assert.equal(stones.calculateLingShiBreakEven({
    stoneCount: 1,
    stoneLevel: 11,
    levelOnePriceWan: 14.5,
    symbolCount: 4,
    symbolPriceWan: 0.1,
  }), null);
});

test("灵饰分解默认覆盖60/80/100/120/140级", () => {
  assert.deepEqual(stones.defaultLingShiDecompose.records, [
    { level: 60, stoneLevel: 1, stoneCount: 4, symbolCount: 4 },
    { level: 80, stoneLevel: 2, stoneCount: 2, symbolCount: 6 },
    { level: 100, stoneLevel: 2, stoneCount: 3, symbolCount: 8 },
    { level: 120, stoneLevel: 3, stoneCount: 2, symbolCount: 10 },
    { level: 140, stoneLevel: 3, stoneCount: 3, symbolCount: 12 },
  ]);
  assert.equal(stones.defaultLingShiDecompose.levelOnePriceWan, 14.5);
  assert.equal(stones.defaultDecomposeSymbolPriceWan, 0.1);
});

test("上古玉魄按3个1级五色灵尘计算保本收购价", () => {
  const result = stones.calculateYuPoBreakEven({
    dustPriceWan: 40,
    symbolPriceWan: 0.1,
  });
  assert.equal(result.dustCount, 3);
  assert.equal(result.symbolCount, 6);
  assert.equal(result.dustRevenueWan, 120);
  assert.equal(result.symbolCostWan, 0.6);
  assert.equal(result.maxCostWan, 119.4);

  assert.equal(stones.calculateYuPoBreakEven({
    dustPriceWan: 0,
    symbolPriceWan: 0.1,
  }), null);
  assert.equal(stones.calculateYuPoBreakEven({
    dustPriceWan: 40,
    symbolPriceWan: -0.1,
  }), null);
});

test("上古玉魄默认内置6个分解符", () => {
  assert.equal(stones.defaultYuPoDecompose.dustCount, 3);
  assert.equal(stones.defaultYuPoDecompose.symbolCount, 6);
  assert.equal(stones.defaultDecomposeSymbolPriceWan, 0.1);
});

test("装备吸附石分解按数量扣分解符计算保本收购价", () => {
  const result = stones.calculateEquipmentAdsorbBreakEven({
    adsorbCount: 3,
    symbolCount: 6,
    adsorbPriceWan: 5,
    symbolPriceWan: 0.1,
  });
  assert.equal(result.adsorbRevenueWan, 15);
  assert.equal(result.symbolCostWan, 0.6);
  assert.equal(result.maxCostWan, 14.4);

  assert.equal(stones.calculateEquipmentAdsorbBreakEven({
    adsorbCount: 0,
    symbolCount: 6,
    adsorbPriceWan: 5,
    symbolPriceWan: 0.1,
  }), null);
  assert.equal(stones.calculateEquipmentAdsorbBreakEven({
    adsorbCount: 3,
    symbolCount: 6,
    adsorbPriceWan: 5,
    symbolPriceWan: -0.1,
  }), null);
});

test("装备吸附石分解默认覆盖100到140级", () => {
  assert.equal(stones.defaultEquipmentAdsorb.adsorbPriceWan, 5);
  assert.deepEqual(stones.defaultEquipmentAdsorb.records, [
    { level: 100, adsorbCount: 3, symbolCount: 6 },
    { level: 110, adsorbCount: 3, symbolCount: 7 },
    { level: 120, adsorbCount: 3, symbolCount: 12 },
    { level: 130, adsorbCount: 4, symbolCount: 16 },
    { level: 140, adsorbCount: 4, symbolCount: 23 },
  ]);
});

test("宝石折算人民币并扣除藏宝阁手续费", () => {
  const result = stones.calculateGemRmbProceeds(100, 7.2, 0.05, 1000);
  assert.ok(Math.abs(result.rmb - 7.2) < 0.001);
  assert.ok(Math.abs(result.fee - 0.36) < 0.001);
  assert.ok(Math.abs(result.netRmb - 6.84) < 0.001);

  const capped = stones.calculateGemRmbProceeds(100000, 7.2, 0.05, 300);
  assert.ok(Math.abs(capped.rmb - 7200) < 0.001);
  assert.equal(capped.fee, 300);
  assert.ok(Math.abs(capped.netRmb - 6900) < 0.001);
});

test("二梯队五色排第一并排除法防神秘石", () => {
  const gems = stones.defaultStoneCatalog[1].stones.map((stone) => stone.name);
  assert.deepEqual(gems, [
    "五色",
    "月亮石",
    "光芒石",
    "黑宝石",
    "太阳石",
    "红玛瑙",
    "舍利子",
    "翡翠石",
    "星辉石",
  ]);
  assert.ok(!gems.includes("神秘石"));
  assert.equal(stones.defaultStoneCatalog[0].rmbFromLevel, 9);
  assert.equal(stones.defaultStoneCatalog[1].rmbFromLevel, 1);
  assert.equal(stones.defaultLevelOnePrices.五色, 42.5);
  assert.equal(stones.defaultLevelOnePrices.红玛瑙, 9);
});

test("九级以上精魄灵石和全部二梯队宝石显示人民币到手", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(app, /table\.dataset\.rmbFromLevel = String\(group\.rmbFromLevel\)/);
  assert.match(app, /level >= Number\(table\.dataset\.rmbFromLevel\)/);
  assert.match(app, /level >= group\.rmbFromLevel/);
});

test("区内行情页接入灵饰分解保本收购", async () => {
  const [app, market, stones] = await Promise.all([
    readFile(new URL("./app.js", import.meta.url), "utf8"),
    readFile(new URL("./market.html", import.meta.url), "utf8"),
    readFile(new URL("./stones.html", import.meta.url), "utf8"),
  ]);

  assert.match(market, /id="ling-shi-decompose-table"/);
  assert.match(market, /id="decompose-star-price"/);
  assert.match(market, /id="decompose-symbol-price"/);
  assert.match(app, /renderLingShiDecompose\(\)/);
  assert.match(app, /lingShiDecompose/);
  assert.match(app, /decompose-symbol-price/);
  assert.match(app, /symbolCount/);
  assert.match(app, /symbolPriceWan/);
  assert.match(app, /decomposeSymbolPriceWan/);
  assert.doesNotMatch(market, /id="adsorb-symbol-price"/);
  assert.doesNotMatch(market, /id="yu-po-cost"/);
  assert.doesNotMatch(stones, /id="ling-shi-decompose-table"/);
  assert.doesNotMatch(stones, /id="decompose-symbol-price"/);
});

test("区内行情页接入上古玉魄分解保本收购", async () => {
  const [app, market, stones] = await Promise.all([
    readFile(new URL("./app.js", import.meta.url), "utf8"),
    readFile(new URL("./market.html", import.meta.url), "utf8"),
    readFile(new URL("./stones.html", import.meta.url), "utf8"),
  ]);

  assert.match(market, /id="yu-po-decompose-result"/);
  assert.match(market, /最低成本价/);
  assert.match(market, /id="decompose-symbol-price"/);
  assert.match(app, /renderYuPoDecompose\(\)/);
  assert.match(app, /yuPoDecompose/);
  assert.doesNotMatch(app, /yuPoDecompose\.decomposeCostWan/);
  assert.doesNotMatch(stones, /id="yu-po-decompose-result"/);
});

test("区内行情页接入装备吸附石分解保本收购", async () => {
  const [app, market, stones] = await Promise.all([
    readFile(new URL("./app.js", import.meta.url), "utf8"),
    readFile(new URL("./market.html", import.meta.url), "utf8"),
    readFile(new URL("./stones.html", import.meta.url), "utf8"),
  ]);

  assert.match(market, /id="equipment-adsorb-table"/);
  assert.match(app, /renderEquipmentAdsorb\(\)/);
  assert.match(app, /equipmentAdsorb/);
  assert.doesNotMatch(stones, /id="equipment-adsorb-table"/);
});
