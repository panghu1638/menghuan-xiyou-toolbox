import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("摆摊价格由用户自行添加物品和名称", async () => {
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(market, /id="add-stall-price-row"/);
  assert.match(app, /placeholder = "自行输入物品名"/);
  assert.doesNotMatch(app, /var stallItems = \[/);
  const stallPanel = market.match(/<div class="stall-price-panel">[\s\S]*?<ol id="stall-price-history"/);
  assert.ok(stallPanel);
  for (const fixedItem of ["C66", "元宵", "炼兽丹", "60级武器", "70级武器", "80级武器"]) {
    assert.ok(!stallPanel[0].includes(fixedItem));
  }
});
