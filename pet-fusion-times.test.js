import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./floor-market.js";
import "./pet-equipment-times.js";
import "./pet-fusion-times.js";

const times = globalThis.XYQPetFusionTimes;

test("新增炼妖记录沿用最近角色", () => {
  assert.deepEqual(times.createEmptyRecord(["大号", "小号"], "小号"), {
    character: "小号",
    embryoCombo: "",
    result: "",
    deliveryTime: "",
    shichen: "",
  });
  assert.deepEqual(times.createEmptyRecord(["大号", "小号"], "未保存角色"), {
    character: "大号",
    embryoCombo: "",
    result: "",
    deliveryTime: "",
    shichen: "",
  });
  assert.deepEqual(times.createEmptyRecord([], ""), {
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

test("炼妖出货记录归并臭名昭著狗托", () => {
  assert.deepEqual(
    times.migrateRecords(
      [{ character: "臭名昭著狗托", embryoCombo: "3+5", result: "6猴子" }],
      ["臭名昭著"],
    ),
    [
      {
        character: "臭名昭著",
        embryoCombo: "3+5",
        result: "6猴子",
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

test("炼妖组合搭配预置前期和后期示例", () => {
  const stages = new Set(times.defaultComboRecords.map((combo) => combo.stage));
  assert.deepEqual([...stages].sort(), ["early", "late"]);
  for (const combo of times.defaultComboRecords) {
    assert.deepEqual(Object.keys(combo), ["stage", "main", "sub", "target"]);
    assert.ok(combo.main && combo.sub && combo.target);
  }
});

test("新增炼妖组合按阶段生成空行", () => {
  assert.deepEqual(times.createEmptyCombo("late"), {
    stage: "late",
    main: "",
    sub: "",
    target: "",
  });
  assert.equal(times.createEmptyCombo("其他").stage, "early");
});

test("炼妖组合迁移补齐字段，未保存过时使用预置", () => {
  assert.deepEqual(times.migrateComboRecords(undefined), times.defaultComboRecords);
  assert.notEqual(times.migrateComboRecords(undefined), times.defaultComboRecords);
  assert.deepEqual(times.migrateComboRecords([]), []);
  assert.deepEqual(
    times.migrateComboRecords([
      { stage: "late", main: " 画魂 ", sub: " 持国巡守 ", target: " 须弥画魂 " },
      { stage: "x", main: 1 },
      null,
    ]),
    [
      { stage: "late", main: "画魂", sub: "持国巡守", target: "须弥画魂" },
      { stage: "early", main: "", sub: "", target: "" },
      { stage: "early", main: "", sub: "", target: "" },
    ],
  );
});

test("炼妖出货页顶部提供前期后期组合搭配", async () => {
  const page = await readFile(new URL("./fusion-times.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const backupSource = await readFile(new URL("./data-backup.js", import.meta.url), "utf8");

  assert.match(page, /炼妖组合搭配/);
  assert.match(page, /前期：定方向/);
  assert.match(page, /后期：合胚子/);
  assert.match(page, /预置思路仅作参考/);
  assert.ok(page.indexOf('id="fusion-combo-early"') < page.indexOf('id="fusion-time-records"'));
  assert.ok(page.indexOf('id="fusion-combo-early"') < page.indexOf('id="fusion-combo-late"'));
  assert.match(page, /id="fusion-combo-add-early"/);
  assert.match(page, /id="fusion-combo-add-late"/);
  assert.match(page, /<th>主宠<\/th>/);
  assert.match(page, /<th>副宠<\/th>/);
  assert.match(page, /<th>目标结果<\/th>/);
  assert.match(app, /fusionComboRecords/);
  assert.match(app, /renderFusionCombos\(\)/);
  assert.match(backupSource, /"fusionComboRecords"/);
});
