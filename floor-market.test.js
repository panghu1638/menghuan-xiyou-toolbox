import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import "./floor-market.js";

const {
  createFloorRecord,
  defaultFloorRecords,
  migrateFloorRecordNames,
} = globalThis.XYQFloorMarket;

test("默认地板价格与出货时间和截图一致", () => {
  assert.deepEqual(defaultFloorRecords, [
    { name: "苍茫远古家园", price: 300, saleTimes: "14.28" },
    { name: "齐天宴家园", price: 666, saleTimes: "11.07、21.36" },
    { name: "海之蔚蓝石砖", price: 666, saleTimes: "23.05、23.27、13.28" },
    { name: "绮夜舞会家园", price: 666, saleTimes: "0.26、19.57" },
    { name: "墨金曜光家园", price: 1288, saleTimes: "16.21、23.26、0.15、20.37" },
    { name: "浓情蜜意家园地板", price: 666, saleTimes: "1.55、20.37" },
    { name: "叮当猫欢乐童年地板", price: 666, saleTimes: "16.05、01.37、16.56" },
    { name: "青丘魅影家园", price: 1280, saleTimes: "01.56、0.52、23.55" },
    { name: "卧云月家园", price: 2888, saleTimes: "20.55、18.05、0.38" },
    { name: "雪之缘冰天雪地地板", price: 2888, saleTimes: "17.05、0.27、18.18" },
    { name: "云朵朵彩虹家园地板", price: 666, saleTimes: "1100、0.57、01.27、23.46、0.36" },
    { name: "玲珑兔梦幻家园", price: 666, saleTimes: "0.28" },
    { name: "情系千年家园", price: 1288, saleTimes: "0.22" },
    { name: "绿野仙踪地板", price: 0, saleTimes: "18.2" },
  ]);
});

test("旧地板简称迁移为完整名称且保留其他数据", () => {
  assert.deepEqual(
    migrateFloorRecordNames([
      { name: "远古", price: 123, saleTimes: "12.00" },
      { name: "自定义地板", price: 456, saleTimes: "13.00" },
      { name: "血之源", price: 2600, saleTimes: "" },
    ]),
    [
      { name: "苍茫远古家园", price: 123, saleTimes: "12.00" },
      { name: "自定义地板", price: 456, saleTimes: "13.00" },
    ],
  );
});

test("地板行情页文案使用完整表述", async () => {
  const floors = await readFile(new URL("./floors.html", import.meta.url), "utf8");

  assert.match(floors, /地板价格以及出货时间/);
  assert.match(floors, /地板名称/);
  assert.match(floors, /价格（元）/);
  assert.doesNotMatch(floors, /地板名字|价钱/);
});

test("地板记录校验名称、价格和出货时间", () => {
  assert.throws(() => createFloorRecord({ name: " ", price: 1, saleTimes: "" }), /名称/);
  assert.throws(() => createFloorRecord({ name: "远古", price: "abc", saleTimes: "" }), /价格/);
  assert.throws(
    () => createFloorRecord({ name: "远古", price: 1, saleTimes: 123 }),
    /出货时间/,
  );
  assert.deepEqual(
    createFloorRecord({ name: " 远古 ", price: "300", saleTimes: "14.28" }),
    { name: "远古", price: 300, saleTimes: "14.28" },
  );
});
