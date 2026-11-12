(function () {
  var equipmentSpecifications = {
    护腕: {
      stallPrices: { 45: 68, 46: 78, 47: 98, 48: 148, 49: 300, 50: 300, 51: 390, 52: 450, 53: 499, 54: 550, 55: 600, 56: 650, 57: 700, 60: 2200 },
      treasurePrices: { 49: 14, 50: 20, 51: 25, 52: 26, 53: 32, 54: 35, 55: 48, 56: 55, 57: 71, 58: 114, 59: 133, 60: 188 },
    },
    项圈: {
      stallPrices: { 45: 150, 46: 188, 47: 260, 48: 300, 49: 400, 50: 450, 51: 450, 52: 480, 53: 500, 54: 555, 55: 699, 56: 799, 57: 855, 58: 999, 65: 12 },
      treasurePrices: { 49: 18, 50: 30, 51: 33, 52: 39, 53: 40, 54: 42, 55: 46, 56: 50, 57: 62, 58: 74, 59: 75, 60: 136 },
    },
    衣服: {
      stallPrices: { 45: 99, 46: 120, 47: 140, 48: 249, 49: 299, 50: 288, 51: 359, 52: 500, 53: 550, 54: 600, 55: 650, 56: 699, 57: 950, 59: 1150 },
      treasurePrices: { 51: 20, 52: 23.8, 53: 27, 54: 32, 55: 42, 56: 52, 57: 54, 58: 70, 59: 83, 60: 138 },
    },
  };

  var eyeSpecifications = {
    "115三眼天珠": Array.from({ length: 21 }, (_, index) => 80 + index),
    "115九眼天珠": Array.from({ length: 21 }, (_, index) => 80 + index),
    "125三眼天珠": Array.from({ length: 20 }, (_, index) => 80 + index),
    "125九眼天珠": Array.from({ length: 20 }, (_, index) => 80 + index),
    "105三眼天珠": Array.from({ length: 31 }, (_, index) => 70 + index),
    "105九眼天珠": Array.from({ length: 31 }, (_, index) => 70 + index),
  };

  function createEquipmentRecords() {
    return Object.entries(equipmentSpecifications).flatMap(function ([category, specification]) {
      return Array.from({ length: 21 }, function (_, index) {
        var damage = index + 45;
        return {
          category: category,
          damage: damage,
          stallPriceWan: specification.stallPrices[damage] ?? null,
          treasurePriceRmb: specification.treasurePrices[damage] ?? null,
        };
      });
    });
  }

  function createEyePriceRecords() {
    return Object.entries(eyeSpecifications).flatMap(function ([name, powers]) {
      var level = Number(name.slice(0, 3));
      var type = name.slice(3);
      return powers.map(function (power) {
        return {
          level: level,
          type: type,
          power: Number(power),
          priceWan: null,
        };
      });
    });
  }

  function findEquipmentRecord(records, category, damage) {
    return records.find(function (record) {
      return record.category === category && record.damage === damage;
    }) || null;
  }

  function findEyePriceRecord(records, level, type, power) {
    return records.find(function (record) {
      return record.level === level && record.type === type && record.power === power;
    }) || null;
  }

  function nonNegativeNumber(value) {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function calculateEquipmentArbitrage(options) {
    var stallPriceWan = nonNegativeNumber(options.stallPriceWan);
    var treasurePriceRmb = nonNegativeNumber(options.treasurePriceRmb);
    var goldPricePerMillion = nonNegativeNumber(options.goldPricePerMillion);
    var feeRate = nonNegativeNumber(options.feeRate);
    var feeCap = nonNegativeNumber(options.feeCap);
    if (
      stallPriceWan === null || treasurePriceRmb === null || goldPricePerMillion === null ||
      feeRate === null || feeCap === null || goldPricePerMillion === 0
    ) return null;

    var stallCostRmb = stallPriceWan * goldPricePerMillion / 100;
    var fee = Math.min(treasurePriceRmb * feeRate, feeCap);
    var netProceeds = treasurePriceRmb - fee;
    return {
      stallCostRmb: stallCostRmb,
      fee: fee,
      netProceeds: netProceeds,
      profit: netProceeds - stallCostRmb,
    };
  }

  globalThis.XYQEquipmentPrices = {
    calculateEquipmentArbitrage,
    defaultEquipmentRecords: createEquipmentRecords(),
    defaultEyeNotes: [
      { source: "105三九眼", label: "40–50", price: 18.8 },
      { source: "105三九眼", label: "60+", price: 30 },
      { source: "125九眼", label: "灵力50", price: 99 },
    ],
    defaultEyePriceRecords: createEyePriceRecords(),
    findEquipmentRecord,
    findEyePriceRecord,
  };
})();
