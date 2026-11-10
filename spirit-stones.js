(function () {
  var standardMultipliers = [1, 2, 4, 8, 16, 32, 64, 132, 296, 724];
  var fiveColorMultipliers = [1, 2, 5, 12, 29, 70, 169, 408, 985, 2378];
  var spiritStoneNames = ["速度灵石", "伤害灵石", "灵力灵石", "气血灵石", "防御灵石"];
  var attributeBases = {
    速度: 9,
    伤害: 9,
    灵力: 7.5,
    气血: 8,
    防御: 5,
  };

  function multiplierFor(stone, level) {
    var levelIndex = level - 1;
    if (levelIndex < 0 || levelIndex >= standardMultipliers.length) return null;
    if (stone === "星辉石") return Math.pow(3, levelIndex);
    if (stone === "五色") return fiveColorMultipliers[levelIndex];
    if (spiritStoneNames.includes(stone)) return standardMultipliers[levelIndex];
    return standardMultipliers[levelIndex];
  }

  function attributeValues(attribute, level) {
    var base = attributeBases[attribute];
    var multiplier = base === undefined ? null : multiplierFor(attribute, level);
    return base === undefined || multiplier === null ? null : base * multiplier;
  }

  function calculateStonePrice(stone, levelOnePriceWan, level) {
    var price = Number(levelOnePriceWan);
    var multiplier = multiplierFor(stone, level);
    if (!Number.isFinite(price) || price < 0 || multiplier === null) return null;
    return price * multiplier;
  }

  function calculateStoneArbitrage(options) {
    var costWan = calculateStonePrice(
      options.stone,
      options.levelOnePriceWan,
      options.targetLevel,
    );
    var treasurePriceRmb = Number(options.treasurePriceRmb);
    var goldPricePerMillion = Number(options.goldPricePerMillion);
    var feeRate = Number(options.feeRate);
    var feeCap = Number(options.feeCap);
    if (
      costWan === null || !Number.isFinite(treasurePriceRmb) ||
      treasurePriceRmb < 0 || !Number.isFinite(goldPricePerMillion) ||
      goldPricePerMillion <= 0 || !Number.isFinite(feeRate) || feeRate < 0 ||
      !Number.isFinite(feeCap) || feeCap < 0
    ) return null;

    var costRmb = costWan * goldPricePerMillion / 100;
    var fee = Math.min(treasurePriceRmb * feeRate, feeCap);
    return {
      costWan: costWan,
      costRmb: costRmb,
      fee: fee,
      netProceeds: treasurePriceRmb - fee,
      profit: treasurePriceRmb - fee - costRmb,
    };
  }

  globalThis.XYQSpiritStones = {
    attributeValues,
    calculateStoneArbitrage,
    calculateStonePrice,
    stoneMultiplier: multiplierFor,
    defaultComparisonRecords: [
      { attribute: "速度", stone: "速度灵石", sourceStone: "黑宝石", treasurePriceRmb: 599 },
      { attribute: "伤害", stone: "伤害灵石", sourceStone: "太阳石", treasurePriceRmb: 565 },
      { attribute: "灵力", stone: "灵力灵石", sourceStone: "玛瑙", treasurePriceRmb: 387 },
      { attribute: "气血", stone: "气血灵石", sourceStone: "星辉石", treasurePriceRmb: 556 },
      { attribute: "防御", stone: "防御灵石", sourceStone: "五色", treasurePriceRmb: 288 },
    ],
    defaultStoneCatalog: [
      {
        tier: "一梯队 · 精魄灵石",
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
        stones: [
          { name: "星辉石" },
          { name: "玛瑙" },
          { name: "黑宝石" },
          { name: "太阳石" },
          { name: "五色" },
        ],
      },
    ],
    defaultLevelOnePrices: {
      速度灵石: 0,
      伤害灵石: 0,
      灵力灵石: 0,
      气血灵石: 0,
      防御灵石: 0,
      星辉石: 14.6,
      玛瑙: 9,
      黑宝石: 15.7,
      太阳石: 8.8,
      五色: 42.5,
    },
  };
})();
