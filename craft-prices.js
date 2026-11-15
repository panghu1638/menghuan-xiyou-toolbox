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

  function enhanceStoneCount(level) {
    var numericLevel = Number(level);
    if (
      !Number.isInteger(numericLevel) ||
      numericLevel < 100 ||
      numericLevel > 160 ||
      numericLevel % 10 !== 0
    ) {
      return null;
    }
    return numericLevel / 10;
  }

  function nonNegativePrice(value) {
    var price = Number(value);
    return value !== null && value !== undefined && value !== "" &&
      Number.isFinite(price) && price >= 0
      ? price
      : null;
  }

  function calculateEquipmentCraftCost(
    level,
    guidePriceWan,
    ironPriceWan,
    enhanceStonePriceWan,
  ) {
    var stoneCount = enhanceStoneCount(level);
    var guidePrice = nonNegativePrice(guidePriceWan);
    var ironPrice = nonNegativePrice(ironPriceWan);
    var stonePrice = nonNegativePrice(enhanceStonePriceWan);
    if (
      stoneCount === null ||
      guidePrice === null ||
      ironPrice === null ||
      stonePrice === null
    ) {
      return null;
    }
    return guidePrice + ironPrice + stoneCount * stonePrice;
  }

  function calculateLingShiCraftCost(guidePriceWan, crystalPriceWan) {
    var guidePrice = nonNegativePrice(guidePriceWan);
    var crystalPrice = nonNegativePrice(crystalPriceWan);
    if (guidePrice === null || crystalPrice === null) return null;
    return guidePrice + crystalPrice;
  }

  globalThis.XYQCraftPrices = {
    craftCategories,
    craftLevels,
    defaultCraftPriceRecords: createCraftPriceRecords(),
    findCraftPriceRecord,
    enhanceStoneCount,
    calculateEquipmentCraftCost,
    calculateLingShiCraftCost,
  };
})();
