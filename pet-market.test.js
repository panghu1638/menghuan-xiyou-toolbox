import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./calculator.js";
import "./pet-market.js";

const petMarket = globalThis.XYQPetMarket;

test("内置召唤兽名单覆盖持国、谛听、广目和涂山瞳", () => {
  assert.deepEqual(
    petMarket.defaultPetRecords.map((record) => record.name),
    ["持国巡守", "谛听", "广目巡守", "涂山瞳"],
  );
  petMarket.defaultPetRecords.forEach((record) => {
    assert.equal(record.wildPriceWan, null);
    assert.deepEqual(record.skillTiers, [
      { skillCount: null, growth: null, gameCoinPriceWan: null, treasurePriceRmb: null },
    ]);
  });
});

test("技能档是独立空行，技能数和价格分开填", () => {
  assert.deepEqual(petMarket.createEmptySkillTier(), {
    skillCount: null,
    growth: null,
    gameCoinPriceWan: null,
    treasurePriceRmb: null,
  });
});

test("内置召唤兽成长档一一对应", () => {
  assert.deepEqual(petMarket.getGrowthOptions("持国巡守"), [
    1.225,
    1.237,
    1.25,
    1.262,
    1.275,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("多闻巡守"), [
    1.225,
    1.237,
    1.25,
    1.262,
    1.275,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("广目巡守"), [
    1.225,
    1.237,
    1.25,
    1.262,
    1.275,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("增长巡守"), [
    1.225,
    1.237,
    1.25,
    1.262,
    1.275,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("谛听"), [
    1.234,
    1.247,
    1.26,
    1.272,
    1.285,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("涂山瞳"), [
    1.215,
    1.227,
    1.24,
    1.252,
    1.264,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("大力金刚"), [
    1.215,
    1.227,
    1.24,
    1.252,
    1.264,
  ]);
  assert.deepEqual(petMarket.getGrowthOptions("龙龟"), [
    1.225,
    1.237,
    1.25,
    1.262,
    1.275,
  ]);
});

test("未内置的召唤兽给全量档位兜底", () => {
  const options = petMarket.getGrowthOptions("自定义宝宝");
  assert.deepEqual(options, [
    1.215,
    1.225,
    1.227,
    1.234,
    1.237,
    1.24,
    1.247,
    1.25,
    1.252,
    1.26,
    1.262,
    1.264,
    1.272,
    1.275,
    1.285,
  ]);
});

test("补齐缺失的默认召唤兽", () => {
  assert.deepEqual(
    petMarket.missingPetNames([
      { name: "持国巡守" },
      { name: "谛听" },
    ]),
    ["广目巡守", "涂山瞳"],
  );
  assert.deepEqual(petMarket.missingPetNames(petMarket.defaultPetRecords), []);
});

test("梦幻币价按当前金价折算人民币", () => {
  assert.equal(petMarket.calculateGameCoinRmb(1000, 7.2), 72);
  assert.equal(petMarket.calculateGameCoinRmb(null, 7.2), null);
  assert.equal(petMarket.calculateGameCoinRmb(1000, 0), null);
});

test("净利润等于藏宝阁到手减梦幻币成本", () => {
  const result = petMarket.calculatePetArbitrage({
    gameCoinPriceWan: 1000,
    treasurePriceRmb: 200,
    goldPricePerMillion: 7.2,
    feeRate: 0.05,
    feeCap: 1000,
  });

  assert.equal(result.gameCoinRmb, 72);
  assert.equal(result.fee, 10);
  assert.equal(result.netRmb, 190);
  assert.equal(result.profit, 118);
});

test("手续费按上限封顶，缺价不参与计算", () => {
  const capped = petMarket.calculatePetArbitrage({
    gameCoinPriceWan: 1000,
    treasurePriceRmb: 50000,
    goldPricePerMillion: 7.2,
    feeRate: 0.05,
    feeCap: 1000,
  });
  assert.equal(capped.fee, 1000);
  assert.equal(capped.netRmb, 49000);

  assert.equal(
    petMarket.calculatePetArbitrage({
      gameCoinPriceWan: null,
      treasurePriceRmb: 200,
      goldPricePerMillion: 7.2,
      feeRate: 0.05,
      feeCap: 1000,
    }),
    null,
  );
});

test("梦幻币收价留空时用自制成本折算", () => {
  const result = petMarket.calculatePetArbitrage({
    gameCoinPriceWan: null,
    wildCostWan: 220,
    treasurePriceRmb: 200,
    goldPricePerMillion: 7.2,
    feeRate: 0.05,
    feeCap: 1000,
  });
  assert.equal(result.gameCoinRmb, 15.84);
  assert.equal(result.netRmb, 190);
  assert.equal(result.profit, 174.16);

  assert.equal(
    petMarket.calculatePetArbitrage({
      gameCoinPriceWan: null,
      wildCostWan: null,
      treasurePriceRmb: 200,
      goldPricePerMillion: 7.2,
      feeRate: 0.05,
      feeCap: 1000,
    }),
    null,
  );
});

test("召唤兽行情页接入记录、新增和渲染", async () => {
  const page = await readFile(new URL("./pets.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /id="pet-market-records"/);
  assert.match(page, /id="pet-market-add-name"/);
  assert.match(page, /id="pet-market-add-record"/);
  assert.match(page, /id="pet-market-gold-summary"/);
  assert.match(page, /pet-market\.js/);
  assert.match(app, /petMarketRecords/);
  assert.match(app, /renderPetMarket\(\)/);
  assert.match(app, /XYQPetMarket\.calculatePetArbitrage/);
  assert.match(app, /XYQPetMarket\.getGrowthOptions/);
  assert.match(app, /bindClick\("pet-market-add-record"/);
  assert.match(app, /skillTiers/);
  assert.match(app, /"技能数",\s*\n\s*"成长",\s*\n\s*"梦幻币价（万两）"/);
  assert.match(app, /tier\.growth/);
  assert.doesNotMatch(app, /createPetHeadField\(\s*"成长"/);
  assert.match(app, /添加技能档/);
  assert.match(app, /野生成本（万两）/);
  assert.match(app, /\[2, 3, 4, 5\]/);
  assert.match(app, /skillCount \+ "技能"/);
  assert.doesNotMatch(app, /placeholder = "如 3"/);
  assert.doesNotMatch(app, /skillPriceWan/);
  assert.doesNotMatch(app, /自制成本/);
});
