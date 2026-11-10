(function () {
  const records = [
    { name: "远古", price: 300, saleTimes: "14.28" },
    { name: "齐天", price: 666, saleTimes: "11.07、21.36" },
    { name: "海洋", price: 666, saleTimes: "23.05、23.27、13.28" },
    { name: "绮梦舞会", price: 666, saleTimes: "0.26、19.57" },
    { name: "黑金", price: 1288, saleTimes: "16.21、23.26、0.15、20.37" },
    { name: "浓情蜜意", price: 666, saleTimes: "1.55、20.37" },
    { name: "叮当猫", price: 666, saleTimes: "16.05、01.37、16.56" },
    { name: "血之源", price: 2600, saleTimes: "" },
    { name: "青丘", price: 1280, saleTimes: "01.56、0.52、23.55" },
    { name: "卧云", price: 2888, saleTimes: "20.55、18.05、0.38" },
    { name: "雪之源", price: 2888, saleTimes: "17.05、0.27、18.18" },
    { name: "云朵", price: 666, saleTimes: "1100、0.57、01.27、23.46、0.36" },
    { name: "兔子", price: 666, saleTimes: "0.28" },
    { name: "情系千年", price: 1288, saleTimes: "0.22" },
    { name: "绿野仙踪", price: 0, saleTimes: "18.2" },
  ];

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

  globalThis.XYQFloorMarket = {
    createFloorRecord,
    defaultFloorRecords: structuredClone(records),
  };
})();
