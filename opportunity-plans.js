(function () {
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

  globalThis.XYQOpportunityPlans = {
    skillCountInputValue,
    skillPlanText,
  };
})();
