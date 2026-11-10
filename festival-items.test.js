import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./festival-items.js";

const items = globalThis.XYQFestivalItems;

test("内置六类元宵覆盖主要资质", () => {
  assert.deepEqual(
    items.defaultYuanxiaoRecords.map((record) => record.name),
    [
      "攻击元宵",
      "防御元宵",
      "速度元宵",
      "躲闪元宵",
      "体力元宵",
      "法力元宵",
    ],
  );
  assert.equal(items.defaultZhenjingPriceWan, null);
});

test("元宵不折算人民币，珍经按当前金价折算", () => {
  assert.equal(items.calculateZhenjingRmb(100, 7.2), 7.2);
  assert.equal(items.calculateZhenjingRmb(null, 7.2), null);
  assert.equal(items.calculateZhenjingRmb(100, 0), null);
});

test("元宵固定六类，只保留价格输入", async () => {
  const page = await readFile(new URL("./festival.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.doesNotMatch(page, /id="add-yuanxiao-record"/);
  assert.match(page, /id="yuanxiao-records"/);
  assert.match(page, /id="zhenjing-price"/);
  assert.match(
    page,
    /攻击元宵[\s\S]*防御元宵[\s\S]*速度元宵[\s\S]*躲闪元宵[\s\S]*体力元宵[\s\S]*法力元宵/,
  );
  assert.doesNotMatch(page, /折算人民币[\s\S]*<tbody id="yuanxiao-records"/);
  assert.doesNotMatch(app, /updateYuanxiaoRow/);
  assert.doesNotMatch(app, /bindClick\("add-yuanxiao-record"/);
  assert.doesNotMatch(app, /zhenjingPrice\.addEventListener/);
});
