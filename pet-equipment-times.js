(function () {
  var categories = ["护腕", "项圈", "衣服", "其他"];

  function normalizedText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function addCharacter(characters, value) {
    var character = normalizedText(value);
    if (character && !characters.includes(character)) {
      characters.push(character);
    }
  }

  function normalizeCharacters(characters, records) {
    var normalized = [];
    (Array.isArray(characters) ? characters : []).forEach(function (character) {
      addCharacter(normalized, character);
    });
    (Array.isArray(records) ? records : []).forEach(function (record) {
      addCharacter(normalized, record && record.character);
    });
    return normalized;
  }

  function normalizeDamage(value) {
    if (value === null || value === undefined || value === "") return null;
    var damage = Number(value);
    return Number.isFinite(damage) && damage >= 0 ? damage : null;
  }

  function normalizeRecord(record, characters) {
    var source = record && typeof record === "object" ? record : {};
    var character = normalizedText(source.character);
    if (!characters.includes(character)) character = "";

    return {
      character: character,
      category: categories.includes(source.category) ? source.category : "其他",
      damage: normalizeDamage(source.damage),
      attributes: normalizedText(source.attributes),
      deliveryTime: normalizedText(source.deliveryTime),
      shichen: XYQFloorMarket.shichenFromDeliveryTime(normalizedText(source.deliveryTime)),
    };
  }

  function migratePetEquipmentRecords(records, characters) {
    var normalizedCharacters = normalizeCharacters(characters, records);
    return {
      characters: normalizedCharacters,
      records: (Array.isArray(records) ? records : []).map(function (record) {
        return normalizeRecord(record, normalizedCharacters);
      }),
    };
  }

  function createEmptyRecord(characters) {
    return {
      character: (Array.isArray(characters) && characters[0]) || "",
      category: categories[0],
      damage: null,
      attributes: "",
      deliveryTime: "",
      shichen: "",
    };
  }

  function removeCharacter(characters, records, name) {
    var removed = normalizedText(name);
    return {
      characters: (Array.isArray(characters) ? characters : []).filter(
        function (character) {
          return normalizedText(character) !== removed;
        },
      ),
      records: (Array.isArray(records) ? records : []).map(function (record) {
        if (!record || typeof record !== "object") return record;
        if (normalizedText(record.character) !== removed) return record;
        return Object.assign({}, record, { character: "" });
      }),
    };
  }

  globalThis.XYQPetEquipmentTimes = {
    categories,
    createEmptyRecord,
    migratePetEquipmentRecords,
    removeCharacter,
  };
})();
