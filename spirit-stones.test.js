import assert from "node:assert/strict";
import test from "node:test";
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
  assert.equal(stones.defaultLevelOnePrices.五色, 42.5);
  assert.equal(stones.defaultLevelOnePrices.红玛瑙, 9);
});
