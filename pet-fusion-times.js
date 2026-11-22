(function () {
  function normalizedText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeCharacter(value) {
    return XYQPetEquipmentTimes.normalizeCharacter(value);
  }

  function normalizeAttemptDate(value) {
    var date = typeof value === "string" ? value.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
    var parsed = new Date(date + "T00:00:00");
    return parsed.getFullYear() + "-" +
      String(parsed.getMonth() + 1).padStart(2, "0") + "-" +
      String(parsed.getDate()).padStart(2, "0") === date
      ? date
      : "";
  }

  function localDateString(now) {
    var current = now instanceof Date ? now : new Date();
    return current.getFullYear() + "-" +
      String(current.getMonth() + 1).padStart(2, "0") + "-" +
      String(current.getDate()).padStart(2, "0");
  }

  function attemptDateFromDeliveryTime(value) {
    var match = normalizedText(value).match(/(\d{1,2})月(\d{1,2})日/);
    if (!match) return "";
    var current = new Date();
    return normalizeAttemptDate(
      current.getFullYear() + "-" +
        String(Number(match[1])).padStart(2, "0") + "-" +
        String(Number(match[2])).padStart(2, "0"),
    );
  }

  function createEmptyRecord(characters, lastCharacter, now) {
    var last = normalizedText(lastCharacter);
    return {
      character:
        Array.isArray(characters) && characters.includes(last)
          ? last
          : (characters && characters[0]) || "",
      attemptDate: localDateString(now),
      embryoCombo: "",
      result: "",
      success: false,
      successSub: false,
      wild: false,
      fullSkills: false,
      deliveryTime: "",
      shichen: "",
    };
  }

  function createRecordFromCombo(combo, characters, lastCharacter, now) {
    var record = createEmptyRecord(characters, lastCharacter, now);
    var source = combo && typeof combo === "object" ? combo : {};
    record.embryoCombo = [normalizedText(source.main), normalizedText(source.sub)]
      .filter(Boolean)
      .join(" + ");
    record.result = normalizedText(source.target);
    return record;
  }

  function createEmptyRecords(count, characters, lastCharacter, now) {
    var total = Number(count);
    if (!Number.isFinite(total) || total < 0) total = 0;
    return Array.from(
      { length: Math.floor(total) },
      function () {
        return createEmptyRecord(characters, lastCharacter, now);
      },
    );
  }

  function migrateRecords(records, characters) {
    var savedCharacters = Array.isArray(characters) ? characters : [];
    return (Array.isArray(records) ? records : []).map(function (record) {
      var source = record && typeof record === "object" ? record : {};
      var character = normalizeCharacter(source.character);
      var deliveryTime = normalizedText(source.deliveryTime);
      var attemptDate = normalizeAttemptDate(source.attemptDate) ||
        attemptDateFromDeliveryTime(deliveryTime);
      var success = source.success === true;
      var successSub = source.successSub === true;
      var wild = source.wild === true;
      var fullSkills = source.fullSkills === true;
      return {
        character: savedCharacters.includes(character) ? character : "",
        attemptDate,
        embryoCombo: normalizedText(source.embryoCombo),
        result: normalizedText(source.result),
        success,
        successSub,
        wild,
        fullSkills,
        deliveryTime: deliveryTime,
        shichen: XYQFloorMarket.shichenFromDeliveryTime(deliveryTime),
      };
    });
  }

  function filterRecordsByRange(records, range, now) {
    var list = Array.isArray(records) ? records : [];
    if (range === "all") return list;

    var today = localDateString(now);
    var month = today.slice(0, 7);
    return list.filter(function (record) {
      var date = normalizeAttemptDate(record && record.attemptDate);
      if (range === "month") return date.slice(0, 7) === month;
      return date === today;
    });
  }

  function summarizeRecords(records) {
    var summaries = [];
    var summaryByCombo = new Map();

    (Array.isArray(records) ? records : []).forEach(function (record) {
      var source = record && typeof record === "object" ? record : {};
      var embryoCombo = normalizedText(source.embryoCombo);
      if (!embryoCombo) return;

      var summary = summaryByCombo.get(embryoCombo);
      if (!summary) {
        summary = {
          embryoCombo,
          attempts: 0,
          successes: 0,
          successSubs: 0,
          wilds: 0,
          fullSkills: 0,
          successRate: null,
        };
        summaryByCombo.set(embryoCombo, summary);
        summaries.push(summary);
      }
      summary.attempts += 1;
      if (source.success === true) summary.successes += 1;
      if (source.successSub === true) summary.successSubs += 1;
      if (source.wild === true) summary.wilds += 1;
      if (source.fullSkills === true) summary.fullSkills += 1;
    });

    summaries.forEach(function (summary) {
      summary.successRate = summary.attempts
        ? summary.successes / summary.attempts
        : null;
    });
    return summaries;
  }

  var legacyDefaultComboRecordSets = [
    [
      { stage: "early", main: "画魂", sub: "持国巡守", target: "须弥画魂" },
      { stage: "early", main: "泪妖", sub: "持国巡守", target: "须弥泪妖" },
      { stage: "early", main: "须弥宠", sub: "出奇制胜宠", target: "少技能出奇须弥" },
      { stage: "late", main: "少技能出奇须弥", sub: "多技能胚子", target: "多技能出奇须弥" },
      { stage: "late", main: "净台妙谛宠", sub: "多技能胚子", target: "多技能净台妙谛" },
    ],
    [
      { stage: "early", main: "画魂", sub: "持国巡守", target: "6–7技能须弥画魂" },
      { stage: "early", main: "泪妖", sub: "持国巡守", target: "6–7技能须弥泪妖" },
      { stage: "late", main: "6–7技能须弥", sub: "4技能出奇自在心猿", target: "须弥出奇自在心猿" },
      { stage: "late", main: "6–7技能须弥", sub: "4技能出奇人形翼马", target: "须弥出奇人形翼马" },
    ],
    [
      {
        stage: "early",
        main: "6–7技能须弥自在心猿",
        sub: "4–5技能出其不意自在心猿",
        target: "6–7技能双特殊自在心猿",
      },
      {
        stage: "early",
        main: "6–7技能须弥人形翼马",
        sub: "4–5技能出其不意人形翼马",
        target: "6–7技能双特殊人形翼马",
      },
      {
        stage: "late",
        main: "8–10技能须弥自在心猿",
        sub: "6–8技能出其不意自在心猿",
        target: "8技能以上双特殊自在心猿",
      },
      {
        stage: "late",
        main: "8–10技能须弥人形翼马",
        sub: "6–8技能出其不意人形翼马",
        target: "8技能以上双特殊人形翼马",
      },
    ],
  ];

  var defaultComboRecords = [
    {
      stage: "early",
      main: "6–7须弥心猿",
      sub: "4–5出其心猿",
      target: "6–7双特殊心猿",
    },
    {
      stage: "early",
      main: "6–7须弥人马",
      sub: "4–5出其人马",
      target: "6–7双特殊人马",
    },
    {
      stage: "late",
      main: "8–10须弥心猿",
      sub: "6–8出其心猿",
      target: "8+双特殊心猿",
    },
    {
      stage: "late",
      main: "8–10须弥人马",
      sub: "6–8出其人马",
      target: "8+双特殊人马",
    },
  ];

  function normalizeStage(value) {
    return value === "late" ? "late" : "early";
  }

  function createEmptyCombo(stage) {
    return { stage: normalizeStage(stage), main: "", sub: "", target: "" };
  }

  function comboRecordsMatch(first, second) {
    return first.length === second.length &&
      first.every(function (combo, index) {
        var other = second[index];
        return combo.stage === other.stage &&
          combo.main === other.main &&
          combo.sub === other.sub &&
          combo.target === other.target;
      });
  }

  function migrateComboRecords(records) {
    if (!Array.isArray(records)) return structuredClone(defaultComboRecords);
    var normalized = records.map(function (record) {
      var source = record && typeof record === "object" ? record : {};
      return {
        stage: normalizeStage(source.stage),
        main: normalizedText(source.main),
        sub: normalizedText(source.sub),
        target: normalizedText(source.target),
      };
    });
    return legacyDefaultComboRecordSets.some(function (legacy) {
      return comboRecordsMatch(normalized, legacy);
    })
      ? structuredClone(defaultComboRecords)
      : normalized;
  }

  globalThis.XYQPetFusionTimes = {
    createEmptyRecord,
    createEmptyRecords,
    createRecordFromCombo,
    migrateRecords,
    filterRecordsByRange,
    summarizeRecords,
    defaultComboRecords,
    createEmptyCombo,
    migrateComboRecords,
    shichenFromDeliveryTime: XYQFloorMarket.shichenFromDeliveryTime,
  };
})();
