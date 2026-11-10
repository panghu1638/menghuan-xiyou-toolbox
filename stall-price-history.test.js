import assert from "node:assert/strict";
import test from "node:test";

import "./stall-price-history.js";

const {
  applyLatestStallPrices,
  upsertStallPriceRecord,
} = globalThis.XYQStallPriceHistory;

test("摆摊价格按物品和日期覆盖并倒序排列", () => {
  let history = upsertStallPriceRecord([], {
    date: "2026-11-09",
    item: "自定义物品",
    unitPrice: 10,
  });
  history = upsertStallPriceRecord(history, {
    date: "2026-11-10",
    item: "自定义物品",
    unitPrice: 10.5,
  });

  const updated = upsertStallPriceRecord(history, {
    date: "2026-11-09",
    item: "自定义物品",
    unitPrice: 9.8,
  });

  assert.deepEqual(updated, [
    { date: "2026-11-10", item: "自定义物品", unitPrice: 10.5 },
    { date: "2026-11-09", item: "自定义物品", unitPrice: 9.8 },
  ]);
});

test("最新摆摊价格按同名应用到配方", () => {
  const recipe = [
    { name: "超级金柳露", quantity: 15, unitPrice: 0 },
    { name: "自定义材料", quantity: 1, unitPrice: 3 },
  ];
  const history = [
    { date: "2026-11-09", item: "超级金柳露", unitPrice: 9.8 },
    { date: "2026-11-10", item: "超级金柳露", unitPrice: 10 },
    { date: "2026-11-10", item: "自定义材料", unitPrice: 4.5 },
  ];

  assert.deepEqual(applyLatestStallPrices(history, recipe), [
    { name: "超级金柳露", quantity: 15, unitPrice: 10 },
    { name: "自定义材料", quantity: 1, unitPrice: 4.5 },
  ]);
});

test("摆摊价格记录校验日期、物品和单价", () => {
  assert.throws(
    () => upsertStallPriceRecord([], { date: "2026/11/10", item: "自定义物品", unitPrice: 1 }),
    /日期/,
  );
  assert.throws(
    () => upsertStallPriceRecord([], { date: "2026-11-10", item: " ", unitPrice: 1 }),
    /物品/,
  );
  assert.throws(
    () => upsertStallPriceRecord([], { date: "2026-11-10", item: "自定义物品", unitPrice: "abc" }),
    /单价/,
  );
});
