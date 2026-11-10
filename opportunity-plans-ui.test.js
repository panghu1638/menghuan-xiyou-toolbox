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

test("方案卡片使用数字输入并固定显示单位", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(index, /opportunity-plans\.js/);
  assert.match(app, /createInput\(\s*"number",\s*XYQOpportunityPlans\.skillCountInputValue/);
  assert.match(app, /placeholder = "3"/);
  assert.match(app, /className = "input-unit"/);
  assert.match(app, /skillUnit\.textContent = "技能"/);
  assert.match(app, /XYQOpportunityPlans\.skillPlanText\(opportunity\.skillPlan\) \|\| "未填技能"/);
  assert.match(styles, /\.input-with-unit/);
});

test("旧本地数据一次性补齐默认召唤兽方案", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(app, /defaultOpportunityNamesVersion: 1/);
  assert.match(app, /XYQOpportunityPlans\s*\.missingOpportunityNames\(saved\.opportunities\)/);
  assert.match(app, /isBlankOpportunity/);
  assert.match(app, /opportunitySeq = defaultState\.opportunities\.length \+ 1/);
});
