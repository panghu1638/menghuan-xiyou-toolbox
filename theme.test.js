import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("整套界面使用白色浅色主题", async () => {
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(styles, /color-scheme:\s*light/);
  assert.match(styles, /--page:\s*#ffffff/);
  assert.doesNotMatch(styles, /#0b0f0d|#0e1311|rgba\(23,\s*29,\s*26/);
});

test("数字输入框统一居中显示", async () => {
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(styles, /input\[type="number"\]\s*\{\s*text-align:\s*center;/);
  assert.doesNotMatch(styles, /\.festival-table input\s*\{[\s\S]*text-align:\s*right/);
});

test("零值数字输入显示为空方便直接填写", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");

  assert.match(app, /function priceValue\(value\) \{\s*return value === null \|\| value === undefined \|\| Number\(value\) === 0\s*\? ""\s*: value;/);
  assert.match(app, /input\.value = type === "number" \? priceValue\(value\) : value;/);
  assert.match(app, /priceInput\.value = priceValue\(record\.price\);/);
  assert.match(app, /goldPrice\.value = priceValue\(state\.goldPriceInput\);/);
  assert.doesNotMatch(market, /type="number"[^>]*value="0"/);
});
