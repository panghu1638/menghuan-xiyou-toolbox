(function () {
  var standardMultipliers = [1, 2, 4, 8, 16, 32, 64, 132, 296, 724];
  var gemMultipliers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  var starGemMultipliers = [1, 3, 9, 27, 81, 243, 729, 2187, 6642, 20898];
  var fiveColorMultipliers = [1, 2, 5, 12, 29, 70, 169, 408, 985, 2378];
  var spiritStoneNames = ["速度灵石", "伤害灵石", "灵力灵石", "气血灵石", "防御灵石"];

  function roundWan(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function multiplierFor(stone, level) {
    var levelIndex = level - 1;
    if (levelIndex < 0 || levelIndex >= gemMultipliers.length) return null;
    if (stone === "星辉石") return starGemMultipliers[levelIndex];
    if (stone === "五色") return fiveColorMultipliers[levelIndex];
    if (spiritStoneNames.includes(stone)) return standardMultipliers[levelIndex];
    return gemMultipliers[levelIndex];
  }

  function calculateStonePrice(stone, levelOnePriceWan, level) {
    var price = Number(levelOnePriceWan);
    var multiplier = multiplierFor(stone, level);
    if (!Number.isFinite(price) || price < 0 || multiplier === null) return null;
    return price * multiplier;
  }

  function calculateGemRmbProceeds(
    costWan,
    goldPricePerMillion,
    feeRate,
    feeCap,
  ) {
    var priceWan = Number(costWan);
    var goldPrice = Number(goldPricePerMillion);
    var rate = Number(feeRate);
    var cap = Number(feeCap);
    if (
      !Number.isFinite(priceWan) || priceWan < 0 ||
      !Number.isFinite(goldPrice) || goldPrice <= 0 ||
      !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(cap) || cap < 0
    ) return null;

    var rmb = priceWan * goldPrice / 100;
    var fee = Math.min(rmb * rate, cap);
    return { rmb: rmb, fee: fee, netRmb: rmb - fee };
  }

  function calculateLingShiBreakEven({
    stoneCount,
    stoneLevel,
    levelOnePriceWan,
    symbolCount,
    symbolPriceWan,
  }) {
    var count = Number(stoneCount);
    var level = Number(stoneLevel);
    var price = Number(levelOnePriceWan);
    var symbols = Number(symbolCount);
    var symbolPrice = Number(symbolPriceWan);
    if (
      !Number.isInteger(count) || count <= 0 ||
      !Number.isInteger(level) || level < 1 || level > 10 ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(symbols) || symbols <= 0 ||
      !Number.isFinite(symbolPrice) || symbolPrice < 0
    ) return null;

    var multiplier = multiplierFor("星辉石", level);
    var equivalentCount = count * multiplier;
    var grossWan = equivalentCount * price;
    var symbolCostWan = symbols * symbolPrice;
    return {
      equivalentCount: equivalentCount,
      grossWan: grossWan,
      symbolCostWan: symbolCostWan,
      maxCostWan: grossWan - symbolCostWan,
    };
  }

  function calculateYuPoBreakEven({
    dustPriceWan,
    symbolPriceWan,
  }) {
    var price = Number(dustPriceWan);
    var symbolPrice = Number(symbolPriceWan);
    if (
      !Number.isFinite(price) || price <= 0 ||
      !Number.isFinite(symbolPrice) || symbolPrice < 0
    ) return null;

    var dustRevenueWan = 3 * price;
    var symbolCostWan = 6 * symbolPrice;
    return {
      dustCount: 3,
      symbolCount: 6,
      dustRevenueWan: roundWan(dustRevenueWan),
      symbolCostWan: roundWan(symbolCostWan),
      maxCostWan: roundWan(dustRevenueWan - symbolCostWan),
    };
  }

  function calculateEquipmentAdsorbBreakEven({
    adsorbCount,
    symbolCount,
    adsorbPriceWan,
    symbolPriceWan,
  }) {
    var adsorbs = Number(adsorbCount);
    var symbols = Number(symbolCount);
    var adsorbPrice = Number(adsorbPriceWan);
    var symbolPrice = Number(symbolPriceWan);
    if (
      !Number.isInteger(adsorbs) || adsorbs <= 0 ||
      !Number.isInteger(symbols) || symbols <= 0 ||
      !Number.isFinite(adsorbPrice) || adsorbPrice < 0 ||
      !Number.isFinite(symbolPrice) || symbolPrice < 0
    ) return null;

    var adsorbRevenueWan = adsorbs * adsorbPrice;
    var symbolCostWan = symbols * symbolPrice;
    return {
      adsorbRevenueWan: roundWan(adsorbRevenueWan),
      symbolCostWan: roundWan(symbolCostWan),
      maxCostWan: roundWan(adsorbRevenueWan - symbolCostWan),
    };
  }

  globalThis.XYQSpiritStones = {
    calculateStonePrice,
    calculateGemRmbProceeds,
    calculateLingShiBreakEven,
    calculateYuPoBreakEven,
    calculateEquipmentAdsorbBreakEven,
    stoneMultiplier: multiplierFor,
    defaultStoneCatalog: [
      {
        tier: "一梯队 · 精魄灵石",
        rmbFromLevel: 9,
        stones: [
          { name: "速度灵石" },
          { name: "伤害灵石" },
          { name: "灵力灵石" },
          { name: "气血灵石" },
          { name: "防御灵石" },
        ],
      },
      {
        tier: "二梯队 · 其他宝石",
        rmbFromLevel: 1,
        stones: [
          { name: "五色" },
          { name: "月亮石" },
          { name: "光芒石" },
          { name: "黑宝石" },
          { name: "太阳石" },
          { name: "红玛瑙" },
          { name: "舍利子" },
          { name: "翡翠石" },
          { name: "星辉石" },
        ],
      },
    ],
    defaultLevelOnePrices: {
      速度灵石: 0,
      伤害灵石: 0,
      灵力灵石: 0,
      气血灵石: 0,
      防御灵石: 0,
      五色: 42.5,
      月亮石: 0,
      光芒石: 0,
      黑宝石: 15.7,
      太阳石: 8.8,
      红玛瑙: 9,
      舍利子: 0,
      翡翠石: 0,
      星辉石: 14.6,
    },
    defaultLingShiDecompose: {
      levelOnePriceWan: 14.5,
      records: [
        { level: 60, stoneLevel: 1, stoneCount: 4, symbolCount: 4 },
        { level: 80, stoneLevel: 2, stoneCount: 2, symbolCount: 6 },
        { level: 100, stoneLevel: 2, stoneCount: 3, symbolCount: 8 },
      ],
    },
    defaultDecomposeSymbolPriceWan: 0.1,
    defaultYuPoDecompose: {
      dustPriceWan: null,
      dustCount: 3,
      symbolCount: 6,
    },
    defaultEquipmentAdsorb: {
      adsorbPriceWan: 5,
      records: [
        { level: 100, adsorbCount: 3, symbolCount: 6 },
        { level: 110, adsorbCount: 3, symbolCount: 7 },
        { level: 120, adsorbCount: 3, symbolCount: 12 },
        { level: 130, adsorbCount: 4, symbolCount: 16 },
        { level: 140, adsorbCount: 4, symbolCount: 23 },
      ],
    },
  };
})();
