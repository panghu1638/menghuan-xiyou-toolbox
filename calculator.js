const defaultMaterialNames = [
  "超级金柳露",
  "60级武器",
  "70级武器",
  "80级武器",
  "仙露小丸子",
  "炼兽丹",
];

const defaultMaterials = defaultMaterialNames.map((name) => ({
  name,
  unitPrice: 0,
}));

const defaultRecipe = defaultMaterialNames.map((name) => ({
  name,
  quantity: 0,
}));

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateOpportunity({
  goldPricePerMillion,
  salePrice,
  feeRate = 0.05,
  feeCap = 1000,
  extraCostRmb = 0,
  recipe,
}) {
  const numbers = [
    goldPricePerMillion,
    salePrice,
    feeRate,
    feeCap,
    extraCostRmb,
    ...recipe.flatMap(({ quantity, unitPrice }) => [quantity, unitPrice]),
  ];

  if (numbers.some((value) => !Number.isFinite(value))) {
    throw new Error("行情数据必须是有效数字");
  }
  if (goldPricePerMillion < 0 || salePrice < 0 || feeRate < 0 || feeCap < 0 || extraCostRmb < 0) {
    throw new Error("价格、手续费率、上限和野生成本不能为负数");
  }
  if (recipe.some(({ quantity, unitPrice }) => quantity < 0 || unitPrice < 0)) {
    throw new Error("材料数量和单价不能为负数");
  }

  const materialCostGameCoin = recipe.reduce(
    (total, { quantity, unitPrice }) => total + quantity * unitPrice,
    0,
  );
  const materialCostRmb = roundCurrency(
    (materialCostGameCoin / 100) * goldPricePerMillion,
  );
  const fee = roundCurrency(Math.min(salePrice * feeRate, feeCap));
  const netProceeds = roundCurrency(salePrice - fee);
  const totalCostRmb = roundCurrency(materialCostRmb + extraCostRmb);
  const profit = roundCurrency(netProceeds - totalCostRmb);
  const profitMargin = totalCostRmb === 0 ? 0 : profit / totalCostRmb;
  const capStartSalePrice = feeRate > 0 ? feeCap / feeRate : Infinity;
  const capStartNetProceeds = capStartSalePrice * (1 - feeRate);
  const breakEvenSalePrice =
    totalCostRmb <= capStartNetProceeds
      ? roundCurrency(totalCostRmb / (1 - feeRate))
      : roundCurrency(totalCostRmb + feeCap);

  return {
    materialCostGameCoin,
    materialCostRmb,
    totalCostRmb,
    fee,
    netProceeds,
    profit,
    profitMargin,
    breakEvenSalePrice,
    hasProfit: profit > 0,
  };
}

function formatCurrency(value) {
  return roundCurrency(value).toFixed(2);
}

function formatGameCoin(value) {
  return `${roundCurrency(value).toFixed(2)} 万两`;
}

function normalizeGoldPriceToPerMillion(value, unit) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("金价必须是不小于 0 的数字");
  }
  if (unit === "wan") return price * 100;
  if (unit === "million") return price;
  if (unit === "bundle") return price / 30;
  throw new Error("金价单位必须是 wan、million 或 bundle");
}

globalThis.XYQCalculator = {
  calculateOpportunity,
  defaultMaterials: structuredClone(defaultMaterials),
  defaultRecipe: structuredClone(defaultRecipe),
  formatCurrency,
  formatGameCoin,
  normalizeGoldPriceToPerMillion,
};
