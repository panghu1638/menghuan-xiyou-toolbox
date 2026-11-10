(function () {
  var defaultOpportunityNames = [
    "持国巡守",
    "谛听",
    "多闻巡守",
    "广目巡守",
    "人形猫灵",
    "涂山瞳",
  ];

  function skillCountInputValue(skillPlan) {
    var match = String(skillPlan || "").match(/\d+/);
    return match ? Number(match[0]) : "";
  }

  function skillPlanText(value) {
    if (value === "" || value === null || value === undefined) return "";
    var match = String(value).match(/\d+/);
    if (!match) return "";
    var count = Number(match[0]);
    return Math.trunc(count) + "技";
  }

  function missingOpportunityNames(opportunities) {
    return defaultOpportunityNames.filter(function (defaultName) {
      return !opportunities.some(function (opportunity) {
        return opportunity.name.trim() === defaultName;
      });
    });
  }

  globalThis.XYQOpportunityPlans = {
    defaultOpportunityNames,
    missingOpportunityNames,
    skillCountInputValue,
    skillPlanText,
  };
})();
