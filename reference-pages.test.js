import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("参考价格页面加入统一导航", async () => {
  const pages = await Promise.all(
    ["index.html", "market.html", "floors.html", "equipment.html", "equipment-times.html", "fusion-times.html", "pets.html", "eyes.html", "stones.html"].map(
      async (file) => [
        file,
        await readFile(new URL(`./${file}`, import.meta.url), "utf8"),
      ],
    ),
  );
  const navigation = Object.fromEntries(pages);

  for (const page of ["index.html", "market.html", "floors.html", "equipment.html", "equipment-times.html", "fusion-times.html", "pets.html", "eyes.html", "stones.html"]) {
    for (const target of ["index.html", "market.html", "floors.html", "equipment.html", "equipment-times.html", "fusion-times.html", "pets.html", "eyes.html", "stones.html"]) {
      if (page !== target) {
        assert.match(navigation[page], new RegExp(`href="\\.\\/${target}"`));
      }
    }
  }
});

test("导航将价格行情和出货时间分成两组", async () => {
  const pageFiles = [
    "index.html",
    "market.html",
    "floors.html",
    "equipment.html",
    "equipment-times.html",
    "fusion-times.html",
    "pets.html",
    "eyes.html",
    "stones.html",
  ];
  const pages = await Promise.all(
    pageFiles.map(async (file) => [
      file,
      await readFile(new URL(`./${file}`, import.meta.url), "utf8"),
    ]),
  );

  for (const [, page] of pages) {
    const navigation = page.slice(
      page.indexOf('<nav class="page-nav"'),
      page.indexOf("</nav>"),
    );
    const pricePositions = ["index.html", "market.html", "pets.html", "equipment.html", "eyes.html", "stones.html"].map(
      (file) => navigation.indexOf(`href="./${file}"`),
    );
    const timePositions = ["floors.html", "equipment-times.html", "fusion-times.html"].map(
      (file) => navigation.indexOf(`href="./${file}"`),
    );

    assert.match(navigation, /价格行情[\s\S]*出货时间/);
    assert.ok(pricePositions.every((position) => position >= 0));
    assert.ok(timePositions.every((position) => position >= 0));
    assert.ok(Math.max(...pricePositions) < Math.min(...timePositions));
    const marketPosition = navigation.indexOf('href="./market.html"');
    const petPosition = navigation.indexOf('href="./pets.html"');
    assert.ok(marketPosition < petPosition);
  }
});

test("元宵珍经和打造材料并入区内行情", async () => {
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");

  assert.match(market, /id="yuanxiao-records"/);
  assert.match(market, /id="zhenjing-price"/);
  assert.match(market, /id="craft-price-table"/);
  assert.match(market, /id="craft-price-records"/);
  assert.doesNotMatch(market, /href="\.\/festival\.html"/);
  assert.doesNotMatch(market, /href="\.\/craft\.html"/);
});

test("宝宝装备和三眼九眼分成独立页面", async () => {
  const equipment = await readFile(new URL("./equipment.html", import.meta.url), "utf8");
  const eyes = await readFile(new URL("./eyes.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(equipment, /id="equipment-groups"/);
  assert.doesNotMatch(equipment, /id="eye-price-groups"/);
  assert.match(eyes, /id="eye-price-groups"/);
  assert.doesNotMatch(eyes, /id="equipment-groups"/);
  assert.match(equipment, /class="reference-grid equipment-grid"/);
  assert.doesNotMatch(app, /成本 \/ 手续费 \/ 净差价/);
  assert.doesNotMatch(app, /"摆摊成本 \/ 手续费", "净差价"/);
  assert.doesNotMatch(app, /\.equipment-result/);
  assert.doesNotMatch(app, /row\.append\(damageCell, stallCell, treasureCell, costCell, profitCell\)/);
  const stones = await readFile(new URL("./stones.html", import.meta.url), "utf8");
  assert.match(stones, /id="stone-tier-tables"/);
  assert.doesNotMatch(stones, /id="stone-comparison"/);
  assert.doesNotMatch(stones, /比价等级/);
  assert.doesNotMatch(stones, /id="yuanxiao-records"/);
  assert.doesNotMatch(stones, /href="\.\/festival\.html"/);
});

test("宝宝装备出货时间使用独立页面", async () => {
  const page = await readFile(
    new URL("./equipment-times.html", import.meta.url),
    "utf8",
  );

  assert.match(page, /id="pet-equipment-time-records"/);
  assert.match(page, /id="pet-equipment-add-record"/);
  assert.match(page, /id="pet-equipment-add-character"/);
  assert.match(page, /<th>角色<\/th>/);
  assert.match(page, /<th>装备部位<\/th>/);
  assert.match(page, /<th>伤害<\/th>/);
  assert.match(page, /<th>属性<\/th>/);
  assert.match(page, /<th>出货时间<\/th>/);
  assert.match(page, /宠装出货/);
  assert.match(page, /pet-equipment-times\.js/);
});

test("宠装出货页接入角色、记录和自动日期", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(app, /petEquipmentCharacters/);
  assert.match(app, /petEquipmentDeliveryRecords/);
  assert.match(app, /renderPetEquipmentTimes\(\)/);
  assert.match(app, /createAutoDateInput\(/);
  assert.match(app, /XYQFloorMarket\.formatSaleTimes/);
});
