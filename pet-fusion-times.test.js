import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./floor-market.js";
import "./pet-fusion-times.js";

const times = globalThis.XYQPetFusionTimes;

test("新增炼妖记录默认使用第一个角色", () => {
  assert.deepEqual(times.createEmptyRecord(["大号", "小号"]), {
    character: "大号",
    embryoCombo: "",
    result: "",
    deliveryTime: "",
    shichen: "",
  });
  assert.deepEqual(times.createEmptyRecord([]), {
    character: "",
    embryoCombo: "",
    result: "",
    deliveryTime: "",
    shichen: "",
  });
});

test("炼妖出货记录迁移保留有效角色并补齐字段", () => {
  assert.deepEqual(
    times.migrateRecords(
      [
        {
          character: " 大号 ",
          embryoCombo: " 泪妖 + 日游神 ",
          result: " 须弥泪妖 ",
          referenceTimes: "14.28",
          deliveryTime: "11月12日 21.36",
          shichen: "旧值",
        },
        { character: "未保存角色", result: 123 },
      ],
      ["大号"],
    ),
    [
      {
        character: "大号",
        embryoCombo: "泪妖 + 日游神",
        result: "须弥泪妖",
        deliveryTime: "11月12日 21.36",
        shichen: "寅时",
      },
      {
        character: "",
        embryoCombo: "",
        result: "",
        deliveryTime: "",
        shichen: "—",
      },
    ],
  );
});

test("炼妖出货时间按梦幻30分钟时辰轮换", () => {
  assert.equal(times.shichenFromDeliveryTime(""), "—");
  assert.equal(times.shichenFromDeliveryTime("11月13日"), "—");
  assert.equal(times.shichenFromDeliveryTime("14.28"), "亥时");
  assert.equal(times.shichenFromDeliveryTime("00.00"), "子时");
  assert.equal(times.shichenFromDeliveryTime("00.03"), "丑时");
  assert.equal(times.shichenFromDeliveryTime("00.05"), "寅时");
  assert.equal(times.shichenFromDeliveryTime("00.30"), "子时");
  assert.equal(times.shichenFromDeliveryTime("23.59"), "亥时");
  assert.equal(
    times.shichenFromDeliveryTime("11月13日 14.28、21.36"),
    "亥时、寅时",
  );
});

test("炼妖出货页接入宠装角色和地板时间格式", async () => {
  const page = await readFile(new URL("./fusion-times.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /id="fusion-time-records"/);
  assert.match(page, /<th>角色<\/th>/);
  assert.match(page, /<th>胚子组合<\/th>/);
  assert.match(page, /<th>炼妖结果<\/th>/);
  assert.match(page, /<th>出货时间<\/th>/);
  assert.match(page, /<th>梦幻时辰<\/th>/);
  assert.match(page, /30分钟一轮/);
  assert.match(app, /shichenFromDeliveryTime/);
  assert.match(app, /record\.shichen/);
  assert.doesNotMatch(page, /旧数据参考/);
  assert.match(page, /炼妖出货时间/);
  assert.match(page, /pet-fusion-times\.js/);
  assert.match(app, /fusionDeliveryRecords/);
  assert.match(app, /state\.petEquipmentCharacters/);
  assert.match(app, /renderFusionDeliveryTimes\(\)/);
  assert.match(app, /XYQFloorMarket\.formatSaleTimes/);
});
