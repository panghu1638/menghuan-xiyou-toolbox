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
    "115三眼": {
      80: null, 81: null, 82: null, 83: null, 84: null, 85: null, 86: null, 87: null,
      88: null, 89: null, 90: null, 91: null, 92: null, 93: null, 94: null, 95: 100,
      96: 88, 97: 99, 98: 110, 99: 130, 100: 150,
    },
    "115九眼": {
      80: 100, 81: 110, 82: 120, 83: 130, 84: 140, 85: 150, 86: 160, 87: 170,
      88: 180, 89: 190, 90: 200, 91: 210, 92: 220, 93: 230, 94: 240, 95: 250,
      96: 260, 97: 268, 98: 350, 99: 399, 100: 599,
    },
    "125三眼": {
      80: 100, 81: 110, 82: 120, 83: 130, 84: 140, 85: 150, 86: 160, 87: 170,
      88: 180, 89: 190, 90: 199, 91: 220, 92: 240, 93: 250, 94: 260, 95: 280,
      96: 299, 97: null, 98: 340, 99: 360,
    },
    "125九眼": {
      80: 450, 81: 480, 82: 500, 83: 530, 84: null, 85: null, 86: 450, 87: 460,
      88: 470, 89: 480, 90: 500, 91: 555, 92: 580, 93: 600, 94: 620, 95: 650,
      96: 695, 97: 799, 98: 899, 99: 950,
    },
    "105三眼": {
      70: null, 71: null, 72: null, 73: null, 74: null, 75: null, 76: null, 77: null,
      78: null, 79: null, 80: null, 81: null, 82: null, 83: null, 84: null, 85: null,
      86: null, 87: null, 88: 28, 89: 28, 90: null, 91: 31, 92: null, 93: 33, 94: null,
      95: null, 96: null, 97: null, 98: null, 99: null, 100: null,
    },
    "105九眼": {
      70: 45, 71: 45, 72: 45, 73: 45, 74: 45, 75: 45, 76: 45, 77: 45, 78: 45, 79: 45,
      80: 55, 81: 55, 82: 55, 83: 55, 84: 55, 85: 55, 86: 55, 87: 55, 88: 55, 89: 55,
      90: 90, 91: 90, 92: 90, 93: 95, 94: 95, 95: 100, 96: 110, 97: 120, 98: 130,
      99: 140, 100: 160,
    },
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
      return Object.entries(powers).map(function ([power, price]) {
        return {
          level: level,
          type: type,
          power: Number(power),
          priceWan: price,
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
