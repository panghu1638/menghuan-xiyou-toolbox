(function () {
  var datePattern = /^\d{4}-\d{2}-\d{2}$/;

  function createStallPriceRecord({ date, item, unitPrice }) {
    if (typeof date !== "string" || !datePattern.test(date)) {
      throw new Error("摆摊价格日期必须是 YYYY-MM-DD");
    }
    var itemName = typeof item === "string" ? item.trim() : "";
    if (!itemName) {
      throw new Error("摆摊价格必须填写物品名称");
    }
    var price = Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("摆摊单价必须是不小于 0 的数字");
    }
    return { date, item: itemName, unitPrice: price };
  }

  function upsertStallPriceRecord(history, record) {
    var normalized = createStallPriceRecord(record);
    return history
      .filter(function (item) {
        return !(item.item === normalized.item && item.date === normalized.date);
      })
      .concat(normalized)
      .sort(function (first, second) {
        if (first.date !== second.date) return first.date < second.date ? 1 : -1;
        return first.item.localeCompare(second.item, "zh-Hans-CN");
      });
  }

  function latestStallPriceRecords(history) {
    var latest = {};
    history
      .slice()
      .sort(function (first, second) {
        return first.date < second.date ? 1 : -1;
      })
      .forEach(function (record) {
        if (!latest[record.item]) latest[record.item] = record;
      });
    return latest;
  }

  function applyLatestStallPrices(history, recipe) {
    var latest = latestStallPriceRecords(history);
    return recipe.map(function (material) {
      var record = latest[material.name];
      return record
        ? Object.assign({}, material, { unitPrice: record.unitPrice })
        : material;
    });
  }

  globalThis.XYQStallPriceHistory = {
    applyLatestStallPrices,
    createStallPriceRecord,
    latestStallPriceRecords,
    upsertStallPriceRecord,
  };
})();
