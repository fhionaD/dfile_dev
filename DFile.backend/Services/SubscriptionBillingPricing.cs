using System;
using DFile.backend.Models;

namespace DFile.backend.Services
{
    /// <summary>
    /// Test-oriented subscription prices in PHP (whole pesos). Amounts sent to PayMongo are centavos (×100).
    /// </summary>
    public static class SubscriptionBillingPricing
    {
        public static int GetPricePesos(SubscriptionPlanType plan) => plan switch
        {
            SubscriptionPlanType.Starter => 500,
            SubscriptionPlanType.Basic => 1_000,
            SubscriptionPlanType.Pro => 3_000,
            _ => throw new ArgumentOutOfRangeException(nameof(plan), plan, null)
        };

        public static int GetAmountCentavos(SubscriptionPlanType plan) => GetPricePesos(plan) * 100;

        public static string GetSummary(SubscriptionPlanType plan) => plan switch
        {
            SubscriptionPlanType.Starter => "Up to 20 rooms, 10 personnel, core asset tracking & depreciation.",
            SubscriptionPlanType.Basic => "Up to 100 rooms, 30 personnel, includes maintenance module.",
            SubscriptionPlanType.Pro => "Up to 200 rooms, 200 personnel, advanced reports & maintenance.",
            _ => string.Empty
        };
    }
}
