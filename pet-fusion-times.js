(function () {
  function normalizedText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeCharacter(value) {
    return XYQPetEquipmentTimes.normalizeCharacter(value);
  }

  function createEmptyRecord(characters, lastCharacter) {
    var last = normalizedText(lastCharacter);
    return {
      character:
        Array.isArray(characters) && characters.includes(last)
          ? last
          : (characters && characters[0]) || "",
      embryoCombo: "",
      result: "",
      deliveryTime: "",
      shichen: "",
    };
  }

  function migrateRecords(records, characters) {
    var savedCharacters = Array.isArray(characters) ? characters : [];
    return (Array.isArray(records) ? records : []).map(function (record) {
      var source = record && typeof record === "object" ? record : {};
      var character = normalizeCharacter(source.character);
      var deliveryTime = normalizedText(source.deliveryTime);
      return {
        character: savedCharacters.includes(character) ? character : "",
        embryoCombo: normalizedText(source.embryoCombo),
        result: normalizedText(source.result),
        deliveryTime: deliveryTime,
        shichen: XYQFloorMarket.shichenFromDeliveryTime(deliveryTime),
      };
    });
  }

  globalThis.XYQPetFusionTimes = {
    createEmptyRecord,
    migrateRecords,
    shichenFromDeliveryTime: XYQFloorMarket.shichenFromDeliveryTime,
  };
})();
