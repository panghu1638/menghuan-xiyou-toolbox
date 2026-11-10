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
    equipmentRecords: structuredClone(XYQEquipmentPrices.defaultEquipmentRecords),
    eyePriceRecords: structuredClone(XYQEquipmentPrices.defaultEyePriceRecords),
    stoneLevelOnePrices: structuredClone(XYQSpiritStones.defaultLevelOnePrices),
    stoneComparisonRecords: structuredClone(XYQSpiritStones.defaultComparisonRecords),
    stoneTargetLevel: 10,
    yuanxiaoRecords: structuredClone(XYQFestivalItems.defaultYuanxiaoRecords),
    zhenjingPriceWan: XYQFestivalItems.defaultZhenjingPriceWan,
    selectedOpportunityId: 1,
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
  saveState();
  var opportunityList = document.getElementById("opportunities");
  var opportunitySummarySection = document.getElementById("opportunity-summary-section");
  var opportunitySummaryList = document.getElementById("opportunity-summary-list");
  var summaryText = document.getElementById("summary-text");
  var opportunityPicker = document.getElementById("opportunity-picker");
  var materialPriceFields = document.getElementById("material-price-fields");

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !Array.isArray(saved.opportunities)) {
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
      saved.equipmentRecords = Array.isArray(saved.equipmentRecords)
        ? saved.equipmentRecords
        : structuredClone(XYQEquipmentPrices.defaultEquipmentRecords);
      saved.eyePriceRecords = Array.isArray(saved.eyePriceRecords)
        ? saved.eyePriceRecords
        : structuredClone(XYQEquipmentPrices.defaultEyePriceRecords);
      var eyeLevelOrder = [115, 125, 105];
      saved.eyePriceRecords = saved.eyePriceRecords.slice().sort(function (first, second) {
        var levelDifference =
          eyeLevelOrder.indexOf(first.level) - eyeLevelOrder.indexOf(second.level);
        if (levelDifference !== 0) return levelDifference;
        if (first.type !== second.type) return first.type === "三眼" ? -1 : 1;
        return first.power - second.power;
      });
      saved.stoneLevelOnePrices = saved.stoneLevelOnePrices && typeof saved.stoneLevelOnePrices === "object"
        ? Object.assign(
          structuredClone(XYQSpiritStones.defaultLevelOnePrices),
          saved.stoneLevelOnePrices,
        )
        : structuredClone(XYQSpiritStones.defaultLevelOnePrices);
      saved.stoneComparisonRecords = Array.isArray(saved.stoneComparisonRecords)
        ? saved.stoneComparisonRecords
        : structuredClone(XYQSpiritStones.defaultComparisonRecords);
      if (!saved.stoneComparisonRecords.every(function (record) {
        return record && record.sourceStone;
      })) {
        saved.stoneComparisonRecords = structuredClone(
          XYQSpiritStones.defaultComparisonRecords,
        );
      }
      saved.stoneTargetLevel = saved.stoneTargetLevel >= 1 && saved.stoneTargetLevel <= 10
        ? saved.stoneTargetLevel
        : 10;
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
      return saved;
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
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

  function blankQuantities() {
    return state.materials.map(function () {
      return { quantity: 0 };
    });
  }

  function numberFromInput(input, fallback) {
    var value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function optionalNumberFromInput(input, fallback) {
    if (input.value === "") return null;
    var value = Number(input.value);
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
      var priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.min = "0";
      priceInput.step = "1";
      priceInput.value = priceValue(record.price);
      priceInput.setAttribute("aria-label", record.name + "价格");
      priceInput.addEventListener("input", function (event) {
        record.price = numberFromInput(event.target, record.price);
        saveState();
      });
      priceCell.append(priceInput);

      var timeCell = document.createElement("td");
      var timeInput = document.createElement("input");
      timeInput.type = "text";
      timeInput.value = record.saleTimes;
      timeInput.setAttribute("aria-label", record.name + "出货时间");
      timeInput.addEventListener("input", function (event) {
        record.saleTimes = event.target.value;
        saveState();
      });
      timeCell.append(timeInput);

      row.append(nameCell, priceCell, timeCell);
      tbody.append(row);
    });
  }

  function priceValue(value) {
    return value === null || value === undefined || Number(value) === 0
      ? ""
      : value;
  }

  function createPriceInput(record, propertyName, ariaLabel, listener) {
    var input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.01";
    input.placeholder = "空";
    input.value = priceValue(record[propertyName]);
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("input", function (event) {
      record[propertyName] = optionalNumberFromInput(event.target, record[propertyName]);
      saveState();
      listener();
    });
    return input;
  }

  function updateEquipmentRow(row, record) {
    var calculation = XYQEquipmentPrices.calculateEquipmentArbitrage({
      stallPriceWan: record.stallPriceWan,
      treasurePriceRmb: record.treasurePriceRmb,
      goldPricePerMillion: state.goldPricePerMillion,
      feeRate: state.feeRate,
      feeCap: state.feeCap,
    });
    var costCell = row.querySelector(".equipment-cost");
    var profitCell = row.querySelector(".equipment-profit");

    if (!calculation) {
      costCell.textContent = "—";
      profitCell.textContent = "—";
      profitCell.className = "equipment-profit";
      return;
    }

    costCell.textContent =
      "¥" + XYQCalculator.formatCurrency(calculation.stallCostRmb) +
      " / ¥" +
      XYQCalculator.formatCurrency(calculation.fee);
    profitCell.textContent = "¥" + XYQCalculator.formatCurrency(calculation.profit);
    profitCell.className = "equipment-profit " + (calculation.profit >= 0 ? "profit" : "loss");
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
      ["伤害", "摆摊（万两）", "藏宝阁（元）", "摆摊成本 / 手续费", "净差价"].forEach(
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
            function () { updateEquipmentRow(row, record); },
          ));
          var treasureCell = document.createElement("td");
          treasureCell.append(createPriceInput(
            record,
            "treasurePriceRmb",
            category + record.damage + "藏宝阁价",
            function () { updateEquipmentRow(row, record); },
          ));
          var costCell = document.createElement("td");
          costCell.className = "equipment-cost";
          var profitCell = document.createElement("td");
          profitCell.className = "equipment-profit";

          row.append(damageCell, stallCell, treasureCell, costCell, profitCell);
          tbody.append(row);
        });

      table.append(thead, tbody);
      wrap.append(table);
      card.append(wrap);
      groups.append(card);
    });

    updateEquipmentResults();
  }

  function updateEquipmentResults() {
    var rows = document.querySelectorAll('#equipment-groups tr[data-category]');
    rows.forEach(function (row) {
      var record = XYQEquipmentPrices.findEquipmentRecord(
        state.equipmentRecords,
        row.dataset.category,
        Number(row.dataset.damage),
      );
      if (record) updateEquipmentRow(row, record);
    });
    updateEquipmentGoldSummary();
  }

  function updateEquipmentGoldSummary() {
    var summary = document.getElementById("equipment-gold-summary");
    if (!summary) return;

    if (!state.goldPricePerMillion) {
      summary.textContent = "请先在区内行情页填写金价，再回到本页计算。";
      return;
    }
    summary.textContent =
      "当前金价：¥" + displayGoldPrice(state.goldPricePerMillion) +
      " / " + goldPriceUnitName() +
      "；手续费率 " + (state.feeRate * 100).toFixed(0) +
      "%，上限 ¥" + XYQCalculator.formatCurrency(state.feeCap) + "。";
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
      summary.textContent = "请先在区内行情页填写金价，再回到本页比价。";
      return;
    }
    summary.textContent =
      "当前金价：¥" + displayGoldPrice(state.goldPricePerMillion) +
      " / " + goldPriceUnitName() +
      "；比价等级：" + state.stoneTargetLevel + "级；手续费率 " +
      (state.feeRate * 100).toFixed(0) + "%，上限 ¥" +
      XYQCalculator.formatCurrency(state.feeCap) + "。";
  }

  function updateSpiritStoneRow(row, record) {
    var calculation = XYQSpiritStones.calculateStoneArbitrage({
      stone: record.stone,
      levelOnePriceWan: state.stoneLevelOnePrices[record.stone],
      targetLevel: state.stoneTargetLevel,
      treasurePriceRmb: record.treasurePriceRmb,
      goldPricePerMillion: state.goldPricePerMillion,
      feeRate: state.feeRate,
      feeCap: state.feeCap,
    });
    var attributeCell = row.querySelector(".stone-attribute-value");
    var costCell = row.querySelector(".stone-cost");
    var netCell = row.querySelector(".stone-net");
    var profitCell = row.querySelector(".stone-profit");
    var attributeValue = XYQSpiritStones.attributeValues(
      record.attribute,
      state.stoneTargetLevel,
    );
    attributeCell.textContent = attributeValue === null ? "—" : String(attributeValue);

    if (!calculation) {
      costCell.textContent = "—";
      netCell.textContent = "—";
      profitCell.textContent = "—";
      profitCell.className = "stone-profit";
      return;
    }

    costCell.textContent =
      XYQCalculator.formatGameCoin(calculation.costWan) +
      " / ¥" +
      XYQCalculator.formatCurrency(calculation.costRmb);
    netCell.textContent =
      "¥" + XYQCalculator.formatCurrency(calculation.fee) +
      " / ¥" +
      XYQCalculator.formatCurrency(calculation.netProceeds);
    profitCell.textContent = "¥" + XYQCalculator.formatCurrency(calculation.profit);
    profitCell.className = "stone-profit " + (calculation.profit >= 0 ? "profit" : "loss");
  }

  function updateSpiritStoneResults() {
    document.querySelectorAll("#stone-comparison tr[data-attribute]").forEach(function (row) {
      var record = state.stoneComparisonRecords.find(function (item) {
        return item.attribute === row.dataset.attribute;
      });
      if (record) updateSpiritStoneRow(row, record);
    });
    updateSpiritStoneSummary();
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
            var input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.step = "0.01";
            input.value = priceValue(state.stoneLevelOnePrices[stoneName]);
            input.setAttribute("aria-label", stoneName + "1级价格");
            input.addEventListener("input", function (event) {
              state.stoneLevelOnePrices[stoneName] = numberFromInput(
                event.target,
                state.stoneLevelOnePrices[stoneName],
              );
              saveState();
              updateStonePriceCells(stoneName);
              updateSpiritStoneResults();
            });
            priceCell.append(input);
          } else {
            var multiplier = XYQSpiritStones.stoneMultiplier(stoneName, level);
            var multiplierText = document.createElement("span");
            multiplierText.className = "stone-level-multiplier";
            multiplierText.textContent = "×" + multiplier;
            var priceText = document.createElement("div");
            priceText.className = "stone-level-price";
            priceCell.append(priceText, multiplierText);
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
  }

  function renderSpiritStoneMarket() {
    var tbody = document.getElementById("stone-comparison");
    var levelSelect = document.getElementById("stone-target-level");
    if (!tbody || !levelSelect) return;

    levelSelect.value = state.stoneTargetLevel;
    levelSelect.addEventListener("change", function (event) {
      state.stoneTargetLevel = Number(event.target.value);
      saveState();
      updateSpiritStoneResults();
    });

    tbody.replaceChildren();
    state.stoneComparisonRecords.forEach(function (record) {
      var row = document.createElement("tr");
      row.dataset.attribute = record.attribute;

      var nameCell = document.createElement("td");
      nameCell.textContent = record.attribute + " / " + record.stone;
      var sourceCell = document.createElement("td");
      sourceCell.textContent = record.sourceStone;
      var attributeCell = document.createElement("td");
      attributeCell.className = "stone-attribute-value";
      var costCell = document.createElement("td");
      costCell.className = "stone-cost";
      var treasureCell = document.createElement("td");
      treasureCell.append(createPriceInput(
        record,
        "treasurePriceRmb",
        record.attribute + "藏宝阁价",
        function () { updateSpiritStoneRow(row, record); },
      ));
      var netCell = document.createElement("td");
      netCell.className = "stone-net";
      var profitCell = document.createElement("td");
      profitCell.className = "stone-profit";

      row.append(nameCell, sourceCell, attributeCell, costCell, treasureCell, netCell, profitCell);
      tbody.append(row);
    });

    updateSpiritStoneResults();
    renderStoneTierTables();
  }

  function updateFestivalGoldSummary() {
    var summary = document.getElementById("festival-gold-summary");
    if (!summary) return;

    summary.textContent = state.goldPricePerMillion
      ? "元宵只记录万两价格；炼兽珍经按当前金价 ¥" +
        displayGoldPrice(state.goldPricePerMillion) + " / " + goldPriceUnitName() + "折算。"
      : "元宵只记录万两价格；填写区内行情金价后，炼兽珍经可折算人民币。";
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

  function createInput(type, value, step, listener) {
    var input = document.createElement("input");
    input.type = type;
    input.min = "0";
    input.step = step;
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
      var nameInput = createInput("text", material.name, "any", function (event) {
        material.name = event.target.value;
        saveState();
        renderOpportunities();
        updateResults();
      });
      nameInput.min = "";
      nameInput.placeholder = "材料" + (index + 1);
      nameInput.setAttribute("aria-label", "统一材料名称" + (index + 1));
      materialPriceFields.append(createLabeledCell("材料名称", nameInput));

      var unitPriceInput = createInput("number", material.unitPrice, "0.01", function (event) {
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
    var nameInput = createInput("text", opportunity.name, "any", function (event) {
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

    var saleInput = createInput("number", opportunity.salePrice, "0.01", function (event) {
      opportunity.salePrice = numberFromInput(event.target, opportunity.salePrice);
      saveState();
      updateResults();
    });
    saleInput.setAttribute("aria-label", "藏宝阁售价");
    head.append(createLabeledCell("藏宝阁售价（元）", saleInput));

    var extraCostInput = createInput("number", opportunity.extraCostRmb, "0.01", function (event) {
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

      var quantityInput = createInput("number", item.quantity, "1", function (event) {
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
    renderEyePriceMarket();
    renderSpiritStoneMarket();
    renderFestivalMarket();
    renderOpportunityPicker();
    renderOpportunities();
    updateResults();
  });

  bindMarketInputs();
  renderGoldPriceHistory();
  renderStallPriceHistory();
  renderFloorMarket();
  renderEquipmentMarket();
  renderEyePriceMarket();
  renderSpiritStoneMarket();
  renderFestivalMarket();
  bindOpportunityPicker();
  renderOpportunityPicker();
  renderMaterialPriceInputs();
  renderOpportunities();
  updateResults();
})();
