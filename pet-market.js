(function () {
  var defaultPetNames = ["持国巡守", "谛听", "广目巡守", "涂山瞳"];
  var growthOptionsByPet = {
    "持国巡守": [1.225, 1.237, 1.25, 1.262, 1.275],
    "多闻巡守": [1.225, 1.237, 1.25, 1.262, 1.275],
    "广目巡守": [1.225, 1.237, 1.25, 1.262, 1.275],
    "增长巡守": [1.225, 1.237, 1.25, 1.262, 1.275],
    "谛听": [1.234, 1.247, 1.26, 1.272, 1.285],
    "涂山瞳": [1.215, 1.227, 1.24, 1.252, 1.264],
    "大力金刚": [1.215, 1.227, 1.24, 1.252, 1.264],
    "龙龟": [1.225, 1.237, 1.25, 1.262, 1.275],
  };

  function getGrowthOptions(name) {
    if (Object.prototype.hasOwnProperty.call(growthOptionsByPet, name)) {
      return growthOptionsByPet[name].slice();
    }
    var merged = [];
    Object.keys(growthOptionsByPet).forEach(function (pet) {
      growthOptionsByPet[pet].forEach(function (growth) {
        if (merged.indexOf(growth) === -1) merged.push(growth);
      });
    });
    return merged.sort(function (a, b) { return a - b; });
  }

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function missingPetNames(records) {
    return defaultPetNames.filter(function (defaultName) {
      return !records.some(function (record) {
        return record.name === defaultName;
      });
    });
  }

  function createEmptyRecord(name) {
    return {
      name: name,
      wildPriceWan: null,
      skillTiers: [createEmptySkillTier()],
    };
  }

  function createEmptySkillTier() {
    return {
      skillCount: null,
      growth: null,
      gameCoinPriceWan: null,
      treasurePriceRmb: null,
    };
  }

  var defaultPetRecords = defaultPetNames.map(createEmptyRecord);

  function calculateGameCoinRmb(priceWan, goldPricePerMillion) {
    if (priceWan === null || priceWan === undefined || priceWan === "") return null;
    var price = Number(priceWan);
    var goldPrice = Number(goldPricePerMillion);
    if (
      !Number.isFinite(price) || price < 0 ||
      !Number.isFinite(goldPrice) || goldPrice <= 0
    ) return null;
    return roundCurrency(price * goldPrice / 100);
  }

  function calculatePetArbitrage({
    gameCoinPriceWan,
    wildCostWan,
    treasurePriceRmb,
    goldPricePerMillion,
    feeRate,
    feeCap,
  }) {
    var costWan = gameCoinPriceWan === null || gameCoinPriceWan === undefined || gameCoinPriceWan === ""
      ? wildCostWan
      : gameCoinPriceWan;
    var gameCoinRmb = calculateGameCoinRmb(
      costWan,
      goldPricePerMillion,
    );
    var price = Number(treasurePriceRmb);
    var rate = Number(feeRate);
    var cap = Number(feeCap);
    if (
      gameCoinRmb === null ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(cap) || cap < 0
    ) return null;

    var fee = roundCurrency(Math.min(price * rate, cap));
    var netRmb = roundCurrency(price - fee);
    return {
      gameCoinRmb: gameCoinRmb,
      fee: fee,
      netRmb: netRmb,
      profit: roundCurrency(netRmb - gameCoinRmb),
    };
  }

  globalThis.XYQPetMarket = {
    growthOptionsByPet,
    getGrowthOptions,
    defaultPetRecords: structuredClone(defaultPetRecords),
    missingPetNames,
    createEmptyRecord,
    createEmptySkillTier,
    calculateGameCoinRmb,
    calculatePetArbitrage,
  };
})();
