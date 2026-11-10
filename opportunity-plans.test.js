import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./calculator.js";

const calculator = globalThis.XYQCalculator;

test("不提供内置模板，只保留手动填写", () => {
  assert.equal(Object.hasOwn(calculator, "spreadsheetTemplates"), false);
  assert.equal(Object.hasOwn(calculator, "parseTemplateLabel"), false);
});

test("绘卷页面按独立方案输入而不固定召唤兽", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(index, /id="opportunity-summary-list"/);
  assert.match(app, /opportunity\.skillPlan/);
  assert.match(app, /placeholder = "召唤兽名字，可随时修改"/);
  assert.match(app, /aria-label", "技能数量"/);
  assert.match(app, /function renderOpportunitySummary/);
  assert.doesNotMatch(app, /name: "龙鲤"/);
  assert.doesNotMatch(index, /id="opportunity-template"/);
  assert.doesNotMatch(index, /id="add-template-opportunity"/);
  assert.doesNotMatch(app, /spreadsheetTemplates|parseTemplateLabel/);
});

test("金价支持按3000万两一坨直接填写", async () => {
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");

  assert.match(market, /value="bundle"/);
  assert.match(market, /元 \/ 3000万两/);
});

test("恢复默认会清空历史且不重复绑定行情输入", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const resetStart = app.indexOf('bindClick("reset-data"');
  const resetEnd = app.indexOf("\n  bindMarketInputs();", resetStart);
  assert.ok(resetStart >= 0 && resetEnd > resetStart);
  const resetHandler = app.slice(resetStart, resetEnd);
  assert.match(resetHandler, /renderGoldPriceHistory\(\);/);
  assert.match(resetHandler, /renderStallPriceHistory\(\);/);
  assert.match(app, /serverName\.oninput\s*=/);
  assert.match(app, /goldPriceUnit\.onchange\s*=/);
});

test("行情参数只在区内行情页编辑，差价页仅显示", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  for (const elementId of [
    "server-name",
    "gold-price",
    "gold-price-unit",
    "fee-rate",
    "fee-cap",
  ]) {
    assert.doesNotMatch(index, new RegExp(`id="${elementId}"`));
    assert.match(market, new RegExp(`id="${elementId}"`));
  }
  assert.match(index, /id="current-market-summary"/);
  assert.match(app, /renderCurrentMarketSummary\(\);/);
});
