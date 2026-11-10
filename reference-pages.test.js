import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("参考价格页面加入统一导航", async () => {
  const pages = await Promise.all(
    ["index.html", "market.html", "floors.html", "equipment.html", "eyes.html", "stones.html", "festival.html"].map(
      async (file) => [
        file,
        await readFile(new URL(`./${file}`, import.meta.url), "utf8"),
      ],
    ),
  );
  const navigation = Object.fromEntries(pages);

  for (const page of ["index.html", "market.html", "floors.html", "equipment.html", "eyes.html", "stones.html", "festival.html"]) {
    for (const target of ["index.html", "market.html", "floors.html", "equipment.html", "eyes.html", "stones.html", "festival.html"]) {
      if (page !== target) {
        assert.match(navigation[page], new RegExp(`href="\\.\\/${target}"`));
      }
    }
  }
});

test("宝宝装备和三眼九眼分成独立页面", async () => {
  const equipment = await readFile(new URL("./equipment.html", import.meta.url), "utf8");
  const eyes = await readFile(new URL("./eyes.html", import.meta.url), "utf8");

  assert.match(equipment, /id="equipment-groups"/);
  assert.doesNotMatch(equipment, /id="eye-price-groups"/);
  assert.match(eyes, /id="eye-price-groups"/);
  assert.doesNotMatch(eyes, /id="equipment-groups"/);
  const stones = await readFile(new URL("./stones.html", import.meta.url), "utf8");
  assert.match(stones, /id="stone-tier-tables"/);
  assert.doesNotMatch(stones, /id="stone-comparison"/);
  assert.doesNotMatch(stones, /比价等级/);
  const festival = await readFile(new URL("./festival.html", import.meta.url), "utf8");
  assert.match(festival, /id="yuanxiao-records"/);
  assert.match(festival, /id="zhenjing-price"/);
  assert.match(stones, /灵石合成[\s\S]*href="\.\/festival\.html"/);
});
