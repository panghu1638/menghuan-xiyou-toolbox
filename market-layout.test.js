import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("行情参数保持紧凑布局", async () => {
  const market = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(market, /class="market-panel market-panel-compact"/);
  assert.match(styles, /\.market-panel-compact\.market-panel \{/);
  assert.match(styles, /\.market-panel-compact \.market-fields \{/);
  assert.match(styles, /\.market-panel-compact \.gold-price-history-panel,/);
});

test("导航改为悬浮收窄", async () => {
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.floating-nav \{/);
  assert.match(styles, /\.floating-nav\.masthead\.compact \{/);
  assert.match(styles, /\.nav-button \{\s*\n\s*min-height: 2rem;/);
});

test("非悬浮页保留原始导航样式", async () => {
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");
  const navBlock = styles.slice(
    styles.indexOf(".masthead.compact {"),
    styles.indexOf(".floating-nav.masthead.compact {"),
  );

  assert.match(navBlock, /padding: 1\.75rem 2rem 1\.15rem/);
  assert.match(navBlock, /font-size: clamp\(1\.5rem, 2\.8vw, 2\.15rem\)/);
});

test("导航悬浮规则覆盖所有工具页", async () => {
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");
  const navBlock = styles.slice(
    styles.indexOf(".floating-nav {"),
    styles.indexOf(".page-nav {"),
  );

  assert.match(navBlock, /position: sticky/);
  assert.match(navBlock, /top: 5px/);
  assert.match(navBlock, /z-index: 20/);
});
