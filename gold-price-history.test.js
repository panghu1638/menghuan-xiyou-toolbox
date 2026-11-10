import assert from "node:assert/strict";
import test from "node:test";

import "./gold-price-history.js";

const {
  createGoldPriceRecord,
  latestGoldPriceRecord,
  upsertGoldPriceRecord,
} = globalThis.XYQGoldPriceHistory;

test("金价记录按服务器和日期覆盖并倒序排列", () => {
  const first = createGoldPriceRecord({
    date: "2026-11-09",
    serverName: " 2008 ",
    goldPricePerMillion: 1.15,
  });
  const history = upsertGoldPriceRecord(
    upsertGoldPriceRecord([], first),
    createGoldPriceRecord({
      date: "2026-11-10",
      serverName: "2008",
      goldPricePerMillion: 1.18,
    }),
  );
  const updated = upsertGoldPriceRecord(history, {
    date: "2026-11-09",
    serverName: "2008",
    goldPricePerMillion: 1.2,
  });

  assert.deepEqual(updated, [
    { date: "2026-11-10", serverName: "2008", goldPricePerMillion: 1.18 },
    { date: "2026-11-09", serverName: "2008", goldPricePerMillion: 1.2 },
  ]);
});

test("最新金价只匹配当前服务器", () => {
  const history = [
    { date: "2026-11-10", serverName: "珍宝阁", goldPricePerMillion: 1.3 },
    { date: "2026-11-09", serverName: "2008", goldPricePerMillion: 1.1 },
  ];

  assert.deepEqual(latestGoldPriceRecord(history, "2008"), history[1]);
  assert.equal(latestGoldPriceRecord(history, "如意岛"), null);
});

test("金价记录校验日期、服务器和价格", () => {
  assert.throws(
    () => createGoldPriceRecord({ date: "2026/11/10", serverName: "2008", goldPricePerMillion: 1 }),
    /日期/,
  );
  assert.throws(
    () => createGoldPriceRecord({ date: "2026-11-10", serverName: " ", goldPricePerMillion: 1 }),
    /服务器/,
  );
  assert.throws(
    () => createGoldPriceRecord({ date: "2026-11-10", serverName: "2008", goldPricePerMillion: "abc" }),
    /金价/,
  );
});
