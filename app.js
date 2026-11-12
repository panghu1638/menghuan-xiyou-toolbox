(function () {
  var storageKey = "xyq-pet-arbitrage";
  var opportunitySeq = 1;
  var removedStallItems = [
    "C66",
    "元宵",
    "炼兽丹",
    "60级武器",
    "70级武器",
    "80级武器",
  ];
  var legacyYuanxiaoAttributes = ["攻击", "防御", "速度", "躲闪", "体力", "法力"];

  var defaultState = {
    schemaVersion: XYQDataBackup.schemaVersion,
    serverName: "",
    goldPriceInput: 0,
    goldPriceUnit: "bundle",
    goldPriceUnitVersion: 2,
    defaultOpportunityNamesVersion: 1,
    goldPricePerMillion: 0,
    feeRate: 0.05,
    feeCap: 1000,
    goldPriceHistory: [],
    stallPriceHistory: [],
    stallPriceDrafts: [{ item: "", unitPrice: null }],
    floorRecords: structuredClone(XYQFloorMarket.defaultFloorRecords),
    floorNameVersion: 2,
    petEquipmentCharacters: [],
    petEquipmentDeliveryRecords: [],
    fusionDeliveryRecords: [],
    petEquipmentCharacterVersion: 2,
    equipmentRecords: structuredClone(XYQEquipmentPrices.defaultEquipmentRecords),
    eyePriceRecords: structuredClone(XYQEquipmentPrices.defaultEyePriceRecords),
    eyePriceResetVersion: 1,
    stoneLevelOnePrices: structuredClone(XYQSpiritStones.defaultLevelOnePrices),
    decomposeSymbolPriceWan: XYQSpiritStones.defaultDecomposeSymbolPriceWan,
    lingShiDecompose: structuredClone(XYQSpiritStones.defaultLingShiDecompose),
    yuPoDecompose: structuredClone(XYQSpiritStones.defaultYuPoDecompose),
    equipmentAdsorb: structuredClone(
      XYQSpiritStones.defaultEquipmentAdsorb,
    ),
    yuanxiaoRecords: structuredClone(XYQFestivalItems.defaultYuanxiaoRecords),
    zhenjingPriceWan: XYQFestivalItems.defaultZhenjingPriceWan,
    craftPriceRecords: structuredClone(XYQCraftPrices.defaultCraftPriceRecords),
    petMarketRecords: structuredClone(XYQPetMarket.defaultPetRecords),
    petMarketNameVersion: 1,
    selectedOpportunityId: 1,
    defaultMaterialOrderVersion: 1,
    materials: structuredClone(XYQCalculator.defaultMaterials),
    opportunities: XYQOpportunityPlans.defaultOpportunityNames.map(
      function (name, index) {
        return {
          id: index + 1,
          name: name,
          skillPlan: "",
          salePrice: 0,
          extraCostRmb: 0,
          recipe: XYQCalculator.defaultRecipe.map(function () {
            return { quantity: 0 };
          }),
        };
      },
    ),
  };

  var state = loadState();
  state.floorRecords = XYQFloorMarket.migrateFloorRecordSaleTimes(state.floorRecords);
  saveState();
  var opportunityList = document.getElementById("opportunities");
  var opportunitySummarySection = document.getElementById("opportunity-summary-section");
  var opportunitySummaryList = document.getElementById("opportunity-summary-list");
  var summaryText = document.getElementById("summary-text");
  var opportunityPicker = document.getElementById("opportunity-picker");
  var materialPriceFields = document.getElementById("material-price-fields");

  function loadState() {
    try {
      var saved = XYQDataBackup.validateBackup(
        JSON.parse(localStorage.getItem(storageKey)),
      );
      if (!Array.isArray(saved.opportunities)) {
        opportunitySeq = defaultState.opportunities.length + 1;
        return structuredClone(defaultState);
      }
      var opportunityIds = saved.opportunities
        .map(function (item) { return Number(item.id); })
        .filter(Number.isFinite);
      opportunitySeq = opportunityIds.length
        ? Math.max(...opportunityIds) + 1
        : 1;
      saved.materials = normalizeMaterialPrices(saved);
      if (saved.defaultMaterialOrderVersion !== 1) {
        reorderLegacyMaterialRows(saved);
        saved.defaultMaterialOrderVersion = 1;
      }
      saved.opportunities.forEach(function (opportunity) {
        opportunity.recipe = normalizeOpportunityQuantities(
          opportunity.recipe,
          saved.materials,
        );
      });
      if (!Object.prototype.hasOwnProperty.call(saved, "goldPriceInput")) {
        saved.goldPriceInput = saved.goldPricePerMillion || 0;
        saved.goldPriceUnit = "million";
      }
      if (saved.goldPriceUnitVersion !== 2) {
        saved.goldPricePerMillion = XYQCalculator.normalizeGoldPriceToPerMillion(
          saved.goldPriceInput,
          saved.goldPriceUnit,
        );
        saved.goldPriceUnit = "bundle";
        saved.goldPriceInput = goldPriceInputFromPerMillion(
          saved.goldPricePerMillion,
          saved.goldPriceUnit,
        );
        saved.goldPriceUnitVersion = 2;
      }
      if (!Array.isArray(saved.petMarketRecords)) {
        saved.petMarketRecords = structuredClone(XYQPetMarket.defaultPetRecords);
      }
      saved.petMarketRecords.forEach(function (record) {
        if (record.wildPriceWan === undefined) record.wildPriceWan = null;
        if (!Array.isArray(record.skillTiers)) {
          record.skillTiers = [{
            skillCount: XYQOpportunityPlans.skillCountInputValue(record.skillPlan) || null,
            gameCoinPriceWan: record.gameCoinPriceWan === undefined
              ? null
              : record.gameCoinPriceWan,
            treasurePriceRmb: record.treasurePriceRmb === undefined
              ? null
              : record.treasurePriceRmb,
          }];
        }
      });
      if (saved.petMarketNameVersion !== 1) {
        XYQPetMarket.missingPetNames(saved.petMarketRecords).forEach(function (name) {
          saved.petMarketRecords.push(XYQPetMarket.createEmptyRecord(name));
        });
        saved.petMarketNameVersion = 1;
      }
      saved.opportunities.forEach(function (opportunity) {
        opportunity.extraCostRmb = Number.isFinite(opportunity.extraCostRmb)
          ? opportunity.extraCostRmb
          : 0;
        if (typeof opportunity.skillPlan !== "string") {
          if (opportunity.name === "龙鲤" && opportunity.salePrice === 0) {
            opportunity.name = "";
          }
          opportunity.skillPlan = "";
        }
        opportunity.skillPlan = XYQOpportunityPlans.skillPlanText(opportunity.skillPlan);
      });
      if (saved.defaultOpportunityNamesVersion !== 1) {
        var blankOpportunity = saved.opportunities.find(isBlankOpportunity);
        XYQOpportunityPlans
          .missingOpportunityNames(saved.opportunities)
          .forEach(function (name) {
            if (blankOpportunity) {
              blankOpportunity.name = name;
              blankOpportunity = null;
              return;
            }
            saved.opportunities.push({
              id: opportunitySeq++,
              name: name,
              skillPlan: "",
              salePrice: 0,
              extraCostRmb: 0,
              recipe: saved.materials.map(function () {
                return { quantity: 0 };
              }),
            });
          });
        saved.defaultOpportunityNamesVersion = 1;
      }
      saved.selectedOpportunityId = saved.opportunities.some(function (item) {
        return item.id === saved.selectedOpportunityId;
      })
        ? saved.selectedOpportunityId
        : (saved.opportunities[0] && saved.opportunities[0].id) || null;
      saved.goldPriceHistory = Array.isArray(saved.goldPriceHistory)
        ? saved.goldPriceHistory
        : [];
      saved.stallPriceHistory = Array.isArray(saved.stallPriceHistory)
        ? saved.stallPriceHistory
        : [];
      saved.stallPriceHistory = saved.stallPriceHistory.filter(function (record) {
        return !removedStallItems.includes(record.item);
      });
      saved.stallPriceDrafts = Array.isArray(saved.stallPriceDrafts)
        ? saved.stallPriceDrafts.map(function (draft) {
          return {
            item: typeof draft.item === "string" ? draft.item : "",
            unitPrice: draft.unitPrice,
          };
        })
        : [];
      if (!saved.stallPriceDrafts.length) {
        saved.stallPriceDrafts = structuredClone(defaultState.stallPriceDrafts);
      }
      saved.floorRecords = Array.isArray(saved.floorRecords)
        ? saved.floorRecords
        : structuredClone(XYQFloorMarket.defaultFloorRecords);
      if (saved.floorNameVersion !== 2) {
        saved.floorRecords = XYQFloorMarket.migrateFloorRecordNames(
          saved.floorRecords,
        );
        saved.floorNameVersion = 2;
      }
      if (saved.petEquipmentCharacterVersion !== 2) {
        var petEquipmentCharacters = XYQPetEquipmentTimes.removeCharacter(
          saved.petEquipmentCharacters,
          saved.petEquipmentDeliveryRecords,
          "神笔马良",
        );
        saved.petEquipmentCharacters = petEquipmentCharacters.characters;
        saved.petEquipmentDeliveryRecords = petEquipmentCharacters.records;
        saved.petEquipmentCharacterVersion = 2;
      }
      var petEquipmentTimes = XYQPetEquipmentTimes.migratePetEquipmentRecords(
        saved.petEquipmentDeliveryRecords,
        saved.petEquipmentCharacters,
      );
      saved.petEquipmentCharacters = petEquipmentTimes.characters;
      saved.petEquipmentDeliveryRecords = petEquipmentTimes.records.map(function (record) {
        return Object.assign({}, record, {
          deliveryTime: XYQFloorMarket.formatSaleTimes(record.deliveryTime),
        });
      });
      saved.fusionDeliveryRecords = XYQPetFusionTimes.migrateRecords(
        saved.fusionDeliveryRecords,
        saved.petEquipmentCharacters,
      );
      saved.equipmentRecords = Array.isArray(saved.equipmentRecords)
        ? saved.equipmentRecords
        : structuredClone(XYQEquipmentPrices.defaultEquipmentRecords);
      saved.eyePriceRecords = Array.isArray(saved.eyePriceRecords)
        ? saved.eyePriceRecords
        : structuredClone(XYQEquipmentPrices.defaultEyePriceRecords);
      if (saved.eyePriceResetVersion !== 1) {
        saved.eyePriceRecords = structuredClone(
          XYQEquipmentPrices.defaultEyePriceRecords,
        );
        saved.eyePriceResetVersion = 1;
      }
      saved.decomposeSymbolPriceWan = normalizeDecomposeSymbolPrice(saved);
      saved.lingShiDecompose = normalizeLingShiDecompose(saved.lingShiDecompose);
      saved.yuPoDecompose = normalizeYuPoDecompose(saved.yuPoDecompose);
      saved.equipmentAdsorb = normalizeEquipmentAdsorb(saved.equipmentAdsorb);
      var eyeLevelOrder = [115, 125, 105];
      saved.eyePriceRecords = saved.eyePriceRecords.slice().sort(function (first, second) {
        var levelDifference =
          eyeLevelOrder.indexOf(first.level) - eyeLevelOrder.indexOf(second.level);
        if (levelDifference !== 0) return levelDifference;
        if (first.type !== second.type) return first.type === "三眼天珠" ? -1 : 1;
        return first.power - second.power;
      });
      var savedStonePrices = saved.stoneLevelOnePrices;
      var hasSavedRedAgate = Boolean(
        savedStonePrices &&
        Object.prototype.hasOwnProperty.call(savedStonePrices, "红玛瑙"),
      );
      saved.stoneLevelOnePrices = savedStonePrices && typeof savedStonePrices === "object"
        ? Object.assign(
          structuredClone(XYQSpiritStones.defaultLevelOnePrices),
          savedStonePrices,
        )
        : structuredClone(XYQSpiritStones.defaultLevelOnePrices);
      if (
        saved.stoneLevelOnePrices.玛瑙 !== undefined &&
        !hasSavedRedAgate
      ) {
        saved.stoneLevelOnePrices.红玛瑙 = saved.stoneLevelOnePrices.玛瑙;
      }
      delete saved.stoneLevelOnePrices.玛瑙;
      delete saved.stoneComparisonRecords;
      delete saved.stoneTargetLevel;
      var savedYuanxiaoRecords = Array.isArray(saved.yuanxiaoRecords)
        ? saved.yuanxiaoRecords.map(function (record) {
          return {
            name: typeof record.name === "string" ? record.name : "",
            attribute: typeof record.attribute === "string" ? record.attribute : "",
            priceWan: record.priceWan,
          };
        })
        : [];
      saved.yuanxiaoRecords = XYQFestivalItems.defaultYuanxiaoRecords.map(
        function (defaultRecord) {
          var legacyAttribute = defaultRecord.name.replace("元宵", "");
          var savedRecord = savedYuanxiaoRecords.find(function (record) {
            return record.name === defaultRecord.name ||
              record.attribute === legacyAttribute &&
              legacyYuanxiaoAttributes.includes(legacyAttribute);
          });
          return {
            name: defaultRecord.name,
            priceWan: savedRecord ? savedRecord.priceWan : null,
          };
        },
      );
      saved.zhenjingPriceWan = saved.zhenjingPriceWan === undefined
        ? XYQFestivalItems.defaultZhenjingPriceWan
        : saved.zhenjingPriceWan;
      var savedCraftPriceRecords = Array.isArray(saved.craftPriceRecords)
        ? saved.craftPriceRecords
        : [];
      saved.craftPriceRecords = XYQCraftPrices.defaultCraftPriceRecords.map(
        function (defaultRecord) {
          var savedRecord = savedCraftPriceRecords.find(function (record) {
            return record.category === defaultRecord.category &&
              record.level === defaultRecord.level;
          });
          var priceWan = Number(savedRecord && savedRecord.priceWan);
          return {
            category: defaultRecord.category,
            level: defaultRecord.level,
            priceWan: Number.isFinite(priceWan) && priceWan >= 0 ? priceWan : null,
          };
        },
      );
      return saved;
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function normalizeLingShiDecompose(saved) {
    var defaults = XYQSpiritStones.defaultLingShiDecompose;
    var source = saved && typeof saved === "object" ? saved : {};
    var levelOnePrice = Number(source.levelOnePriceWan);
    var savedRecords = Array.isArray(source.records) ? source.records : [];

    return {
      levelOnePriceWan: Number.isFinite(levelOnePrice) && levelOnePrice >= 0
        ? levelOnePrice
        : defaults.levelOnePriceWan,
      records: defaults.records.map(function (defaultRecord, index) {
        var record = savedRecords.find(function (item) {
          return Number(item && item.level) === defaultRecord.level;
        }) || {};
        var stoneLevel = Number(record.stoneLevel);
        var stoneCount = Number(record.stoneCount);
        var symbolCount = Number(record.symbolCount);
        return {
          level: defaultRecord.level,
          stoneLevel: Number.isInteger(stoneLevel) && stoneLevel >= 1 && stoneLevel <= 10
            ? stoneLevel
            : defaultRecord.stoneLevel,
          stoneCount: Number.isInteger(stoneCount) && stoneCount > 0
            ? stoneCount
            : defaultRecord.stoneCount,
          symbolCount: Number.isInteger(symbolCount) && symbolCount > 0
            ? symbolCount
            : defaultRecord.symbolCount,
        };
      }),
    };
  }

  function normalizeDecomposeSymbolPrice(saved) {
    var root = saved && typeof saved === "object" ? saved : {};
    var price = Number(root.decomposeSymbolPriceWan);
    if (!Number.isFinite(price) || price < 0) {
      price = Number(root.lingShiDecompose && root.lingShiDecompose.symbolPriceWan);
    }
    if (!Number.isFinite(price) || price < 0) {
      price = Number(root.equipmentAdsorb && root.equipmentAdsorb.symbolPriceWan);
    }
    return Number.isFinite(price) && price >= 0
      ? price
      : XYQSpiritStones.defaultDecomposeSymbolPriceWan;
  }

  function normalizeYuPoDecompose(saved) {
    var source = saved && typeof saved === "object" ? saved : {};
    var dustPrice = Number(source.dustPriceWan);
    return {
      dustPriceWan: Number.isFinite(dustPrice) && dustPrice >= 0
        ? dustPrice
        : XYQSpiritStones.defaultYuPoDecompose.dustPriceWan,
    };
  }

  function normalizeEquipmentAdsorb(saved) {
    var defaults = XYQSpiritStones.defaultEquipmentAdsorb;
    var source = saved && typeof saved === "object" ? saved : {};
    var adsorbPrice = Number(source.adsorbPriceWan);
    var savedRecords = Array.isArray(source.records) ? source.records : [];

    return {
      adsorbPriceWan: Number.isFinite(adsorbPrice) && adsorbPrice >= 0
        ? adsorbPrice
        : defaults.adsorbPriceWan,
      records: defaults.records.map(function (defaultRecord) {
        var record = savedRecords.find(function (item) {
          return Number(item && item.level) === defaultRecord.level;
        }) || {};
        var adsorbCount = Number(record.adsorbCount);
        var symbolCount = Number(record.symbolCount);
        return {
          level: defaultRecord.level,
          adsorbCount: Number.isInteger(adsorbCount) && adsorbCount > 0
            ? adsorbCount
            : defaultRecord.adsorbCount,
          symbolCount: Number.isInteger(symbolCount) && symbolCount > 0
            ? symbolCount
            : defaultRecord.symbolCount,
        };
      }),
    };
  }

  function isBlankOpportunity(opportunity) {
    return String(opportunity.name || "").trim() === "" &&
      String(opportunity.skillPlan || "").trim() === "" &&
      opportunity.salePrice === 0 &&
      opportunity.extraCostRmb === 0 &&
      Array.isArray(opportunity.recipe) &&
      opportunity.recipe.every(function (item) {
        return item.quantity === 0;
      });
  }

  function normalizeMaterialPrices(saved) {
    if (Array.isArray(saved.materials) && saved.materials.length) {
      return saved.materials.map(function (material, index) {
        var defaultMaterial = XYQCalculator.defaultMaterials[index] ||
          { name: "材料" + (index + 1), unitPrice: 0 };
        var unitPrice = Number(material && material.unitPrice);
        return {
          name: typeof material?.name === "string" && material.name.trim()
            ? material.name
            : defaultMaterial.name,
          unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
        };
      });
    }

    var materials = [];
    saved.opportunities.forEach(function (opportunity) {
      if (!Array.isArray(opportunity.recipe)) return;
      opportunity.recipe.forEach(function (item) {
        var name = typeof item?.name === "string" ? item.name.trim() : "";
        if (!name) return;
        var existing = materials.find(function (material) {
          return material.name === name;
        });
        if (!existing) {
          existing = { name, unitPrice: 0 };
          materials.push(existing);
        }
        var unitPrice = Number(item.unitPrice);
        if (!existing.unitPrice && Number.isFinite(unitPrice) && unitPrice > 0) {
          existing.unitPrice = unitPrice;
        }
      });
    });

    return materials.length
      ? materials
      : structuredClone(XYQCalculator.defaultMaterials);
  }

  function normalizeOpportunityQuantities(recipe, materials) {
    var legacyRows = Array.isArray(recipe) ? recipe : [];
    return materials.map(function (material, index) {
      var row = legacyRows.find(function (item) {
        return item && item.name === material.name;
      }) || legacyRows[index] || {};
      var quantity = Number(row.quantity);
      return {
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
      };
    });
  }

  function reorderLegacyMaterialRows(saved) {
    var indices = [0, 2, 3, 4, 1, 5];
    var materialCount = saved.materials.length;
    for (var index = 0; index < materialCount; index += 1) {
      if (!indices.includes(index)) indices.push(index);
    }
    indices = indices.filter(function (index) {
      return index < materialCount;
    });

    saved.materials = indices.map(function (index) {
      return saved.materials[index];
    });
    saved.opportunities.forEach(function (opportunity) {
      if (!Array.isArray(opportunity.recipe)) return;
      opportunity.recipe = indices.map(function (index) {
        return opportunity.recipe[index] || { quantity: 0 };
      });
    });
  }

  function blankQuantities() {
    return state.materials.map(function () {
      return { quantity: 0 };
    });
  }

  function normalizeDecimalText(value) {
    var normalized = String(value).replace(/。/g, ".").replace(/[^\d.]/g, "");
    var firstDotIndex = normalized.indexOf(".");
    if (firstDotIndex === -1) return normalized;
    return normalized.slice(0, firstDotIndex + 1) +
      normalized.slice(firstDotIndex + 1).replace(/\./g, "");
  }

  function normalizeDecimalInput(input) {
    if (input.inputMode !== "decimal") return;
    var originalValue = input.value;
    var normalizedValue = normalizeDecimalText(originalValue);
    if (normalizedValue === originalValue) return;
    var caretPosition = input.selectionStart === null
      ? normalizedValue.length
      : normalizeDecimalText(originalValue.slice(0, input.selectionStart)).length;
    input.value = normalizedValue;
    input.setSelectionRange(caretPosition, caretPosition);
  }

  function bindDecimalInput(input) {
    if (input.dataset.decimalInputBound === "true") return input;
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.dataset.decimalInputBound = "true";
    input.addEventListener("input", function (event) {
      normalizeDecimalInput(event.target);
    });
    return input;
  }

  function createDecimalInput() {
    return bindDecimalInput(document.createElement("input"));
  }

  function numberFromInput(input, fallback) {
    var value = Number(normalizeDecimalText(input.value));
    return Number.isFinite(value) ? value : fallback;
  }

  function optionalNumberFromInput(input, fallback) {
    if (input.value === "") return null;
    var value = Number(normalizeDecimalText(input.value));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function localDateString() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function updateGoldPriceFromInput() {
    var goldPrice = document.getElementById("gold-price");
    var unit = document.getElementById("gold-price-unit");
    state.goldPriceInput = numberFromInput(goldPrice, state.goldPriceInput);
    state.goldPriceUnit = unit.value;
    state.goldPricePerMillion = XYQCalculator.normalizeGoldPriceToPerMillion(
      state.goldPriceInput,
      state.goldPriceUnit,
    );
  }

  function displayGoldPrice(perMillion) {
    var value = state.goldPriceUnit === "wan"
      ? perMillion / 100
      : state.goldPriceUnit === "bundle"
        ? perMillion * 30
        : perMillion;
    return XYQCalculator.formatCurrency(value);
  }

  function goldPriceUnitName() {
    if (state.goldPriceUnit === "wan") return "万两";
    if (state.goldPriceUnit === "bundle") return "3000万两";
    return "100万两";
  }

  function goldPriceInputFromPerMillion(perMillion, unit) {
    if (unit === "wan") return perMillion / 100;
    if (unit === "bundle") return perMillion * 30;
    return perMillion;
  }

  function renderGoldPriceHistory() {
    var status = document.getElementById("gold-price-status");
    var historyList = document.getElementById("gold-price-history");
    var serverName = state.serverName.trim();
    if (!status || !historyList) return;

    historyList.replaceChildren();

    if (!serverName) {
      status.textContent = "填写服务器后可记录并查看金价历史。";
      return;
    }

    var latest = XYQGoldPriceHistory.latestGoldPriceRecord(
      state.goldPriceHistory,
      serverName,
    );
    if (!latest) {
      status.textContent = serverName + " 还没有金价历史。";
      return;
    }

    status.textContent =
      serverName +
      " 最新金价：" +
      latest.date +
      " ¥" +
      displayGoldPrice(latest.goldPricePerMillion) +
      " / " +
      goldPriceUnitName();

    state.goldPriceHistory
      .filter(function (item) { return item.serverName === serverName; })
      .slice(0, 7)
      .forEach(function (item) {
        var row = document.createElement("li");
        var date = document.createElement("span");
        date.textContent = item.date;
        var price = document.createElement("strong");
        price.textContent =
          "¥" + displayGoldPrice(item.goldPricePerMillion) +
          " / " +
          goldPriceUnitName();
        row.append(date, price);
        historyList.append(row);
      });
  }

  function renderStallPriceInputs() {
    var fields = document.getElementById("stall-price-fields");
    if (!fields) return;

    fields.replaceChildren();
    state.stallPriceDrafts.forEach(function (draft, index) {
      var row = document.createElement("div");
      row.className = "stall-price-row";

      var nameLabel = document.createElement("label");
      var nameTitle = document.createElement("span");
      nameTitle.textContent = "物品名";
      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = draft.item;
      nameInput.placeholder = "自行输入物品名";
      nameInput.setAttribute("aria-label", "摆摊物品名" + (index + 1));
      nameInput.addEventListener("input", function (event) {
        draft.item = event.target.value;
        saveState();
      });
      nameLabel.append(nameTitle, nameInput);

      var priceLabel = document.createElement("label");
      var priceTitle = document.createElement("span");
      priceTitle.textContent = "单价（万两）";
      priceLabel.append(
        priceTitle,
        createPriceInput(
          draft,
          "unitPrice",
          "摆摊单价" + (index + 1),
          function () {},
        ),
      );

      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger";
      removeButton.textContent = "删除";
      removeButton.addEventListener("click", function () {
        if (!confirmDelete("确定删除这条摆摊价格吗？")) return;
        state.stallPriceDrafts.splice(index, 1);
        if (!state.stallPriceDrafts.length) {
          state.stallPriceDrafts.push({ item: "", unitPrice: null });
        }
        saveState();
        renderStallPriceInputs();
      });

      row.append(nameLabel, priceLabel, removeButton);
      fields.append(row);
    });
  }

  function renderStallPriceHistory() {
    var status = document.getElementById("stall-price-status");
    var historyList = document.getElementById("stall-price-history");
    if (!status || !historyList) return;

    var latest = XYQStallPriceHistory.latestStallPriceRecords(state.stallPriceHistory);
    var records = Object.values(latest).sort(function (first, second) {
      return first.item.localeCompare(second.item, "zh-Hans-CN");
    });
    historyList.replaceChildren();

    if (!records.length) {
      status.textContent = "还没有摆摊价格历史。";
      return;
    }

    status.textContent = "最新摆摊价会自动应用到同名或别名材料。";
    records.forEach(function (record) {
      var row = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = record.item + " · " + record.date;
      var price = document.createElement("strong");
      price.textContent = XYQCalculator.formatGameCoin(record.unitPrice);
      row.append(name, price);
      historyList.append(row);
    });
  }

  function createAutoDateInput(
    record,
    propertyName,
    ariaLabel,
    formatter,
    placeholder,
    changeListener,
  ) {
    var input = document.createElement("input");
    input.type = "text";
    input.value = record[propertyName] || "";
    if (placeholder) input.placeholder = placeholder;
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("input", function (event) {
      record[propertyName] = event.target.value;
      saveState();
    });
    input.addEventListener("change", function (event) {
      var formatted = formatter(event.target.value);
      event.target.value = formatted;
      record[propertyName] = formatted;
      saveState();
      if (changeListener) changeListener(formatted);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") event.target.blur();
    });
    return input;
  }

  function renderFloorMarket() {
    var tbody = document.getElementById("floor-records");
    if (!tbody) return;

    tbody.replaceChildren();

    state.floorRecords.forEach(function (record) {
      var row = document.createElement("tr");

      var nameCell = document.createElement("td");
      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = record.name;
      nameInput.setAttribute("aria-label", record.name + "名称");
      nameInput.addEventListener("input", function (event) {
        record.name = event.target.value;
        saveState();
      });
      nameCell.append(nameInput);

      var priceCell = document.createElement("td");
      var priceInput = createDecimalInput();
      priceInput.value = priceValue(record.price);
      priceInput.setAttribute("aria-label", record.name + "价格");
      priceInput.addEventListener("input", function (event) {
        record.price = numberFromInput(event.target, record.price);
        saveState();
      });
      priceCell.append(priceInput);

      var referenceCell = document.createElement("td");
      referenceCell.append(
        createAutoDateInput(
          record,
          "saleTimes",
          record.name + "旧数据参考",
          XYQFloorMarket.stripSaleTimeDates,
        ),
      );

      var timeCell = document.createElement("td");
      var shichenCell = document.createElement("td");
      shichenCell.className = "fusion-shichen";
      var updateShichenCell = function () {
        shichenCell.textContent = record.shichen || "—";
      };
      timeCell.append(
        createAutoDateInput(
          record,
          "deliveryTimes",
          record.name + "出货时间",
          XYQFloorMarket.formatSaleTimes,
          "输入时间",
        ),
      );

      row.append(nameCell, priceCell, referenceCell, timeCell);
      tbody.append(row);
    });
  }

  function renderPetEquipmentTimes() {
    var tbody = document.getElementById("pet-equipment-time-records");
    if (!tbody) return;

    tbody.replaceChildren();

    if (!state.petEquipmentDeliveryRecords.length) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 7;
      emptyCell.className = "pet-equipment-time-empty";
      emptyCell.textContent = "还没有装备记录，点击“新增装备记录”开始填写。";
      emptyRow.append(emptyCell);
      tbody.append(emptyRow);
      return;
    }

    state.petEquipmentDeliveryRecords.forEach(function (record) {
      var row = document.createElement("tr");

      var characterCell = document.createElement("td");
      var characterSelect = document.createElement("select");
      characterSelect.setAttribute("aria-label", "角色");
      var placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = "请选择角色";
      characterSelect.append(placeholderOption);
      state.petEquipmentCharacters.forEach(function (character) {
        var option = document.createElement("option");
        option.value = character;
        option.textContent = character;
        characterSelect.append(option);
      });
      characterSelect.value = record.character;
      characterSelect.addEventListener("change", function (event) {
        record.character = event.target.value;
        saveState();
      });
      characterCell.append(characterSelect);

      var categoryCell = document.createElement("td");
      var categorySelect = document.createElement("select");
      categorySelect.setAttribute("aria-label", "装备部位");
      XYQPetEquipmentTimes.categories.forEach(function (category) {
        var option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.append(option);
      });
      categorySelect.value = record.category;
      categorySelect.addEventListener("change", function (event) {
        record.category = event.target.value;
        saveState();
      });
      categoryCell.append(categorySelect);

      var damageCell = document.createElement("td");
      var damageInput = createDecimalInput();
      damageInput.placeholder = "伤害";
      damageInput.value = record.damage === null || record.damage === undefined
        ? ""
        : record.damage;
      damageInput.setAttribute("aria-label", "装备伤害");
      damageInput.addEventListener("input", function (event) {
        record.damage = optionalNumberFromInput(event.target, record.damage);
        saveState();
      });
      damageCell.append(damageInput);

      var attributesCell = document.createElement("td");
      var attributesInput = document.createElement("input");
      attributesInput.type = "text";
      attributesInput.value = record.attributes;
      attributesInput.placeholder = "如 力量+12、敏捷+8";
      attributesInput.setAttribute("aria-label", "装备属性");
      attributesInput.addEventListener("input", function (event) {
        record.attributes = event.target.value;
        saveState();
      });
      attributesCell.append(attributesInput);

      var timeCell = document.createElement("td");
      var shichenCell = document.createElement("td");
      shichenCell.className = "fusion-shichen";
      var updateShichenCell = function () {
        shichenCell.textContent = record.shichen || "—";
      };
      timeCell.append(
        createAutoDateInput(
          record,
          "deliveryTime",
          record.character + record.category + "出货时间",
          XYQFloorMarket.formatSaleTimes,
          "输入时间",
          function (formatted) {
            record.shichen = XYQFloorMarket.shichenFromDeliveryTime(formatted);
            saveState();
            updateShichenCell();
          },
        ),
      );
      updateShichenCell();

      var actionCell = document.createElement("td");
      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger";
      removeButton.textContent = "删除";
      removeButton.addEventListener("click", function () {
        if (!confirmDelete("确定删除这条装备记录吗？")) return;
        state.petEquipmentDeliveryRecords = state.petEquipmentDeliveryRecords.filter(
          function (item) { return item !== record; },
        );
        saveState();
        renderPetEquipmentTimes();
      });
      actionCell.append(removeButton);

      row.append(
        characterCell,
        categoryCell,
        damageCell,
        attributesCell,
        timeCell,
        shichenCell,
        actionCell,
      );
      tbody.append(row);
    });
  }

  function renderFusionDeliveryTimes() {
    var tbody = document.getElementById("fusion-time-records");
    if (!tbody) return;

    tbody.replaceChildren();

    if (!state.fusionDeliveryRecords.length) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 7;
      emptyCell.className = "pet-equipment-time-empty";
      emptyCell.textContent = "还没有炼妖记录，点击“新增炼妖记录”开始填写。";
      emptyRow.append(emptyCell);
      tbody.append(emptyRow);
      return;
    }

    state.fusionDeliveryRecords.forEach(function (record) {
      var row = document.createElement("tr");

      var characterCell = document.createElement("td");
      var characterSelect = document.createElement("select");
      characterSelect.setAttribute("aria-label", "炼妖角色");
      var placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = "请选择角色";
      characterSelect.append(placeholderOption);
      state.petEquipmentCharacters.forEach(function (character) {
        var option = document.createElement("option");
        option.value = character;
        option.textContent = character;
        characterSelect.append(option);
      });
      characterSelect.value = record.character;
      characterSelect.addEventListener("change", function (event) {
        record.character = event.target.value;
        saveState();
      });
      characterCell.append(characterSelect);

      var embryoCell = document.createElement("td");
      var embryoInput = document.createElement("input");
      embryoInput.type = "text";
      embryoInput.value = record.embryoCombo;
      embryoInput.placeholder = "如 泪妖+日游神";
      embryoInput.setAttribute("aria-label", "胚子组合");
      embryoInput.addEventListener("input", function (event) {
        record.embryoCombo = event.target.value;
        saveState();
      });
      embryoCell.append(embryoInput);

      var resultCell = document.createElement("td");
      var resultInput = document.createElement("input");
      resultInput.type = "text";
      resultInput.value = record.result;
      resultInput.placeholder = "如 须弥泪妖";
      resultInput.setAttribute("aria-label", "炼妖结果");
      resultInput.addEventListener("input", function (event) {
        record.result = event.target.value;
        saveState();
      });
      resultCell.append(resultInput);

      var timeCell = document.createElement("td");
      var shichenCell = document.createElement("td");
      shichenCell.className = "fusion-shichen";
      var updateShichenCell = function () {
        shichenCell.textContent = record.shichen || "—";
      };
      timeCell.append(
        createAutoDateInput(
          record,
          "deliveryTime",
          record.result + "出货时间",
          XYQFloorMarket.formatSaleTimes,
          "输入时间",
          function (formatted) {
            record.shichen = XYQPetFusionTimes.shichenFromDeliveryTime(formatted);
            saveState();
            updateShichenCell();
          },
        ),
      );
      updateShichenCell(record.deliveryTime);

      var actionCell = document.createElement("td");
      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger";
      removeButton.textContent = "删除";
      removeButton.addEventListener("click", function () {
        if (!confirmDelete("确定删除这条炼妖记录吗？")) return;
        state.fusionDeliveryRecords = state.fusionDeliveryRecords.filter(
          function (item) { return item !== record; },
        );
        saveState();
        renderFusionDeliveryTimes();
      });
      actionCell.append(removeButton);

      row.append(
        characterCell,
        embryoCell,
        resultCell,
        timeCell,
        shichenCell,
        actionCell,
      );
      tbody.append(row);
    });
  }

  function priceValue(value) {
    return value === null || value === undefined || Number(value) === 0
      ? ""
      : value;
  }

  function createPriceInput(record, propertyName, ariaLabel, listener) {
    var input = createDecimalInput();
    input.placeholder = "空";
    input.value = priceValue(record[propertyName]);
    input.setAttribute("aria-label", ariaLabel);
    if (listener) {
      input.addEventListener("input", function (event) {
        record[propertyName] = optionalNumberFromInput(event.target, record[propertyName]);
        saveState();
        listener();
      });
    }
    return input;
  }

  function renderEquipmentMarket() {
    var groups = document.getElementById("equipment-groups");
    if (!groups) return;

    groups.replaceChildren();
    ["护腕", "项圈", "衣服"].forEach(function (category) {
      var card = document.createElement("article");
      card.className = "reference-card";
      var title = document.createElement("h3");
      title.textContent = category;
      card.append(title);

      var wrap = document.createElement("div");
      wrap.className = "reference-table-wrap";
      var table = document.createElement("table");
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      ["伤害", "摆摊（万两）", "藏宝阁（元）"].forEach(
        function (titleText) {
          var cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = titleText;
          headerRow.append(cell);
        },
      );
      thead.append(headerRow);
      var tbody = document.createElement("tbody");

      state.equipmentRecords
        .filter(function (record) { return record.category === category; })
        .forEach(function (record) {
          var row = document.createElement("tr");
          row.dataset.category = record.category;
          row.dataset.damage = record.damage;

          var damageCell = document.createElement("td");
          damageCell.textContent = record.damage;
          var stallCell = document.createElement("td");
          stallCell.append(createPriceInput(
            record,
            "stallPriceWan",
            category + record.damage + "摆摊价",
          ));
          var treasureCell = document.createElement("td");
          treasureCell.append(createPriceInput(
            record,
            "treasurePriceRmb",
            category + record.damage + "藏宝阁价",
          ));
          row.append(damageCell, stallCell, treasureCell);
          tbody.append(row);
        });

      table.append(thead, tbody);
      wrap.append(table);
      card.append(wrap);
      groups.append(card);
    });

  }

  function updateEyePriceRow(row, record) {
    var resultCell = row.querySelector(".eye-rmb");
    if (
      record.priceWan === null || record.priceWan === undefined ||
      !state.goldPricePerMillion
    ) {
      resultCell.textContent = "—";
      return;
    }

    resultCell.textContent = "¥" + XYQCalculator.formatCurrency(
      record.priceWan * state.goldPricePerMillion / 100,
    );
  }

  function renderEyePriceMarket() {
    var groups = document.getElementById("eye-price-groups");
    if (!groups) return;

    groups.replaceChildren();
    var groupOrder = [];
    var grouped = {};
    state.eyePriceRecords.forEach(function (record) {
      var groupName = record.level + record.type;
      if (!groupOrder.includes(groupName)) groupOrder.push(groupName);
      grouped[groupName] = grouped[groupName] || [];
      grouped[groupName].push(record);
    });

    groupOrder.forEach(function (groupName) {
      var records = grouped[groupName];
      var card = document.createElement("article");
      card.className = "reference-card";
      var title = document.createElement("h3");
      title.textContent = records[0].level + " " + records[0].type;
      card.append(title);

      var wrap = document.createElement("div");
      wrap.className = "reference-table-wrap";
      var table = document.createElement("table");
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      ["灵力", "万元", "折算人民币"].forEach(function (titleText) {
        var cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = titleText;
        headerRow.append(cell);
      });
      thead.append(headerRow);
      var tbody = document.createElement("tbody");

      records.forEach(function (record) {
        var row = document.createElement("tr");
        row.dataset.level = record.level;
        row.dataset.type = record.type;
        row.dataset.power = record.power;

        var powerCell = document.createElement("td");
        powerCell.textContent = record.power;
        var priceCell = document.createElement("td");
        priceCell.append(createPriceInput(
          record,
          "priceWan",
          record.level + record.type + record.power + "价格",
          function () { updateEyePriceRow(row, record); },
        ));
        var resultCell = document.createElement("td");
        resultCell.className = "eye-rmb";

        row.append(powerCell, priceCell, resultCell);
        tbody.append(row);
      });

      table.append(thead, tbody);
      wrap.append(table);
      card.append(wrap);
      groups.append(card);
    });

    var noteCard = document.createElement("article");
    noteCard.className = "reference-card notes";
    var noteTitle = document.createElement("h3");
    noteTitle.textContent = "截图备注";
    var noteList = document.createElement("ul");
    XYQEquipmentPrices.defaultEyeNotes.forEach(function (note) {
      var item = document.createElement("li");
      item.textContent = note.source + " · " + note.label + " · " + note.price;
      noteList.append(item);
    });
    noteCard.append(noteTitle, noteList);
    groups.append(noteCard);

    updateEyePriceResults();
  }

  function updateEyePriceResults() {
    document.querySelectorAll("#eye-price-groups tr[data-level]").forEach(function (row) {
      var record = XYQEquipmentPrices.findEyePriceRecord(
        state.eyePriceRecords,
        Number(row.dataset.level),
        row.dataset.type,
        Number(row.dataset.power),
      );
      if (record) updateEyePriceRow(row, record);
    });
    var summary = document.getElementById("eye-price-summary");
    if (summary) {
      summary.textContent = state.goldPricePerMillion
        ? "当前金价：¥" + displayGoldPrice(state.goldPricePerMillion) + " / " + goldPriceUnitName() + "。"
        : "请先在区内行情页填写金价，再回到本页折算。";
    }
  }

  function updateSpiritStoneSummary() {
    var summary = document.getElementById("stone-price-summary");
    if (!summary) return;

    if (!state.goldPricePerMillion) {
      summary.textContent = "填写1级价格后，2–10级按合成规则自动更新；填写区内行情金价后，宝石栏和9级以上精魄灵石再显示人民币到手。";
      return;
    }
    summary.textContent =
      "当前金价：¥" + displayGoldPrice(state.goldPricePerMillion) +
      " / " + goldPriceUnitName() +
      "；宝石栏和9级以上精魄灵石显示折算人民币和扣手续费后到手，费率 " +
      (state.feeRate * 100).toFixed(0) + "%，上限 ¥" +
      XYQCalculator.formatCurrency(state.feeCap) + "。";
  }

  function formatGemRmbText(priceWan) {
    var calculation = XYQSpiritStones.calculateGemRmbProceeds(
      priceWan,
      state.goldPricePerMillion,
      state.feeRate,
      state.feeCap,
    );
    if (!calculation || !priceWan) return "折算 — / 到手 —";
    return "折算 ¥" + XYQCalculator.formatCurrency(calculation.rmb) +
      " / 到手 ¥" + XYQCalculator.formatCurrency(calculation.netRmb);
  }

  function updateStonePriceCells(stoneName) {
    document.querySelectorAll('[data-stone-price="' + stoneName + '"]').forEach(function (cell) {
      var level = Number(cell.dataset.level);
      var price = XYQSpiritStones.calculateStonePrice(
        stoneName,
        state.stoneLevelOnePrices[stoneName],
        level,
      );
      var priceText = cell.querySelector(".stone-level-price");
      if (priceText) {
        priceText.textContent = XYQCalculator.formatGameCoin(price);
      }
      var rmbText = cell.querySelector(".stone-level-rmb");
      var table = cell.closest("table");
      if (
        rmbText &&
        table &&
        level >= Number(table.dataset.rmbFromLevel)
      ) {
        rmbText.textContent = formatGemRmbText(price);
      }
    });
  }

  function renderStoneTierTables() {
    var container = document.getElementById("stone-tier-tables");
    if (!container) return;

    container.replaceChildren();
    XYQSpiritStones.defaultStoneCatalog.forEach(function (group) {
      var card = document.createElement("article");
      card.className = "reference-card stone-tier-card";
      var title = document.createElement("h3");
      title.textContent = group.tier;
      card.append(title);

      var wrap = document.createElement("div");
      wrap.className = "reference-table-wrap wide";
      var table = document.createElement("table");
      table.dataset.rmbFromLevel = String(group.rmbFromLevel);
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      var levelHeader = document.createElement("th");
      levelHeader.scope = "col";
      levelHeader.textContent = "等级";
      headerRow.append(levelHeader);
      group.stones.forEach(function (stone) {
        var cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = stone.name;
        headerRow.append(cell);
      });
      thead.append(headerRow);
      var tbody = document.createElement("tbody");

      for (var level = 1; level <= 10; level += 1) {
        var row = document.createElement("tr");
        var levelCell = document.createElement("td");
        levelCell.textContent = level + "级";
        row.append(levelCell);

        group.stones.forEach(function (stone) {
          var stoneName = stone.name;
          var priceCell = document.createElement("td");
          priceCell.dataset.stonePrice = stoneName;
          priceCell.dataset.level = level;

          if (level === 1) {
            var input = createDecimalInput();
            input.value = priceValue(state.stoneLevelOnePrices[stoneName]);
            input.setAttribute("aria-label", stoneName + "1级价格");
            input.addEventListener("input", function (event) {
              state.stoneLevelOnePrices[stoneName] = numberFromInput(
                event.target,
                state.stoneLevelOnePrices[stoneName],
              );
              saveState();
              updateStonePriceCells(stoneName);
            });
            priceCell.append(input);
            if (level >= group.rmbFromLevel) {
              var levelOneRmbText = document.createElement("div");
              levelOneRmbText.className = "stone-level-rmb";
              priceCell.append(levelOneRmbText);
            }
          } else {
            var multiplier = XYQSpiritStones.stoneMultiplier(stoneName, level);
            var multiplierText = document.createElement("span");
            multiplierText.className = "stone-level-multiplier";
            multiplierText.textContent = "×" + multiplier;
            var priceText = document.createElement("div");
            priceText.className = "stone-level-price";
            priceCell.append(priceText);
            if (level >= group.rmbFromLevel) {
              var rmbText = document.createElement("div");
              rmbText.className = "stone-level-rmb";
              priceCell.append(rmbText);
            }
            priceCell.append(multiplierText);
          }
          row.append(priceCell);
        });
        tbody.append(row);
      }

      table.append(thead, tbody);
      wrap.append(table);
      card.append(wrap);
      container.append(card);
    });
    Object.keys(state.stoneLevelOnePrices).forEach(updateStonePriceCells);
    updateSpiritStoneSummary();
  }

  function updateLingShiDecomposeRows() {
    document
      .querySelectorAll("#ling-shi-decompose-table tr[data-level]")
      .forEach(function (row) {
        var record = state.lingShiDecompose.records.find(function (item) {
          return item.level === Number(row.dataset.level);
        });
        if (!record) return;

        var result = XYQSpiritStones.calculateLingShiBreakEven({
          stoneCount: record.stoneCount,
          stoneLevel: record.stoneLevel,
          levelOnePriceWan: state.lingShiDecompose.levelOnePriceWan,
          symbolCount: record.symbolCount,
          symbolPriceWan: state.decomposeSymbolPriceWan,
        });
        row.querySelector(".ling-shi-symbol").textContent =
          record.symbolCount + "个" +
          (result ? " · " + XYQCalculator.formatGameCoin(result.symbolCostWan) : "");
        row.querySelector(".ling-shi-equivalent").textContent = result
          ? "×" + result.equivalentCount
          : "—";
        row.querySelector(".ling-shi-max-cost").textContent = result
          ? XYQCalculator.formatGameCoin(result.maxCostWan)
          : "—";
      });
  }

  function renderLingShiDecompose() {
    var table = document.getElementById("ling-shi-decompose-table");
    if (!table) return;

    var starPriceInput = document.getElementById("decompose-star-price");
    var symbolPriceInput = document.getElementById("decompose-symbol-price");
    if (starPriceInput) {
      starPriceInput.value = priceValue(state.lingShiDecompose.levelOnePriceWan);
      bindDecimalInput(starPriceInput);
      if (starPriceInput.dataset.lingShiBound !== "true") {
        starPriceInput.dataset.lingShiBound = "true";
        starPriceInput.addEventListener("input", function (event) {
          state.lingShiDecompose.levelOnePriceWan = numberFromInput(
            event.target,
            state.lingShiDecompose.levelOnePriceWan,
          );
          saveState();
          updateLingShiDecomposeRows();
        });
      }
    }
    if (symbolPriceInput) {
      symbolPriceInput.value = priceValue(state.decomposeSymbolPriceWan);
      bindDecimalInput(symbolPriceInput);
      if (symbolPriceInput.dataset.decomposeSymbolBound !== "true") {
        symbolPriceInput.dataset.decomposeSymbolBound = "true";
        symbolPriceInput.addEventListener("input", function (event) {
          state.decomposeSymbolPriceWan = numberFromInput(
            event.target,
            state.decomposeSymbolPriceWan,
          );
          saveState();
          updateLingShiDecomposeRows();
          updateYuPoDecomposeResult();
          updateEquipmentAdsorbRows();
        });
      }
    }
    var tbody = table.tBodies[0];
    tbody.replaceChildren();
    state.lingShiDecompose.records.forEach(function (record) {
      var row = document.createElement("tr");
      row.dataset.level = record.level;

      var levelCell = document.createElement("td");
      levelCell.textContent = record.level + "级";

      var levelCellWrapper = document.createElement("td");
      var stoneLevelSelect = document.createElement("select");
      stoneLevelSelect.setAttribute("aria-label", record.level + "级灵饰出石等级");
      for (var stoneLevel = 1; stoneLevel <= 10; stoneLevel += 1) {
        var option = document.createElement("option");
        option.value = stoneLevel;
        option.textContent = stoneLevel + "级";
        if (stoneLevel === record.stoneLevel) option.selected = true;
        stoneLevelSelect.append(option);
      }
      stoneLevelSelect.addEventListener("change", function (event) {
        record.stoneLevel = Number(event.target.value);
        saveState();
        updateLingShiDecomposeRows();
      });
      levelCellWrapper.append(stoneLevelSelect);

      var countCell = document.createElement("td");
      var countInput = createDecimalInput();
      countInput.value = record.stoneCount;
      countInput.setAttribute("aria-label", record.level + "级灵饰出石数量");
      countInput.addEventListener("input", function (event) {
        var count = Number(numberFromInput(event.target, record.stoneCount));
        if (Number.isInteger(count) && count > 0) record.stoneCount = count;
        saveState();
        updateLingShiDecomposeRows();
      });
      countCell.append(countInput);

      var equivalentCell = document.createElement("td");
      equivalentCell.className = "ling-shi-equivalent";
      var symbolCell = document.createElement("td");
      symbolCell.className = "ling-shi-symbol";
      var costCell = document.createElement("td");
      costCell.className = "ling-shi-max-cost";

      row.append(
        levelCell,
        levelCellWrapper,
        countCell,
        equivalentCell,
        symbolCell,
        costCell,
      );
      tbody.append(row);
    });
    updateLingShiDecomposeRows();
  }

  function updateYuPoDecomposeResult() {
    var result = document.getElementById("yu-po-decompose-result");
    if (!result) return;
    var calculation = XYQSpiritStones.calculateYuPoBreakEven({
      dustPriceWan: state.yuPoDecompose.dustPriceWan,
      symbolPriceWan: state.decomposeSymbolPriceWan,
    });
    result.textContent = calculation
      ? "最低成本价：" + XYQCalculator.formatGameCoin(calculation.symbolCostWan) +
        " · 最高收购价：" + XYQCalculator.formatGameCoin(calculation.maxCostWan)
      : "填写1级五色灵尘价后自动计算。";
  }

  function renderYuPoDecompose() {
    var dustPriceInput = document.getElementById("yu-po-dust-price");
    if (!dustPriceInput) return;

    dustPriceInput.value = priceValue(state.yuPoDecompose.dustPriceWan);
    bindDecimalInput(dustPriceInput);
    if (dustPriceInput.dataset.yuPoBound !== "true") {
      dustPriceInput.dataset.yuPoBound = "true";
      dustPriceInput.addEventListener("input", function (event) {
        state.yuPoDecompose.dustPriceWan = optionalNumberFromInput(
          event.target,
          state.yuPoDecompose.dustPriceWan,
        );
        saveState();
        updateYuPoDecomposeResult();
      });
    }
    updateYuPoDecomposeResult();
  }

  function updateEquipmentAdsorbRows() {
    document
      .querySelectorAll("#equipment-adsorb-table tr[data-level]")
      .forEach(function (row) {
        var record = state.equipmentAdsorb.records.find(function (item) {
          return item.level === Number(row.dataset.level);
        });
        if (!record) return;

        var result = XYQSpiritStones.calculateEquipmentAdsorbBreakEven({
          adsorbCount: record.adsorbCount,
          symbolCount: record.symbolCount,
          adsorbPriceWan: state.equipmentAdsorb.adsorbPriceWan,
          symbolPriceWan: state.decomposeSymbolPriceWan,
        });
        row.querySelector(".equipment-adsorb-symbol").textContent =
          record.symbolCount + "个" +
          (result ? " · " + XYQCalculator.formatGameCoin(result.symbolCostWan) : "");
        row.querySelector(".equipment-adsorb-revenue").textContent = result
          ? XYQCalculator.formatGameCoin(result.adsorbRevenueWan)
          : "—";
        row.querySelector(".equipment-adsorb-max-cost").textContent = result
          ? XYQCalculator.formatGameCoin(result.maxCostWan)
          : "—";
      });
  }

  function renderEquipmentAdsorb() {
    var table = document.getElementById("equipment-adsorb-table");
    if (!table) return;

    var adsorbPriceInput = document.getElementById("adsorb-price");
    if (!adsorbPriceInput) return;
    adsorbPriceInput.value = priceValue(state.equipmentAdsorb.adsorbPriceWan);
    bindDecimalInput(adsorbPriceInput);
    if (adsorbPriceInput.dataset.equipmentAdsorbBound !== "true") {
      adsorbPriceInput.dataset.equipmentAdsorbBound = "true";
      adsorbPriceInput.addEventListener("input", function (event) {
        state.equipmentAdsorb.adsorbPriceWan = numberFromInput(
          event.target,
          state.equipmentAdsorb.adsorbPriceWan,
        );
        saveState();
        updateEquipmentAdsorbRows();
      });
    }

    var tbody = table.tBodies[0];
    tbody.replaceChildren();
    state.equipmentAdsorb.records.forEach(function (record) {
      var row = document.createElement("tr");
      row.dataset.level = record.level;

      var levelCell = document.createElement("td");
      levelCell.textContent = record.level + "级";

      var countCell = document.createElement("td");
      var countInput = createDecimalInput();
      countInput.value = record.adsorbCount;
      countInput.setAttribute("aria-label", record.level + "级装备吸附石数量");
      countInput.addEventListener("input", function (event) {
        var count = Number(numberFromInput(event.target, record.adsorbCount));
        if (Number.isInteger(count) && count > 0) record.adsorbCount = count;
        saveState();
        updateEquipmentAdsorbRows();
      });
      countCell.append(countInput);

      var symbolCell = document.createElement("td");
      symbolCell.className = "equipment-adsorb-symbol";
      var revenueCell = document.createElement("td");
      revenueCell.className = "equipment-adsorb-revenue";
      var costCell = document.createElement("td");
      costCell.className = "equipment-adsorb-max-cost";

      row.append(
        levelCell,
        countCell,
        symbolCell,
        revenueCell,
        costCell,
      );
      tbody.append(row);
    });
    updateEquipmentAdsorbRows();
  }

  function renderSpiritStoneMarket() {
    renderStoneTierTables();
    renderLingShiDecompose();
    renderYuPoDecompose();
    renderEquipmentAdsorb();
  }

  function updateFestivalGoldSummary() {
    var summary = document.getElementById("festival-gold-summary");
    if (!summary) return;

    summary.textContent = state.goldPricePerMillion
      ? "元宵只记录万两价格；炼兽珍经按当前金价 ¥" +
        displayGoldPrice(state.goldPricePerMillion) + " / " + goldPriceUnitName() + "折算。"
      : "元宵只记录万两价格；填写区内行情金价后，炼兽珍经可折算人民币。";
  }

  function renderCraftPriceMarket() {
    var tbody = document.getElementById("craft-price-records");
    if (!tbody) return;

    tbody.replaceChildren();
    XYQCraftPrices.craftLevels.forEach(function (level) {
      var row = document.createElement("tr");
      row.dataset.level = level;

      var levelCell = document.createElement("td");
      levelCell.textContent = level + "级";
      row.append(levelCell);

      XYQCraftPrices.craftCategories.forEach(function (category) {
        var record = XYQCraftPrices.findCraftPriceRecord(
          state.craftPriceRecords,
          category.name,
          level,
        );
        var priceCell = document.createElement("td");
        if (!record) {
          priceCell.textContent = "—";
        } else {
          priceCell.append(createPriceInput(
            record,
            "priceWan",
            category.name + level + "级价格",
            function () {},
          ));
        }
        row.append(priceCell);
      });

      tbody.append(row);
    });
  }

  function updateZhenjingPrice() {
    var result = document.getElementById("zhenjing-rmb");
    if (!result) return;

    var priceRmb = XYQFestivalItems.calculateZhenjingRmb(
      state.zhenjingPriceWan,
      state.goldPricePerMillion,
    );
    result.textContent = priceRmb === null
      ? "—"
      : "¥" + XYQCalculator.formatCurrency(priceRmb);
  }

  function renderFestivalMarket() {
    var tbody = document.getElementById("yuanxiao-records");
    var zhenjingPrice = document.getElementById("zhenjing-price");
    if (!tbody || !zhenjingPrice) return;

    tbody.replaceChildren();
    var priceRow = document.createElement("tr");
    state.yuanxiaoRecords.forEach(function (record) {
      var priceCell = document.createElement("td");
      priceCell.append(createPriceInput(
        record,
        "priceWan",
        record.name + "价格（万两）",
        function () {},
      ));

      priceRow.append(priceCell);
    });
    tbody.append(priceRow);

    zhenjingPrice.value = priceValue(state.zhenjingPriceWan);
    bindDecimalInput(zhenjingPrice);
    zhenjingPrice.oninput = function (event) {
      state.zhenjingPriceWan = optionalNumberFromInput(
        event.target,
        state.zhenjingPriceWan,
      );
      saveState();
      updateZhenjingPrice();
    };
    updateZhenjingPrice();
    updateFestivalGoldSummary();
  }

  function updateSkillTierRow(row, record, tier) {
    var calculation = XYQPetMarket.calculatePetArbitrage({
      gameCoinPriceWan: tier.gameCoinPriceWan,
      wildCostWan: record.wildPriceWan,
      treasurePriceRmb: tier.treasurePriceRmb,
      goldPricePerMillion: state.goldPricePerMillion,
      feeRate: state.feeRate,
      feeCap: state.feeCap,
    });
    var costCell = row.querySelector(".pet-market-cost");
    var netCell = row.querySelector(".pet-market-net");
    var profitCell = row.querySelector(".pet-market-profit");

    if (!calculation) {
      costCell.textContent = "—";
      netCell.textContent = "—";
      profitCell.textContent = "—";
      profitCell.className = "pet-market-profit";
      return;
    }

    costCell.textContent = "¥" + XYQCalculator.formatCurrency(calculation.gameCoinRmb);
    netCell.textContent = "¥" + XYQCalculator.formatCurrency(calculation.netRmb);
    profitCell.textContent = "¥" + XYQCalculator.formatCurrency(calculation.profit);
    profitCell.className = "pet-market-profit " + (calculation.profit >= 0 ? "profit" : "loss");
  }

  function renderPetTierRows(tbody, record) {
    tbody.replaceChildren();
    record.skillTiers.forEach(function (tier) {
      var row = document.createElement("tr");

      var skillCell = document.createElement("td");
      var skillSelect = document.createElement("select");
      skillSelect.setAttribute("aria-label", record.name + "技能数");
      var skillPlaceholder = document.createElement("option");
      skillPlaceholder.value = "";
      skillPlaceholder.textContent = "请选择";
      skillSelect.append(skillPlaceholder);
      [2, 3, 4, 5].forEach(function (skillCount) {
        var skillOption = document.createElement("option");
        skillOption.value = skillCount;
        skillOption.textContent = skillCount + "技能";
        skillSelect.append(skillOption);
      });
      skillSelect.value = tier.skillCount === null ? "" : tier.skillCount;
      skillSelect.addEventListener("change", function (event) {
        tier.skillCount = event.target.value === "" ? null : Number(event.target.value);
        saveState();
      });
      skillCell.append(skillSelect);

      var growthCell = document.createElement("td");
      var growthSelect = document.createElement("select");
      growthSelect.setAttribute("aria-label", record.name + "成长");
      var growthPlaceholder = document.createElement("option");
      growthPlaceholder.value = "";
      growthPlaceholder.textContent = "请选择";
      growthSelect.append(growthPlaceholder);
      XYQPetMarket.getGrowthOptions(record.name).forEach(function (growth) {
        var growthOption = document.createElement("option");
        growthOption.value = growth;
        growthOption.textContent = growth;
        growthSelect.append(growthOption);
      });
      growthSelect.value = tier.growth === null || tier.growth === undefined
        ? ""
        : tier.growth;
      growthSelect.addEventListener("change", function (event) {
        tier.growth = event.target.value === "" ? null : Number(event.target.value);
        saveState();
      });
      growthCell.append(growthSelect);

      var gameCoinCell = document.createElement("td");
      gameCoinCell.append(createPriceInput(
        tier,
        "gameCoinPriceWan",
        record.name + "梦幻币收价",
        function () { updateSkillTierRow(row, record, tier); },
      ));

      var costCell = document.createElement("td");
      costCell.className = "pet-market-cost";

      var treasureCell = document.createElement("td");
      treasureCell.append(createPriceInput(
        tier,
        "treasurePriceRmb",
        record.name + "藏宝阁售价",
        function () { updateSkillTierRow(row, record, tier); },
      ));

      var netCell = document.createElement("td");
      netCell.className = "pet-market-net";
      var profitCell = document.createElement("td");
      profitCell.className = "pet-market-profit";

      var actionCell = document.createElement("td");
      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger";
      removeButton.textContent = "删除";
      removeButton.addEventListener("click", function () {
        if (!confirmDelete("确定删除这条技能档吗？")) return;
        record.skillTiers = record.skillTiers.filter(
          function (item) { return item !== tier; },
        );
        saveState();
        renderPetTierRows(tbody, record);
      });
      actionCell.append(removeButton);

      row.append(
        skillCell,
        growthCell,
        gameCoinCell,
        costCell,
        treasureCell,
        netCell,
        profitCell,
        actionCell,
      );
      updateSkillTierRow(row, record, tier);
      tbody.append(row);
    });
  }

  function createPetHeadField(labelText, input) {
    var label = document.createElement("label");
    var span = document.createElement("span");
    span.textContent = labelText;
    label.append(span, input);
    return label;
  }

  function renderPetMarket() {
    var container = document.getElementById("pet-market-records");
    if (!container) return;

    updatePetMarketGoldSummary();
    container.replaceChildren();
    state.petMarketRecords.forEach(function (record) {
      var card = document.createElement("article");
      card.className = "reference-card pet-market-card";
      var head = document.createElement("div");
      head.className = "pet-market-head";

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = record.name;
      nameInput.setAttribute("aria-label", record.name + "名称");
      nameInput.addEventListener("input", function (event) {
        record.name = event.target.value;
        saveState();
        renderPetTierRows(tierBody, record);
      });
      head.append(createPetHeadField("召唤兽", nameInput));

      var tierBody = document.createElement("tbody");
      head.append(createPetHeadField(
        "野生成本（万两）",
        createPriceInput(record, "wildPriceWan", record.name + "野生成本", function () {
          renderPetTierRows(tierBody, record);
        }),
      ));

      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger";
      removeButton.textContent = "删除宝宝";
      removeButton.addEventListener("click", function () {
        if (!confirmDelete("确定删除这只宝宝吗？")) return;
        state.petMarketRecords = state.petMarketRecords.filter(
          function (item) { return item !== record; },
        );
        saveState();
        renderPetMarket();
      });
      head.append(removeButton);
      card.append(head);

      var wrap = document.createElement("div");
      wrap.className = "reference-table-wrap";
      var table = document.createElement("table");
      table.className = "pet-market-table";
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      [
        "技能数",
        "成长",
        "梦幻币价（万两）",
        "折算人民币",
        "藏宝阁价（元）",
        "到手（元）",
        "净利润",
        "操作",
      ].forEach(function (titleText) {
        var cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = titleText;
        headerRow.append(cell);
      });
      thead.append(headerRow);
      table.append(thead, tierBody);
      wrap.append(table);
      card.append(wrap);

      var addTierButton = document.createElement("button");
      addTierButton.type = "button";
      addTierButton.textContent = "添加技能档";
      addTierButton.addEventListener("click", function () {
        record.skillTiers.push(XYQPetMarket.createEmptySkillTier());
        saveState();
        renderPetTierRows(tierBody, record);
      });
      card.append(addTierButton);

      renderPetTierRows(tierBody, record);
      container.append(card);
    });
  }

  function updatePetMarketGoldSummary() {
    var summary = document.getElementById("pet-market-gold-summary");
    if (!summary) return;

    summary.textContent = state.goldPricePerMillion
      ? "当前金价：¥" + displayGoldPrice(state.goldPricePerMillion) + " / " + goldPriceUnitName() +
        "；藏宝阁手续费 " + state.feeRate * 100 + "%，单笔上限 " + state.feeCap + " 元。"
      : "填写区内行情金价后，梦幻币收价可折算人民币。";
  }

  function createInput(type, value, listener) {
    var input = type === "number"
      ? createDecimalInput()
      : document.createElement("input");
    if (type !== "number") input.type = type;
    input.value = type === "number" ? priceValue(value) : value;
    input.addEventListener("input", listener);
    return input;
  }

  function createLabeledCell(labelText, input) {
    var cell = document.createElement("label");
    var span = document.createElement("span");
    span.textContent = labelText;
    cell.append(span, input);
    return cell;
  }

  function currentOpportunity() {
    return state.opportunities.find(function (opportunity) {
      return opportunity.id === state.selectedOpportunityId;
    }) || null;
  }

  function opportunityOptionLabel(opportunity) {
    var skill = XYQOpportunityPlans.skillPlanText(opportunity.skillPlan);
    return opportunityDisplayName(opportunity) +
      " · " + (skill || "未填技能");
  }

  function renderMaterialPriceInputs() {
    if (!materialPriceFields) return;

    materialPriceFields.replaceChildren();
    ["材料名称", "单价（万两）"].forEach(function (title) {
      var header = document.createElement("div");
      header.className = "recipe-header";
      header.textContent = title;
      materialPriceFields.append(header);
    });

    state.materials.forEach(function (material, index) {
      var nameInput = createInput("text", material.name, function (event) {
        material.name = event.target.value;
        saveState();
        renderOpportunities();
        updateResults();
      });
      nameInput.placeholder = "材料" + (index + 1);
      nameInput.setAttribute("aria-label", "统一材料名称" + (index + 1));
      materialPriceFields.append(createLabeledCell("材料名称", nameInput));

      var unitPriceInput = createInput("number", material.unitPrice, function (event) {
        material.unitPrice = numberFromInput(event.target, material.unitPrice);
        saveState();
        renderOpportunities();
        updateResults();
      });
      unitPriceInput.setAttribute("aria-label", material.name + "统一单价");
      materialPriceFields.append(createLabeledCell("单价（万两）", unitPriceInput));
    });
  }

  function renderOpportunityPicker() {
    if (!opportunityPicker) return;

    opportunityPicker.replaceChildren();
    if (!state.opportunities.length) {
      var emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "暂无方案";
      opportunityPicker.append(emptyOption);
      opportunityPicker.value = "";
      opportunityPicker.disabled = true;
      return;
    }

    opportunityPicker.disabled = false;
    state.opportunities.forEach(function (opportunity) {
      var option = document.createElement("option");
      option.value = opportunity.id;
      option.textContent = opportunityOptionLabel(opportunity);
      option.selected = opportunity.id === state.selectedOpportunityId;
      opportunityPicker.append(option);
    });
  }

  function createSkillCountSelect(opportunity) {
    var select = document.createElement("select");
    var currentCount = XYQOpportunityPlans.skillCountInputValue(
      opportunity.skillPlan,
    );
    var counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    if (!counts.includes(currentCount)) counts.push(currentCount);

    counts.forEach(function (count) {
      var option = document.createElement("option");
      option.value = count === 0 ? "" : String(count);
      option.textContent = count === 0 ? "未选择" : count + "技能";
      option.selected = count === currentCount;
      select.append(option);
    });
    select.setAttribute("aria-label", opportunityDisplayName(opportunity) + "技能数量");
    select.onchange = function (event) {
      opportunity.skillPlan = event.target.value
        ? event.target.value + "技能"
        : "";
      saveState();
      renderOpportunityPicker();
      updateResults();
    };
    return select;
  }

  function renderOpportunity(opportunity) {
    var card = document.createElement("article");
    card.className = "opportunity";

    var head = document.createElement("div");
    head.className = "opportunity-head";
    var nameInput = createInput("text", opportunity.name, function (event) {
      opportunity.name = event.target.value;
      saveState();
      renderOpportunityPicker();
      updateResults();
    });
    nameInput.min = "";
    nameInput.placeholder = "召唤兽名字，可随时修改";
    nameInput.setAttribute("aria-label", "召唤兽名称");
    head.append(createLabeledCell("召唤兽名字", nameInput));
    head.append(createLabeledCell("技能数量", createSkillCountSelect(opportunity)));

    var saleInput = createInput("number", opportunity.salePrice, function (event) {
      opportunity.salePrice = numberFromInput(event.target, opportunity.salePrice);
      saveState();
      updateResults();
    });
    saleInput.setAttribute("aria-label", "藏宝阁售价");
    head.append(createLabeledCell("藏宝阁售价（元）", saleInput));

    var extraCostInput = createInput("number", opportunity.extraCostRmb, function (event) {
      opportunity.extraCostRmb = numberFromInput(event.target, opportunity.extraCostRmb);
      saveState();
      updateResults();
    });
    extraCostInput.setAttribute("aria-label", "野生或胚子成本");
    head.append(createLabeledCell("野生/胚子成本（元）", extraCostInput));

    var removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "删除";
    removeButton.addEventListener("click", function () {
      if (!confirmDelete("确定删除这个机会计划吗？")) return;
      var deletedIndex = state.opportunities.findIndex(function (item) {
        return item.id === opportunity.id;
      });
      state.opportunities = state.opportunities.filter(function (item) {
        return item.id !== opportunity.id;
      });
      if (state.selectedOpportunityId === opportunity.id) {
        var next = state.opportunities[deletedIndex] ||
          state.opportunities[deletedIndex - 1];
        state.selectedOpportunityId = next ? next.id : null;
      }
      saveState();
      renderOpportunityPicker();
      renderOpportunities();
      updateResults();
    });
    head.append(removeButton);
    card.append(head);

    var recipe = document.createElement("div");
    recipe.className = "recipe";
    ["材料", "数量", "对标单价"].forEach(function (title) {
      var header = document.createElement("div");
      header.className = "recipe-header";
      header.textContent = title;
      recipe.append(header);
    });

    state.materials.forEach(function (material, itemIndex) {
      var item = opportunity.recipe[itemIndex] || { quantity: 0 };
      var materialName = document.createElement("div");
      materialName.className = "recipe-material";
      materialName.textContent = material.name.trim() || "未命名材料";
      recipe.append(materialName);

      var quantityInput = createInput("number", item.quantity, function (event) {
        item.quantity = numberFromInput(event.target, item.quantity);
        saveState();
        updateResults();
      });
      quantityInput.setAttribute("aria-label", material.name + "数量");
      recipe.append(createLabeledCell("数量", quantityInput));

      var unitPrice = document.createElement("div");
      unitPrice.className = "recipe-unit-price";
      unitPrice.textContent = XYQCalculator.formatGameCoin(material.unitPrice);
      recipe.append(unitPrice);
    });

    card.append(recipe);
    var result = document.createElement("div");
    result.className = "result";
    result.dataset.opportunityId = opportunity.id;
    [
      "材料成本",
      "人民币 / 总成本",
      "手续费 / 净回款",
      "净利润 / 保本售价",
    ].forEach(function (labelText) {
      var cell = document.createElement("div");
      var label = document.createElement("span");
      label.className = "result-label";
      label.textContent = labelText;
      var value = document.createElement("span");
      value.className = "result-value";
      cell.append(label, value);
      result.append(cell);
    });
    card.append(result);
    return card;
  }

  function renderOpportunities() {
    if (!opportunityList) return;

    opportunityList.replaceChildren();
    var opportunity = currentOpportunity();
    if (opportunity) opportunityList.append(renderOpportunity(opportunity));
  }

  function recipeForOpportunity(opportunity) {
    return state.materials.map(function (material, index) {
      var item = opportunity.recipe[index] || {};
      return {
        name: material.name,
        quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
        unitPrice: material.unitPrice,
      };
    });
  }

  function calculateOpportunityValues(opportunity) {
    try {
      return XYQCalculator.calculateOpportunity({
        goldPricePerMillion: state.goldPricePerMillion,
        salePrice: opportunity.salePrice,
        feeRate: state.feeRate,
        feeCap: state.feeCap,
        extraCostRmb: opportunity.extraCostRmb,
        recipe: recipeForOpportunity(opportunity),
      });
    } catch (error) {
      return null;
    }
  }

  function updateResultCard(opportunity, result) {
    try {
      var calculation = calculateOpportunityValues(opportunity);
      if (!calculation) throw new Error("行情数据不完整");
      var values = result.querySelectorAll(".result-value");
      values[0].textContent = XYQCalculator.formatGameCoin(calculation.materialCostGameCoin);
      values[1].textContent =
        "¥" + XYQCalculator.formatCurrency(calculation.materialCostRmb) +
        " / ¥" +
        XYQCalculator.formatCurrency(calculation.totalCostRmb);
      values[2].textContent =
        "¥" + XYQCalculator.formatCurrency(calculation.fee) +
        " / ¥" +
        XYQCalculator.formatCurrency(calculation.netProceeds);
      values[3].textContent =
        "¥" + XYQCalculator.formatCurrency(calculation.profit) +
        " / ¥" +
        XYQCalculator.formatCurrency(calculation.breakEvenSalePrice);
      values[3].classList.toggle("profit", calculation.hasProfit);
      values[3].classList.toggle("loss", !calculation.hasProfit);
      return calculation;
    } catch (error) {
      var values = result.querySelectorAll(".result-value");
      values.forEach(function (value) {
        value.textContent = "—";
        value.classList.remove("profit", "loss");
      });
      return { profit: 0 };
    }
  }

  function opportunityDisplayName(opportunity) {
    return opportunity.name.trim() || "未命名召唤兽";
  }

  function opportunitySummaryLabel(opportunity) {
    return opportunityOptionLabel(opportunity);
  }

  function renderOpportunitySummary() {
    if (!opportunitySummaryList) return;

    opportunitySummaryList.replaceChildren();
    var profitablePlans = [];
    state.opportunities.forEach(function (opportunity) {
      var calculation = calculateOpportunityValues(opportunity);
      if (calculation && calculation.hasProfit) {
        profitablePlans.push({ opportunity, calculation });
      }
    });
    profitablePlans.sort(function (first, second) {
      return second.calculation.profit - first.calculation.profit;
    });

    if (opportunitySummarySection) {
      opportunitySummarySection.hidden = !profitablePlans.length;
    }
    if (!profitablePlans.length) return;

    profitablePlans.forEach(function (plan) {
      var row = document.createElement("li");
      row.dataset.opportunityId = plan.opportunity.id;
      row.title = "藏宝阁手续费 ¥" +
        XYQCalculator.formatCurrency(plan.calculation.fee);
      var name = document.createElement("span");
      name.textContent = opportunitySummaryLabel(plan.opportunity);
      var profit = document.createElement("strong");
      profit.textContent =
        "手续费 ¥" + XYQCalculator.formatCurrency(plan.calculation.fee) +
        " · 到手 ¥" + XYQCalculator.formatCurrency(plan.calculation.netProceeds) +
        " · 利润 ¥" + XYQCalculator.formatCurrency(plan.calculation.profit);
      profit.classList.add("profit");
      row.append(name, profit);
      opportunitySummaryList.append(row);
    });
  }

  function updateResults() {
    if (!opportunityList || !summaryText) return;

    var opportunity = currentOpportunity();
    if (!opportunity) {
      opportunitySummaryList.replaceChildren();
      if (opportunitySummarySection) opportunitySummarySection.hidden = true;
      summaryText.textContent = "暂无方案，请添加一个方案";
      return;
    }

    var result = opportunityList.querySelector(
      '.result[data-opportunity-id="' + opportunity.id + '"]'
    );
    updateResultCard(opportunity, result);
    renderOpportunitySummary();
    summaryText.textContent =
      "已扫描 " + state.opportunities.length + " 个方案：" +
      opportunitySummaryList.children.length + " 个有利润；手续费已扣除";
  }

  function bindOpportunityPicker() {
    if (!opportunityPicker) return;

    opportunityPicker.onchange = function (event) {
      state.selectedOpportunityId = Number(event.target.value);
      saveState();
      renderOpportunityPicker();
      renderOpportunities();
      updateResults();
    };
  }

  function bindMarketInputs() {
    var serverName = document.getElementById("server-name");
    var goldPrice = document.getElementById("gold-price");
    if (!serverName || !goldPrice) return;

    var goldPriceUnit = document.getElementById("gold-price-unit");
    var feeRate = document.getElementById("fee-rate");
    var feeCap = document.getElementById("fee-cap");

    bindDecimalInput(goldPrice);
    bindDecimalInput(feeRate);
    bindDecimalInput(feeCap);
    serverName.value = state.serverName;
    goldPrice.value = priceValue(state.goldPriceInput);
    goldPriceUnit.value = state.goldPriceUnit;
    feeRate.value = state.feeRate;
    feeCap.value = state.feeCap;

    var goldPriceDate = document.getElementById("gold-price-date");
    if (goldPriceDate) goldPriceDate.value = localDateString();
    var stallPriceDate = document.getElementById("stall-price-date");
    if (stallPriceDate) stallPriceDate.value = localDateString();
    renderStallPriceInputs();

    serverName.oninput = function (event) {
      state.serverName = event.target.value;
      saveState();
      renderGoldPriceHistory();
    };
    goldPrice.oninput = function () {
      updateGoldPriceFromInput();
      saveState();
      updateResults();
      updateZhenjingPrice();
      updateFestivalGoldSummary();
    };
    goldPriceUnit.onchange = function () {
      if (state.goldPriceUnit !== goldPriceUnit.value) {
        state.goldPricePerMillion = XYQCalculator.normalizeGoldPriceToPerMillion(
          state.goldPriceInput,
          state.goldPriceUnit,
        );
        state.goldPriceInput = goldPriceInputFromPerMillion(
          state.goldPricePerMillion,
          goldPriceUnit.value,
        );
        goldPrice.value = priceValue(state.goldPriceInput);
        state.goldPriceUnit = goldPriceUnit.value;
      }
      updateGoldPriceFromInput();
      saveState();
      renderGoldPriceHistory();
      updateResults();
      updateZhenjingPrice();
      updateFestivalGoldSummary();
    };
    feeRate.oninput = function (event) {
      state.feeRate = numberFromInput(event.target, state.feeRate);
      saveState();
      updateResults();
    };
    feeCap.oninput = function (event) {
      state.feeCap = numberFromInput(event.target, state.feeCap);
      saveState();
      updateResults();
    };
  }

  function bindClick(elementId, listener) {
    var button = document.getElementById(elementId);
    if (button) button.addEventListener("click", listener);
  }

  function confirmDelete(message) {
    return window.confirm(message || "确定删除吗？删除后无法恢复。");
  }

  bindClick("pet-equipment-add-character", function () {
    var input = document.getElementById("pet-equipment-new-character");
    if (!input) return;
    var character = input.value.trim();
    if (!character) {
      alert("请输入角色名。");
      return;
    }
    if (state.petEquipmentCharacters.includes(character)) {
      alert("角色已存在。");
      return;
    }
    state.petEquipmentCharacters.push(character);
    input.value = "";
    saveState();
    renderPetEquipmentTimes();
  });

  bindClick("pet-equipment-add-record", function () {
    if (!state.petEquipmentCharacters.length) {
      alert("请先添加角色。");
      return;
    }
    state.petEquipmentDeliveryRecords.push(
      XYQPetEquipmentTimes.createEmptyRecord(state.petEquipmentCharacters),
    );
    saveState();
    renderPetEquipmentTimes();
  });

  bindClick("fusion-add-record", function () {
    if (!state.petEquipmentCharacters.length) {
      alert("请先在宠装出货页添加角色。");
      return;
    }
    state.fusionDeliveryRecords.push(
      XYQPetFusionTimes.createEmptyRecord(state.petEquipmentCharacters),
    );
    saveState();
    renderFusionDeliveryTimes();
  });

  bindClick("pet-market-add-record", function () {
    var input = document.getElementById("pet-market-add-name");
    if (!input) return;
    var name = input.value.trim();
    if (!name) {
      alert("请输入召唤兽名。");
      return;
    }
    if (state.petMarketRecords.some(function (record) { return record.name === name; })) {
      alert("召唤兽已存在。");
      return;
    }
    state.petMarketRecords.push(XYQPetMarket.createEmptyRecord(name));
    input.value = "";
    saveState();
    renderPetMarket();
  });

  bindClick("add-opportunity", function () {
    var opportunity = {
      id: opportunitySeq++,
      name: "",
      skillPlan: "",
      salePrice: 0,
      extraCostRmb: 0,
      recipe: blankQuantities(),
    };
    state.opportunities.push(opportunity);
    state.selectedOpportunityId = opportunity.id;
    saveState();
    renderOpportunityPicker();
    renderOpportunities();
    updateResults();
  });

  bindClick("save-gold-price", function () {
    var goldPrice = document.getElementById("gold-price");
    var goldPriceDate = document.getElementById("gold-price-date");
    var price = Number(goldPrice.value);

    if (!state.serverName.trim()) {
      alert("请先填写服务器名称。");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert("请先填写大于 0 的当日金价。");
      return;
    }
    if (!goldPriceDate.value) {
      alert("请选择金价日期。");
      return;
    }

    try {
      state.goldPriceHistory = XYQGoldPriceHistory.upsertGoldPriceRecord(
        state.goldPriceHistory,
        {
          date: goldPriceDate.value,
          serverName: state.serverName,
          goldPricePerMillion: state.goldPricePerMillion,
        },
      );
      saveState();
      renderGoldPriceHistory();
      updateResults();
    } catch (error) {
      alert(error.message);
    }
  });

  bindClick("add-stall-price-row", function () {
    state.stallPriceDrafts.push({ item: "", unitPrice: null });
    saveState();
    renderStallPriceInputs();
  });


  bindClick("save-stall-price", function () {
    var stallPriceDate = document.getElementById("stall-price-date");
    var drafts = state.stallPriceDrafts.map(function (draft) {
      return {
        item: draft.item.trim(),
        unitPrice: draft.unitPrice,
      };
    }).filter(function (draft) {
      return draft.item || draft.unitPrice !== null;
    });
    var records = [];
    var names = new Set();

    if (!stallPriceDate.value) {
      alert("请选择摆摊价日期。");
      return;
    }

    if (!drafts.length) {
      alert("请先添加物品行并填写名称、单价。");
      return;
    }

    for (var index = 0; index < drafts.length; index += 1) {
      var draft = drafts[index];
      if (!draft.item) {
        alert("第 " + (index + 1) + " 行请填写物品名。");
        return;
      }
      if (names.has(draft.item)) {
        alert(draft.item + " 在本次填写中重复了。");
        return;
      }
      names.add(draft.item);
      if (draft.unitPrice === null || draft.unitPrice <= 0) {
        alert(draft.item + " 的摆摊单价必须大于 0。");
        return;
      }
      records.push({
        date: stallPriceDate.value,
        item: draft.item,
        unitPrice: draft.unitPrice,
      });
    }

    try {
      state.stallPriceHistory = records.reduce(function (history, record) {
        return XYQStallPriceHistory.upsertStallPriceRecord(history, record);
      }, state.stallPriceHistory);
      state.materials = XYQStallPriceHistory.applyLatestStallPrices(
        state.stallPriceHistory,
        state.materials,
      );
      saveState();
      renderStallPriceHistory();
      renderMaterialPriceInputs();
      renderOpportunities();
      updateResults();
    } catch (error) {
      alert(error.message);
    }
  });

  bindClick("export-data", function () {
    var blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "xyq-backup-" + localDateString() + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  bindClick("import-data", function () {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.addEventListener("load", function () {
        try {
          var imported = JSON.parse(reader.result);
          var normalizedImport = XYQDataBackup.validateBackup(imported);
          if (!confirm("导入会覆盖当前所有填写的数据，继续吗？")) return;
          localStorage.setItem(storageKey, JSON.stringify(normalizedImport));
          location.reload();
        } catch (error) {
          alert(error.message);
        }
      });
      reader.readAsText(file);
    });
    input.click();
  });

  bindClick("reset-data", function () {
    if (!confirm("恢复默认会清空当前填写的行情，继续吗？")) return;
    state = structuredClone(defaultState);
    opportunitySeq = defaultState.opportunities.length + 1;
    saveState();
    bindMarketInputs();
    renderMaterialPriceInputs();
    renderGoldPriceHistory();
    renderStallPriceHistory();
    renderFloorMarket();
    renderEquipmentMarket();
    renderPetEquipmentTimes();
    renderFusionDeliveryTimes();
    renderEyePriceMarket();
    renderSpiritStoneMarket();
    renderFestivalMarket();
    renderCraftPriceMarket();
    renderPetMarket();
    renderOpportunityPicker();
    renderOpportunities();
    updateResults();
  });

  bindMarketInputs();
  renderGoldPriceHistory();
  renderStallPriceHistory();
  renderFloorMarket();
  renderEquipmentMarket();
  renderPetEquipmentTimes();
  renderFusionDeliveryTimes();
  renderEyePriceMarket();
  renderSpiritStoneMarket();
  renderFestivalMarket();
  renderCraftPriceMarket();
  renderPetMarket();
  bindOpportunityPicker();
  renderOpportunityPicker();
  renderMaterialPriceInputs();
  renderOpportunities();
  updateResults();
})();
