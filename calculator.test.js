import assert from "node:assert/strict";
import test from "node:test";

import "./calculator.js";

const { calculateOpportunity, defaultRecipe, formatCurrency, formatGameCoin } =
  globalThis.XYQCalculator;
const {
  normalizeGoldPriceToPerMillion,
} = globalThis.XYQCalculator;

test("计算材料成本、手续费、净回款和利润", () => {
  const result = calculateOpportunity({
    goldPricePerMillion: 1.2,
    salePrice: 40,
    feeRate: 0.05,
    feeCap: 1000,
    recipe: [
      { name: "超级金柳露", quantity: 15, unitPrice: 10 },
      { name: "仙露小丸子", quantity: 12, unitPrice: 5 },
      { name: "60级武器", quantity: 1, unitPrice: 20 },
      { name: "70级武器", quantity: 1, unitPrice: 30 },
      { name: "80级武器", quantity: 1, unitPrice: 40 },
      { name: "炼兽丹", quantity: 6, unitPrice: 8 },
    ],
  });

  assert.equal(result.materialCostGameCoin, 348);
  assert.equal(result.materialCostRmb, 4.18);
  assert.equal(result.fee, 2);
  assert.equal(result.netProceeds, 38);
  assert.equal(result.profit, 33.82);
  assert.equal(result.profitMargin, 33.82 / 4.18);
  assert.equal(result.breakEvenSalePrice, 4.4);
  assert.equal(result.hasProfit, true);
});

test("手续费达到上限时按上限扣除", () => {
  const result = calculateOpportunity({
    goldPricePerMillion: 1,
    salePrice: 25000,
    recipe: [{ name: "材料", quantity: 1, unitPrice: 2500000 }],
  });

  assert.equal(result.fee, 1000);
  assert.equal(result.netProceeds, 24000);
  assert.equal(result.breakEvenSalePrice, 26000);
});

test("手续费率和上限修改后保本售价仍准确", () => {
  const result = calculateOpportunity({
    goldPricePerMillion: 7.2,
    salePrice: 0,
    feeRate: 0.03,
    feeCap: 100,
    extraCostRmb: 3500,
    recipe: [],
  });

  assert.equal(result.breakEvenSalePrice, 3600);
});

test("按表格公式计算野生成本后的纯利润", () => {
  const result = calculateOpportunity({
    goldPricePerMillion: normalizeGoldPriceToPerMillion(0.072, "wan"),
    salePrice: 235,
    feeRate: 0.05,
    feeCap: 1000,
    extraCostRmb: 50,
    recipe: [
      { name: "超级金柳露", quantity: 15, unitPrice: 23 },
      { name: "60级武器", quantity: 5, unitPrice: 22 },
      { name: "70级武器", quantity: 5, unitPrice: 11 },
      { name: "80级武器", quantity: 5, unitPrice: 56 },
      { name: "仙露小丸子", quantity: 39, unitPrice: 15 },
      { name: "炼兽丹", quantity: 1, unitPrice: 1 },
    ],
  });

  assert.equal(result.materialCostGameCoin, 1376);
  assert.equal(result.materialCostRmb, 99.07);
  assert.equal(result.totalCostRmb, 149.07);
  assert.equal(result.netProceeds, 223.25);
  assert.equal(result.profit, 74.18);
});

test("金价单位换算为元每100万两", () => {
  assert.ok(Math.abs(normalizeGoldPriceToPerMillion(0.072, "wan") - 7.2) < 0.000001);
  assert.equal(normalizeGoldPriceToPerMillion(7.2, "million"), 7.2);
  assert.equal(normalizeGoldPriceToPerMillion(216, "bundle"), 7.2);
  assert.ok(Math.abs(normalizeGoldPriceToPerMillion(218, "bundle") - 218 / 30) < 0.000001);
  assert.throws(
    () => normalizeGoldPriceToPerMillion(216, "unknown"),
    /金价单位/,
  );
});

test("默认配方包含80级武器", () => {
  assert.deepEqual(
    defaultRecipe.map((item) => `${item.name}×${item.quantity}`),
    [
      "超级金柳露×0",
      "仙露小丸子×0",
      "60级武器×0",
      "70级武器×0",
      "80级武器×0",
      "炼兽丹×0",
    ],
  );
});

test("金额与游戏币显示保留两位小数", () => {
  assert.equal(formatCurrency(12.345), "12.35");
  assert.equal(formatGameCoin(12.345), "12.35 万两");
});
