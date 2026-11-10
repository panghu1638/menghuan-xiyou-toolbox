import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import "./floor-market.js";

const {
  createFloorRecord,
  defaultFloorRecords,
} = globalThis.XYQFloorMarket;

test("默认地板价格与出货时间和截图一致", () => {
  assert.deepEqual(defaultFloorRecords, [
    { name: "远古", price: 300, saleTimes: "14.28" },
    { name: "齐天", price: 666, saleTimes: "11.07、21.36" },
    { name: "海洋", price: 666, saleTimes: "23.05、23.27、13.28" },
    { name: "绮梦舞会", price: 666, saleTimes: "0.26、19.57" },
    { name: "黑金", price: 1288, saleTimes: "16.21、23.26、0.15、20.37" },
    { name: "浓情蜜意", price: 666, saleTimes: "1.55、20.37" },
    { name: "叮当猫", price: 666, saleTimes: "16.05、01.37、16.56" },
    { name: "血之源", price: 2600, saleTimes: "" },
    { name: "青丘", price: 1280, saleTimes: "01.56、0.52、23.55" },
    { name: "卧云", price: 2888, saleTimes: "20.55、18.05、0.38" },
    { name: "雪之源", price: 2888, saleTimes: "17.05、0.27、18.18" },
    { name: "云朵", price: 666, saleTimes: "1100、0.57、01.27、23.46、0.36" },
    { name: "兔子", price: 666, saleTimes: "0.28" },
    { name: "情系千年", price: 1288, saleTimes: "0.22" },
    { name: "绿野仙踪", price: 0, saleTimes: "18.2" },
  ]);
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
