import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import "./data-backup.js";

const backup = globalThis.XYQDataBackup;

test("行情页提供导出备份和导入恢复", async () => {
  const page = await readFile(new URL("./market.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

  assert.match(page, /id="export-data"/);
  assert.match(page, /id="import-data"/);
  assert.ok(
    page.indexOf('id="export-data"') > page.indexOf('id="craft-price-records"'),
    "导出备份等操作按钮应位于页面最底部",
  );
  assert.match(app, /bindClick\("export-data"/);
  assert.match(app, /bindClick\("import-data"/);
  assert.match(app, /XYQDataBackup\.validateBackup/);
  assert.match(app, /xyq-backup-/);
  assert.match(app, /location\.reload\(\)/);
});

test("备份校验接受旧备份并补齐当前版本", () => {
  const imported = backup.validateBackup({
    serverName: "神笔马良",
    opportunities: [{ id: 1 }],
  });

  assert.equal(imported.schemaVersion, backup.schemaVersion);
  assert.equal(imported.serverName, "神笔马良");
});

test("备份校验拒绝错误类型和未知版本", () => {
  assert.throws(() => backup.validateBackup(null), /备份文件格式不对/);
  assert.throws(() => backup.validateBackup([]), /备份文件格式不对/);
  assert.throws(
    () => backup.validateBackup({ opportunities: "bad" }),
    /opportunities/,
  );
  assert.throws(
    () => backup.validateBackup({ opportunities: [], materials: 1 }),
    /materials/,
  );
  assert.throws(
    () => backup.validateBackup({ opportunities: [], schemaVersion: 99 }),
    /schemaVersion/,
  );
});

test("备份校验拒绝非法数值和文本字段", () => {
  assert.throws(
    () => backup.validateBackup({ opportunities: [], feeRate: "bad" }),
    /feeRate/,
  );
  assert.throws(
    () => backup.validateBackup({ opportunities: [], serverName: 123 }),
    /serverName/,
  );
  assert.throws(
    () => backup.validateBackup({ opportunities: [], lingShiDecompose: [] }),
    /lingShiDecompose/,
  );
});
