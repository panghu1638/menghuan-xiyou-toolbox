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

  function createRecordFromCombo(combo, characters, lastCharacter) {
    var record = createEmptyRecord(characters, lastCharacter);
    var source = combo && typeof combo === "object" ? combo : {};
    record.embryoCombo = [normalizedText(source.main), normalizedText(source.sub)]
      .filter(Boolean)
      .join(" + ");
    record.result = normalizedText(source.target);
    return record;
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

  var defaultComboRecords = [
    { stage: "early", main: "画魂", sub: "持国巡守", target: "须弥画魂" },
    { stage: "early", main: "泪妖", sub: "持国巡守", target: "须弥泪妖" },
    { stage: "early", main: "须弥宠", sub: "出奇制胜宠", target: "少技能出奇须弥" },
    { stage: "late", main: "少技能出奇须弥", sub: "多技能胚子", target: "多技能出奇须弥" },
    { stage: "late", main: "净台妙谛宠", sub: "多技能胚子", target: "多技能净台妙谛" },
  ];

  function normalizeStage(value) {
    return value === "late" ? "late" : "early";
  }

  function createEmptyCombo(stage) {
    return { stage: normalizeStage(stage), main: "", sub: "", target: "" };
  }

  function migrateComboRecords(records) {
    if (!Array.isArray(records)) return structuredClone(defaultComboRecords);
    return records.map(function (record) {
      var source = record && typeof record === "object" ? record : {};
      return {
        stage: normalizeStage(source.stage),
        main: normalizedText(source.main),
        sub: normalizedText(source.sub),
        target: normalizedText(source.target),
      };
    });
  }

  globalThis.XYQPetFusionTimes = {
    createEmptyRecord,
    createRecordFromCombo,
    migrateRecords,
    defaultComboRecords,
    createEmptyCombo,
    migrateComboRecords,
    shichenFromDeliveryTime: XYQFloorMarket.shichenFromDeliveryTime,
  };
})();
