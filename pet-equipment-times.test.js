import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import "./floor-market.js";
import "./pet-equipment-times.js";

const {
  categories,
  createEmptyRecord,
  migratePetEquipmentRecords,
  removeCharacter,
} = globalThis.XYQPetEquipmentTimes;

test("宠装出货部位覆盖护腕项圈衣服并保留其他", () => {
  assert.deepEqual(categories, ["护腕", "项圈", "衣服", "其他"]);
});

test("新增宠装记录默认使用第一个角色和护腕", () => {
  assert.deepEqual(createEmptyRecord(["大号", "小号"]), {
    character: "大号",
    category: "护腕",
    damage: null,
    attributes: "",
    deliveryTime: "",
    shichen: "",
  });
});

test("宠装出货记录迁移保留角色并补齐字段", () => {
  assert.deepEqual(
    migratePetEquipmentRecords(
      [
        {
          character: "大号",
          category: "项圈",
          damage: "48",
          attributes: " 力量+12 ",
          deliveryTime: "14.28",
        },
        {
          character: "小号",
          category: "手镯",
          damage: "abc",
          attributes: 123,
          deliveryTime: "",
        },
        { character: "", category: "衣服", damage: -1 },
      ],
      [" 大号 ", "大号"],
    ),
    {
      characters: ["大号", "小号"],
      records: [
        {
          character: "大号",
          category: "项圈",
          damage: 48,
          attributes: "力量+12",
          deliveryTime: "14.28",
          shichen: "亥时",
        },
        {
          character: "小号",
          category: "其他",
          damage: null,
          attributes: "",
          deliveryTime: "",
          shichen: "—",
        },
        {
          character: "",
          category: "衣服",
          damage: null,
          attributes: "",
          deliveryTime: "",
          shichen: "—",
        },
      ],
    },
  );
});

test("宠装出货时间按梦幻30分钟时辰轮换", async () => {
  const page = await readFile(
    new URL("./equipment-times.html", import.meta.url),
    "utf8",
  );
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /<th>梦幻时辰<\/th>/);
  assert.match(page, /30分钟一轮/);
  assert.match(app, /XYQFloorMarket\.shichenFromDeliveryTime/);
  assert.match(app, /record\.shichen/);
});

test("没有保存角色时角色列表为空", () => {
  assert.deepEqual(migratePetEquipmentRecords(undefined, undefined), {
    characters: [],
    records: [],
  });
});

test("删除角色会保留记录但清空该角色", () => {
  assert.deepEqual(
    removeCharacter(
      ["神笔马良", "大号"],
      [
        { character: "神笔马良", category: "护腕", damage: 45 },
        { character: "大号", category: "项圈", damage: 48 },
      ],
      "神笔马良",
    ),
    {
      characters: ["大号"],
      records: [
        { character: "", category: "护腕", damage: 45 },
        { character: "大号", category: "项圈", damage: 48 },
      ],
    },
  );
});
