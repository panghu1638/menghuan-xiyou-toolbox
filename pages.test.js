import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("工具拆为三个互相跳转的页面", async () => {
  const files = ["index.html", "market.html", "floors.html"];
  const pages = Object.fromEntries(
    await Promise.all(files.map(async (file) => [
      file,
      await readFile(new URL(`./${file}`, import.meta.url), "utf8"),
    ])),
  );

  assert.match(pages["index.html"], /href="\.\/market\.html"/);
  assert.match(pages["index.html"], /href="\.\/floors\.html"/);
  assert.match(pages["market.html"], /href="\.\/index\.html"/);
  assert.match(pages["market.html"], /href="\.\/floors\.html"/);
  assert.match(pages["floors.html"], /href="\.\/index\.html"/);
  assert.match(pages["floors.html"], /href="\.\/market\.html"/);
});

test("首页专注差价计算，行情和地板分页承载", async () => {
  const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const floors = await readFile(new URL("./floors.html", import.meta.url), "utf8");

  assert.match(index, /id="opportunities"/);
  assert.doesNotMatch(index, /id="stall-price-fields"/);
  assert.doesNotMatch(index, /id="floor-records"/);
  assert.match(market, /id="stall-price-fields"/);
  assert.doesNotMatch(market, /id="opportunities"/);
  assert.match(floors, /id="floor-records"/);
  assert.doesNotMatch(floors, /id="opportunities"/);
  assert.doesNotMatch(floors, /id="stall-price-fields"/);
});
