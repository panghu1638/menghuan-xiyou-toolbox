(function () {
  var standardMultipliers = [1, 2, 4, 8, 16, 32, 64, 132, 296, 724];
  var gemMultipliers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  var starGemMultipliers = [1, 3, 9, 27, 81, 243, 729, 2187, 6642, 20898];
  var fiveColorMultipliers = [1, 2, 5, 12, 29, 70, 169, 408, 985, 2378];
  var spiritStoneNames = ["速度灵石", "伤害灵石", "灵力灵石", "气血灵石", "防御灵石"];

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

  globalThis.XYQSpiritStones = {
    calculateStonePrice,
    stoneMultiplier: multiplierFor,
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
  };
})();
