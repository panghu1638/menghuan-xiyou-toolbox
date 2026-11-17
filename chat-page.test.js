import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const read = (file) => readFile(new URL(`./${file}`, import.meta.url), "utf8");

test("喊话对准页独立成页并挂上主题", async () => {
  const page = await read("chat.html");

  assert.match(page, /<link rel="stylesheet" href="\.\/styles\.css"/);
  assert.match(page, /<link rel="stylesheet" href="\.\/chat\.css"/);
  assert.match(page, /<script src="\.\/chat-aligner\.js"><\/script>/);
  assert.match(page, /aria-current="page"[^>]*>喊话对准|>喊话对准</);
  assert.doesNotMatch(page, /<style>/, "本页样式应放在 chat.css，不内联");
});

test("喊话页保留对准的关键节点", async () => {
  const page = await read("chat.html");

  for (const id of ["input", "entries", "resultText", "alignBtn", "stripEmoBtn"]) {
    assert.match(page, new RegExp(`id="${id}"`), `缺少 #${id}`);
  }
});

test("喊话页不再含算钱模块", async () => {
  const page = await read("chat.html");
  const js = await read("chat-aligner.js");

  for (const id of ["calcTable", "calcBody", "calcTotal", "qtyZeroBtn", "calcCopyBtn"]) {
    assert.doesNotMatch(page, new RegExp(`id="${id}"`), `仍残留 #${id}`);
  }
  assert.doesNotMatch(page, /id="cx-calc-title"/, "仍残留算钱卡片");
  assert.doesNotMatch(js, /splitNamePrice|renderCalc|calcItems/, "脚本仍残留算钱逻辑");
  assert.doesNotMatch(js, /state\.(price|qty)/, "脚本仍残留算钱状态");
});

test("所有页面导航都能互跳到喊话页", async () => {
  const pages = (await readdir(new URL("./", import.meta.url))).filter((f) =>
    f.endsWith(".html"),
  );

  assert.ok(pages.includes("chat.html"));
  for (const file of pages) {
    const html = await read(file);
    assert.match(html, /href="\.\/chat\.html"/, `${file} 导航缺少喊话对准`);
  }
});

test("喊话页样式沿用浅色主题", async () => {
  const css = await read("chat.css");

  assert.doesNotMatch(css, /#000(?:000)?\b|#111(?:111)?\b|rgba?\(\s*0\s*,\s*0\s*,\s*0/);
  assert.match(css, /var\(--font-display\)/);
  assert.match(css, /var\(--green\)/);
});

test("对准逻辑仍是单文件脚本，宽度表可改", async () => {
  const js = await read("chat-aligner.js");

  assert.match(js, /var W = \{ cn:14, digit:6\.5, dash:6/);
  assert.match(js, /cap: 97, emojiW: 22/);
  assert.match(js, /function alignLine\(/);
});
