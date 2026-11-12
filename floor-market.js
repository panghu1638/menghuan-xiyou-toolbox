(function () {
  const records = [
    { name: "苍茫远古家园", price: 300, saleTimes: "14.28" },
    { name: "齐天宴家园", price: 666, saleTimes: "11.07、21.36" },
    { name: "海之蔚蓝石砖", price: 666, saleTimes: "23.05、23.27、13.28" },
    { name: "绮夜舞会家园", price: 666, saleTimes: "0.26、19.57" },
    { name: "墨金曜光家园", price: 1288, saleTimes: "16.21、23.26、0.15、20.37" },
    { name: "浓情蜜意家园地板", price: 666, saleTimes: "1.55、20.37" },
    { name: "叮当猫欢乐童年地板", price: 666, saleTimes: "16.05、01.37、16.56" },
    { name: "青丘魅影家园", price: 1280, saleTimes: "01.56、0.52、23.55" },
    { name: "卧云月家园", price: 2888, saleTimes: "20.55、18.05、0.38" },
    { name: "雪之缘冰天雪地地板", price: 2888, saleTimes: "17.05、0.27、18.18" },
    { name: "云朵朵彩虹家园地板", price: 666, saleTimes: "1100、0.57、01.27、23.46、0.36" },
    { name: "玲珑兔梦幻家园", price: 666, saleTimes: "0.28" },
    { name: "情系千年家园", price: 1288, saleTimes: "0.22" },
    { name: "绿野仙踪地板", price: 0, saleTimes: "18.2" },
  ];
  const nameAliases = {
    "远古": "苍茫远古家园",
    "齐天": "齐天宴家园",
    "海洋": "海之蔚蓝石砖",
    "绮梦舞会": "绮夜舞会家园",
    "黑金": "墨金曜光家园",
    "浓情蜜意": "浓情蜜意家园地板",
    "叮当猫": "叮当猫欢乐童年地板",
    "青丘": "青丘魅影家园",
    "卧云": "卧云月家园",
    "雪之源": "雪之缘冰天雪地地板",
    "云朵": "云朵朵彩虹家园地板",
    "兔子": "玲珑兔梦幻家园",
    "情系千年": "情系千年家园",
    "绿野仙踪": "绿野仙踪地板",
  };
  const retiredFloorNames = ["血之源"];

  function createFloorRecord({ name, price, saleTimes }) {
    const floorName = typeof name === "string" ? name.trim() : "";
    if (!floorName) throw new Error("地板名称不能为空");

    const floorPrice = Number(price);
    if (!Number.isFinite(floorPrice) || floorPrice < 0) {
      throw new Error("地板价格必须是不小于 0 的数字");
    }
    if (typeof saleTimes !== "string") {
      throw new Error("出货时间必须是文本");
    }

    return {
      name: floorName,
      price: floorPrice,
      saleTimes: saleTimes.trim(),
    };
  }

  function normalizeSaleTimeSeparators(value) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return "";

    const normalized = text
      .replace(/[、，,;；/／\r\n\t]+/g, "、")
      .replace(/[ \u3000]+/g, "、")
      .replace(/(\d{1,2}月\d{1,2}日)、/g, "$1 ")
      .replace(/(\d{1,2}月\d{1,2}日)(?=\d)/g, "$1 ")
      .replace(/、+/g, "、")
      .replace(/^[、\s]+|[、\s]+$/g, "");

    return normalized ? normalized.replace(/、\s*/g, "、 ") : "";
  }

  function formatSaleTimes(value, now) {
    const spaced = normalizeSaleTimeSeparators(value);
    if (!spaced) return "";

    const current = now instanceof Date ? now : new Date();
    if (/\d{1,2}月\d{1,2}日/.test(spaced) || !/\d/.test(spaced)) {
      return spaced;
    }

    return current.getMonth() + 1 + "月" + current.getDate() + "日 " + spaced;
  }

  function stripSaleTimeDates(value) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return "";

    return normalizeSaleTimeSeparators(
      text.replace(/\d{1,2}月\d{1,2}日/g, " "),
    );
  }

  const shichenNames = [
    "子时",
    "丑时",
    "寅时",
    "卯时",
    "辰时",
    "巳时",
    "午时",
    "未时",
    "申时",
    "酉时",
    "戌时",
    "亥时",
  ];

  function shichenFromDeliveryTime(value) {
    var timeMatches = String(value || "").trim().match(/\d{1,2}[.：:]\d{1,2}/g) || [];
    if (!timeMatches.length) return "—";

    return timeMatches.map(function (timeMatch) {
      var timeParts = timeMatch.split(/[.：:]/).map(Number);
      var hour = timeParts[0];
      var minute = timeParts[1];
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "—";

      var minuteInCycle = (hour * 60 + minute) % 30;
      return shichenNames[Math.floor(minuteInCycle / 2.5)];
    }).join("、");
  }

  function migrateFloorRecordSaleTimes(records, now) {
    if (!Array.isArray(records)) return records;

    return records.map(function (record) {
      if (!record || typeof record !== "object") return record;
      return Object.assign({}, record, {
        saleTimes: stripSaleTimeDates(record.saleTimes),
        deliveryTimes: formatSaleTimes(record.deliveryTimes, now),
      });
    });
  }

  function migrateFloorRecordNames(records) {
    return records
      .filter(function (record) {
        return !record || typeof record.name !== "string" || !retiredFloorNames.includes(record.name.trim());
      })
      .map(function (record) {
      if (!record || typeof record.name !== "string") return record;
      return Object.assign({}, record, {
        name: nameAliases[record.name.trim()] || record.name,
      });
      });
  }

  globalThis.XYQFloorMarket = {
    createFloorRecord,
    defaultFloorRecords: structuredClone(records),
    formatSaleTimes,
    migrateFloorRecordNames,
    migrateFloorRecordSaleTimes,
    shichenFromDeliveryTime,
    stripSaleTimeDates,
  };
})();
