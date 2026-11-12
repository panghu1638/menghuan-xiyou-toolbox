(function () {
  const schemaVersion = 1;
  const arrayFields = [
    "materials",
    "opportunities",
    "goldPriceHistory",
    "stallPriceHistory",
    "stallPriceDrafts",
    "floorRecords",
    "petEquipmentDeliveryRecords",
    "fusionDeliveryRecords",
    "equipmentRecords",
    "eyePriceRecords",
    "yuanxiaoRecords",
    "craftPriceRecords",
    "petMarketRecords",
  ];
  const objectFields = [
    "stoneLevelOnePrices",
    "lingShiDecompose",
    "yuPoDecompose",
    "equipmentAdsorb",
  ];
  const numberFields = [
    "goldPriceInput",
    "goldPricePerMillion",
    "feeRate",
    "feeCap",
    "decomposeSymbolPriceWan",
    "zhenjingPriceWan",
  ];
  const stringFields = ["serverName", "goldPriceUnit"];

  function validateBackup(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("备份文件格式不对");
    }
    if (
      value.schemaVersion !== undefined &&
      value.schemaVersion !== schemaVersion
    ) {
      throw new Error("备份文件格式不对：schemaVersion 不支持");
    }

    arrayFields.forEach(function (field) {
      if (value[field] !== undefined && !Array.isArray(value[field])) {
        throw new Error(`备份文件格式不对：${field} 必须是数组`);
      }
    });
    objectFields.forEach(function (field) {
      if (
        value[field] !== undefined &&
        (!value[field] || typeof value[field] !== "object" ||
          Array.isArray(value[field]))
      ) {
        throw new Error(`备份文件格式不对：${field} 必须是对象`);
      }
    });
    numberFields.forEach(function (field) {
      if (
        value[field] !== undefined &&
        value[field] !== null &&
        (!Number.isFinite(value[field]) || value[field] < 0)
      ) {
        throw new Error(`备份文件格式不对：${field} 必须是不小于 0 的数字`);
      }
    });
    stringFields.forEach(function (field) {
      if (value[field] !== undefined && typeof value[field] !== "string") {
        throw new Error(`备份文件格式不对：${field} 必须是文本`);
      }
    });
    if (!Array.isArray(value.opportunities)) {
      throw new Error("备份文件格式不对：opportunities 必须是数组");
    }

    const normalized = structuredClone(value);
    normalized.schemaVersion = schemaVersion;
    return normalized;
  }

  globalThis.XYQDataBackup = {
    schemaVersion,
    validateBackup,
  };
})();
