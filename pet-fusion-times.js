(function () {
  function normalizedText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function createEmptyRecord(characters) {
    return {
      character: (Array.isArray(characters) && characters[0]) || "",
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
      var character = normalizedText(source.character);
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
