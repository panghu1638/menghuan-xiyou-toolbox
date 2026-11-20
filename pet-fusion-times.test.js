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
  assert.deepEqual(times.defaultComboRecords, [
    {
      stage: "early",
      main: "6–7须弥心猿",
      sub: "4–5出其心猿",
      target: "6–7双特殊心猿",
    },
    {
      stage: "early",
      main: "6–7须弥人马",
      sub: "4–5出其人马",
      target: "6–7双特殊人马",
    },
    {
      stage: "late",
      main: "8–10须弥心猿",
      sub: "6–8出其心猿",
      target: "8+双特殊心猿",
    },
    {
      stage: "late",
      main: "8–10须弥人马",
      sub: "6–8出其人马",
      target: "8+双特殊人马",
    },
  ]);
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

test("炼妖组合可生成预填炼妖记录", () => {
  assert.deepEqual(
    times.createRecordFromCombo(
      { main: " 画魂 ", sub: " 持国巡守 ", target: " 须弥画魂 " },
      ["大号", "小号"],
      "小号",
    ),
    {
      character: "小号",
      embryoCombo: "画魂 + 持国巡守",
      result: "须弥画魂",
      deliveryTime: "",
      shichen: "",
    },
  );
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

test("旧版未修改的预置组合自动升级，自定义组合保留", () => {
  const firstLegacyDefaults = [
    { stage: "early", main: "画魂", sub: "持国巡守", target: "须弥画魂" },
    { stage: "early", main: "泪妖", sub: "持国巡守", target: "须弥泪妖" },
    { stage: "early", main: "须弥宠", sub: "出奇制胜宠", target: "少技能出奇须弥" },
    { stage: "late", main: "少技能出奇须弥", sub: "多技能胚子", target: "多技能出奇须弥" },
    { stage: "late", main: "净台妙谛宠", sub: "多技能胚子", target: "多技能净台妙谛" },
  ];
  const secondLegacyDefaults = [
    { stage: "early", main: "画魂", sub: "持国巡守", target: "6–7技能须弥画魂" },
    { stage: "early", main: "泪妖", sub: "持国巡守", target: "6–7技能须弥泪妖" },
    { stage: "late", main: "6–7技能须弥", sub: "4技能出奇自在心猿", target: "须弥出奇自在心猿" },
    { stage: "late", main: "6–7技能须弥", sub: "4技能出奇人形翼马", target: "须弥出奇人形翼马" },
  ];
  const thirdLegacyDefaults = [
    {
      stage: "early",
      main: "6–7技能须弥自在心猿",
      sub: "4–5技能出其不意自在心猿",
      target: "6–7技能双特殊自在心猿",
    },
    {
      stage: "early",
      main: "6–7技能须弥人形翼马",
      sub: "4–5技能出其不意人形翼马",
      target: "6–7技能双特殊人形翼马",
    },
    {
      stage: "late",
      main: "8–10技能须弥自在心猿",
      sub: "6–8技能出其不意自在心猿",
      target: "8技能以上双特殊自在心猿",
    },
    {
      stage: "late",
      main: "8–10技能须弥人形翼马",
      sub: "6–8技能出其不意人形翼马",
      target: "8技能以上双特殊人形翼马",
    },
  ];
  const customCombo = {
    stage: "late",
    main: "自用主宠",
    sub: "自用副宠",
    target: "自用结果",
  };

  assert.deepEqual(
    times.migrateComboRecords(firstLegacyDefaults),
    times.defaultComboRecords,
  );
  assert.deepEqual(
    times.migrateComboRecords(secondLegacyDefaults),
    times.defaultComboRecords,
  );
  assert.deepEqual(
    times.migrateComboRecords(thirdLegacyDefaults),
    times.defaultComboRecords,
  );
  assert.deepEqual(times.migrateComboRecords([customCombo]), [customCombo]);
});

test("炼妖出货页顶部提供前期后期组合搭配", async () => {
  const page = await readFile(new URL("./fusion-times.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const backupSource = await readFile(new URL("./data-backup.js", import.meta.url), "utf8");

  assert.match(page, /炼妖组合搭配/);
  assert.match(page, /class="fusion-combo-board"/);
  assert.match(page, />前期<\/span>\s*<h3[^>]*>定方向<\/h3>/);
  assert.match(page, />后期<\/span>\s*<h3[^>]*>合胚子<\/h3>/);
  assert.match(page, /预置思路仅作参考/);
  assert.match(page, /id="fusion-combo-count-early"/);
  assert.match(page, /id="fusion-combo-count-late"/);
  assert.match(page, /同造型 6–7 技能双特殊/);
  assert.match(page, /同造型 8\+ 技能双特殊/);
  assert.match(page, /出其不意/);
  assert.match(page, /心猿＝自在心猿/);
  assert.match(page, /人马＝人形翼马/);
  assert.ok(page.indexOf('id="fusion-combo-early"') < page.indexOf('id="fusion-time-records"'));
  assert.ok(page.indexOf('id="fusion-combo-early"') < page.indexOf('id="fusion-combo-late"'));
  assert.match(page, /id="fusion-combo-add-early"/);
  assert.match(page, /id="fusion-combo-add-late"/);
  assert.match(page, /<th>主宠<\/th>/);
  assert.match(page, /<th>副宠<\/th>/);
  assert.match(page, /<th>目标结果<\/th>/);
  assert.match(app, /fusionComboRecords/);
  assert.match(app, /renderFusionCombos\(\)/);
  assert.match(app, /createRecordFromCombo/);
  assert.match(app, /记录/);
  assert.match(backupSource, /"fusionComboRecords"/);
});
