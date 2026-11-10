import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./opportunity-plans.js";

const plans = globalThis.XYQOpportunityPlans;

test("技能数量输入和显示文案统一为数字加技", () => {
  assert.equal(plans.skillCountInputValue("4技能"), 4);
  assert.equal(plans.skillPlanText(4), "4技");
  assert.equal(plans.skillPlanText("3"), "3技");
  assert.equal(plans.skillPlanText("4技能"), "4技");
  assert.equal(plans.skillPlanText(""), "");
  assert.equal(plans.skillPlanText("新方案"), "");
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
