import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("上古玉魄输入紧凑且最高收购价突出", async () => {
  const [market, styles, app] = await Promise.all([
    readFile(new URL("./market.html", import.meta.url), "utf8"),
    readFile(new URL("./styles.css", import.meta.url), "utf8"),
    readFile(new URL("./app.js", import.meta.url), "utf8"),
  ]);

  assert.match(market, /class="yu-po-decompose-settings"/);
  assert.match(styles, /\.yu-po-decompose-settings \{/);
  assert.match(styles, /\.yu-po-decompose-result \.max-cost \{/);
  assert.match(styles, /font-size: 1\.45rem/);
  assert.match(app, /\.className = "max-cost"/);
  assert.match(app, /\.className = "muted-cost"/);
  assert.match(app, /最高收购价/);
  assert.match(app, /最低成本价/);
});
