import assert from "node:assert/strict";
import test from "node:test";
import "./spirit-stones.js";

const stones = globalThis.XYQSpiritStones;

test("灵石各级数值与截图一致", () => {
  assert.equal(stones.attributeValues("速度", 8), 1188);
  assert.equal(stones.attributeValues("防御", 10), 3620);
  assert.equal(stones.calculateStonePrice("星辉石", 14.6, 10), 287371.8);
  assert.equal(stones.calculateStonePrice("玛瑙", 9, 10), 6516);
  assert.equal(stones.calculateStonePrice("黑宝石", 15.7, 10), 11366.8);
  assert.ok(Math.abs(stones.calculateStonePrice("太阳石", 8.8, 10) - 6371.2) < 0.001);
  assert.equal(stones.calculateStonePrice("五色", 42.5, 10), 101065);
  assert.equal(stones.stoneMultiplier("玛瑙", 10), 724);
  assert.equal(stones.stoneMultiplier("星辉石", 10), 19683);
});

test("灵石比价按金价折算并扣除手续费", () => {
  const result = stones.calculateStoneArbitrage({
    stone: "玛瑙",
    levelOnePriceWan: 9,
    targetLevel: 10,
    treasurePriceRmb: 387,
    goldPricePerMillion: 7.2,
    feeRate: 0.05,
    feeCap: 1000,
  });

  assert.ok(Math.abs(result.costWan - 6516) < 0.001);
  assert.ok(Math.abs(result.costRmb - 469.152) < 0.001);
  assert.ok(Math.abs(result.fee - 19.35) < 0.001);
  assert.ok(Math.abs(result.profit + 101.502) < 0.001);
});

test("默认比价行覆盖属性、灵石和藏宝阁价", () => {
  assert.deepEqual(stones.defaultComparisonRecords, [
    { attribute: "速度", stone: "速度灵石", sourceStone: "黑宝石", treasurePriceRmb: 599 },
    { attribute: "伤害", stone: "伤害灵石", sourceStone: "太阳石", treasurePriceRmb: 565 },
    { attribute: "灵力", stone: "灵力灵石", sourceStone: "玛瑙", treasurePriceRmb: 387 },
    { attribute: "气血", stone: "气血灵石", sourceStone: "星辉石", treasurePriceRmb: 556 },
    { attribute: "防御", stone: "防御灵石", sourceStone: "五色", treasurePriceRmb: 288 },
  ]);
  assert.deepEqual(
    stones.defaultStoneCatalog.map((group) => group.tier),
    ["一梯队 · 精魄灵石", "二梯队 · 其他宝石"],
  );
  assert.deepEqual(
    stones.defaultStoneCatalog[0].stones.map((stone) => stone.name),
    ["速度灵石", "伤害灵石", "灵力灵石", "气血灵石", "防御灵石"],
  );
  assert.equal(stones.calculateStonePrice("速度灵石", 10, 10), 7240);
  assert.equal(stones.defaultLevelOnePrices.速度灵石, 0);
  assert.equal(stones.defaultLevelOnePrices.黑宝石, 15.7);
});
