import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./opportunity-plans.js";

const plans = globalThis.XYQOpportunityPlans;

test("技能数量输入和显示文案统一为数字加技能", () => {
  assert.equal(plans.skillCountInputValue("4技能"), 4);
  assert.equal(plans.skillPlanText(4), "4技能");
  assert.equal(plans.skillPlanText("3"), "3技能");
  assert.equal(plans.skillPlanText("4技能"), "4技能");
  assert.equal(plans.skillPlanText(""), "");
  assert.equal(plans.skillPlanText("新方案"), "");
});

test("默认召唤兽方案覆盖用户指定名单", () => {
  assert.deepEqual(plans.defaultOpportunityNames, [
    "持国巡守",
    "谛听",
    "多闻巡守",
    "广目巡守",
    "人形猫灵",
    "涂山瞳",
  ]);
  assert.deepEqual(
    plans.missingOpportunityNames([{ name: "持国巡守" }, { name: "自定义召唤兽" }]),
    ["谛听", "多闻巡守", "广目巡守", "人形猫灵", "涂山瞳"],
  );
});

test("顶部下拉选择召唤兽和技能数量，只显示当前方案", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(index, /opportunity-plans\.js/);
  assert.match(index, /id="opportunity-picker"/);
  assert.match(index, /id="skill-count-picker"/);
  assert.match(index, /value="4">4技能<\/option>/);
  assert.match(app, /selectedOpportunityId/);
  assert.match(app, /function currentOpportunity\(/);
  assert.match(app, /function renderOpportunityPicker\(/);
  assert.match(app, /state\.selectedOpportunityId = opportunity\.id/);
  assert.match(app, /function renderOpportunitySummary\(calculation\)/);
  assert.doesNotMatch(app, /state\.opportunities\.forEach\(function \(opportunity\) \{\s*opportunityList\.append/);
  assert.match(app, /function opportunityOptionLabel\(opportunity\)/);
  assert.match(app, /var opportunity = currentOpportunity\(\);\n\s*if \(opportunity\) opportunityList\.append\(renderOpportunity\(opportunity\)\);/);
  assert.match(styles, /\.opportunity-selector-fields/);
  assert.doesNotMatch(styles, /\.input-with-unit/);
});

test("材料单价全局统一，召唤兽方案只填数量", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(index, /id="material-price-fields"/);
  assert.match(index, /统一材料价格/);
  assert.match(app, /materials: structuredClone\(XYQCalculator\.defaultMaterials\)/);
  assert.match(app, /function renderMaterialPriceInputs\(/);
  assert.match(app, /function recipeForOpportunity\(opportunity\)/);
  assert.match(app, /normalizeMaterialPrices\(saved\)/);
  assert.match(app, /normalizeOpportunityQuantities\(/);
  assert.match(app, /state\.materials\.forEach\(function \(material, itemIndex\)/);
  assert.match(app, /"对标单价"/);
  assert.match(styles, /\.material-price-fields/);
  assert.match(styles, /\.recipe-unit-price/);
});

test("顶部利润卡只在当前方案有净利润时显示", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const hiddenStyles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(index, /<main>\s*<section id="opportunity-summary-section"[^>]*hidden/);
  assert.match(index, /有利润方案/);
  assert.doesNotMatch(index, /当前行情/);
  assert.match(app, /var hasProfit = Boolean\(opportunity && calculation && calculation\.hasProfit\)/);
  assert.match(app, /opportunitySummarySection\.hidden = !hasProfit/);
  assert.match(app, /if \(!hasProfit\) return/);
  assert.match(hiddenStyles, /\[hidden\]\s*\{\s*display: none !important;/);
});

test("旧本地数据一次性补齐默认召唤兽方案", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(app, /defaultOpportunityNamesVersion: 1/);
  assert.match(app, /XYQOpportunityPlans\s*\.missingOpportunityNames\(saved\.opportunities\)/);
  assert.match(app, /isBlankOpportunity/);
  assert.match(app, /opportunitySeq = defaultState\.opportunities\.length \+ 1/);
});
