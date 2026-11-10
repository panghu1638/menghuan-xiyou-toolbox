(function () {
  function calculateZhenjingRmb(priceWan, goldPricePerMillion) {
    if (priceWan === null || priceWan === undefined) return null;
    if (!Number.isFinite(goldPricePerMillion) || goldPricePerMillion <= 0) return null;
    return priceWan * goldPricePerMillion / 100;
  }

  globalThis.XYQFestivalItems = {
    calculateZhenjingRmb,
    defaultYuanxiaoRecords: [
      { name: "攻击元宵", priceWan: null },
      { name: "防御元宵", priceWan: null },
      { name: "速度元宵", priceWan: null },
      { name: "躲闪元宵", priceWan: null },
      { name: "体力元宵", priceWan: null },
      { name: "法力元宵", priceWan: null },
    ],
    defaultZhenjingPriceWan: null,
  };
})();
