(function () {
  var datePattern = /^\d{4}-\d{2}-\d{2}$/;

  function createGoldPriceRecord({ date, serverName, goldPricePerMillion }) {
    if (typeof date !== "string" || !datePattern.test(date)) {
      throw new Error("金价日期必须是 YYYY-MM-DD");
    }
    if (typeof serverName !== "string" || !serverName.trim()) {
      throw new Error("金价记录必须填写服务器");
    }

    var price = Number(goldPricePerMillion);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("金价必须是不小于 0 的数字");
    }

    return {
      date,
      serverName: serverName.trim(),
      goldPricePerMillion: price,
    };
  }

  function upsertGoldPriceRecord(history, record) {
    var normalized = createGoldPriceRecord(record);
    return history
      .filter(function (item) {
        return !(
          item.serverName === normalized.serverName && item.date === normalized.date
        );
      })
      .concat(normalized)
      .sort(function (first, second) {
        if (first.date !== second.date) return first.date < second.date ? 1 : -1;
        return first.serverName.localeCompare(second.serverName, "zh-Hans-CN");
      });
  }

  function latestGoldPriceRecord(history, serverName) {
    var normalizedServer = String(serverName || "").trim();
    if (!normalizedServer) return null;

    return history
      .filter(function (item) {
        return item.serverName === normalizedServer;
      })
      .sort(function (first, second) {
        return first.date < second.date ? 1 : -1;
      })[0] || null;
  }

  globalThis.XYQGoldPriceHistory = {
    createGoldPriceRecord,
    latestGoldPriceRecord,
    upsertGoldPriceRecord,
  };
})();
