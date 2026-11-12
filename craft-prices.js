(function () {
  var craftCategories = [
    { name: "打造指南书", levels: [100, 110, 120, 130, 140, 150, 160] },
    { name: "铁", levels: [100, 110, 120, 130, 140, 150, 160] },
    { name: "灵饰指南书", levels: [60, 80, 100, 120, 140, 160] },
    { name: "元灵晶石", levels: [60, 80, 100, 120, 140] },
  ];
  var craftLevels = [60, 80, 100, 110, 120, 130, 140, 150, 160];

  function createCraftPriceRecords() {
    return craftCategories.flatMap(function (category) {
      return category.levels.map(function (level) {
        return { category: category.name, level: level, priceWan: null };
      });
    });
  }

  function findCraftPriceRecord(records, category, level) {
    return records.find(function (record) {
      return record.category === category && record.level === level;
    }) || null;
  }

  globalThis.XYQCraftPrices = {
    craftCategories,
    craftLevels,
    defaultCraftPriceRecords: createCraftPriceRecords(),
    findCraftPriceRecord,
  };
})();
