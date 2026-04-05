using DFile.backend.Models;

namespace DFile.backend.Services
{
    /// <summary>
    /// Validates maintenance schedules and computes the next due date from frequency, start, and end.
    /// </summary>
    public static class MaintenanceSchedulingService
    {
        public static readonly string[] SupportedFrequencies =
        {
            "One-time", "Daily", "Weekly", "Monthly", "Yearly", "Quarterly"
        };

        public static bool IsRecurring(string? frequency) =>
            !string.IsNullOrWhiteSpace(frequency) &&
            !string.Equals(frequency, "One-time", StringComparison.OrdinalIgnoreCase);

        /// <summary>Returns null if valid; otherwise an error message.</summary>
        public static string? ValidateSchedule(string? frequency, DateTime? startDate, DateTime? endDate)
        {
            var f = frequency?.Trim() ?? "";
            if (!string.IsNullOrEmpty(f) && !SupportedFrequencies.Any(s => s.Equals(f, StringComparison.OrdinalIgnoreCase)))
                return $"Frequency must be one of: {string.Join(", ", SupportedFrequencies)}.";

            if (IsRecurring(f))
            {
                if (!startDate.HasValue)
                    return "Start date is required when a recurring frequency (Daily, Weekly, Monthly, or Yearly) is selected.";
                if (!endDate.HasValue)
                    return "End date is required for recurring schedules so occurrences can be generated.";
            }

            if (startDate.HasValue && endDate.HasValue && endDate.Value.Date < startDate.Value.Date)
                return "End date cannot be before start date.";

            return null;
        }

        /// <summary>
        /// Inclusive occurrence dates from start through end (date-only, UTC kind). One-time returns a single start date.
        /// </summary>
        public static IReadOnlyList<DateTime> GenerateInclusiveOccurrenceDatesUtc(DateTime startDate, DateTime endDate, string? frequency)
        {
            var f = frequency?.Trim() ?? "";
            var end = endDate.Date;
            var list = new List<DateTime>();
            if (!IsRecurring(f))
            {
                list.Add(DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc));
                return list;
            }

            var current = startDate.Date;
            const int max = 400;
            while (current <= end && list.Count < max)
            {
                list.Add(DateTime.SpecifyKind(current, DateTimeKind.Utc));
                var next = StepForward(DateTime.SpecifyKind(current, DateTimeKind.Utc), f).Date;
                if (next <= current)
                    break;
                current = next;
            }

            return list;
        }

        public static DateTime StepForward(DateTime dateUtc, string? frequency)
        {
            if (string.IsNullOrWhiteSpace(frequency)) return dateUtc;
            if (string.Equals(frequency, "Daily", StringComparison.OrdinalIgnoreCase))
                return dateUtc.AddDays(1);
            if (string.Equals(frequency, "Weekly", StringComparison.OrdinalIgnoreCase))
                return dateUtc.AddDays(7);
            if (string.Equals(frequency, "Monthly", StringComparison.OrdinalIgnoreCase))
                return dateUtc.AddMonths(1);
            if (string.Equals(frequency, "Quarterly", StringComparison.OrdinalIgnoreCase))
                return dateUtc.AddMonths(3);
            if (string.Equals(frequency, "Yearly", StringComparison.OrdinalIgnoreCase))
                return dateUtc.AddYears(1);
            return dateUtc;
        }

        /// <summary>Next occurrence on or after <paramref name="fromUtc"/> within optional end date; null if none.</summary>
        public static DateTime? ComputeNextDueDate(MaintenanceRecord r, DateTime fromUtc) =>
            ComputeNextDueDate(
                r.IsArchived,
                r.Status,
                r.Frequency,
                r.StartDate,
                r.EndDate,
                fromUtc);

        /// <summary>
        /// Scalar overload for list projections — avoids materializing full <see cref="MaintenanceRecord"/> graphs.
        /// </summary>
        public static DateTime? ComputeNextDueDate(
            bool isArchived,
            string? status,
            string? frequency,
            DateTime? startDate,
            DateTime? endDate,
            DateTime fromUtc)
        {
            if (isArchived || string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase))
                return null;

            var freq = frequency?.Trim() ?? "";
            var fromDate = fromUtc.Date;

            if (string.IsNullOrWhiteSpace(freq) || string.Equals(freq, "One-time", StringComparison.OrdinalIgnoreCase))
            {
                if (!startDate.HasValue) return null;
                var s = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                if (s < fromDate) return null;
                if (endDate.HasValue && s > endDate.Value.Date) return null;
                return s;
            }

            if (!startDate.HasValue) return null;

            var end = endDate?.Date;
            var anchor = startDate.Value.Date;

            DateTime? candidate = null;
            if (string.Equals(freq, "Daily", StringComparison.OrdinalIgnoreCase))
                candidate = NextDaily(anchor, fromDate);
            else if (string.Equals(freq, "Weekly", StringComparison.OrdinalIgnoreCase))
                candidate = NextWeekly(anchor, fromDate);
            else if (string.Equals(freq, "Monthly", StringComparison.OrdinalIgnoreCase))
                candidate = NextSteppingMonths(anchor, fromDate, 1);
            else if (string.Equals(freq, "Quarterly", StringComparison.OrdinalIgnoreCase))
                candidate = NextSteppingMonths(anchor, fromDate, 3);
            else if (string.Equals(freq, "Yearly", StringComparison.OrdinalIgnoreCase))
                candidate = NextYearly(anchor, fromDate);

            if (!candidate.HasValue) return null;
            if (end.HasValue && candidate.Value.Date > end.Value)
                return null;
            return DateTime.SpecifyKind(candidate.Value.Date, DateTimeKind.Utc);
        }

        private static DateTime NextDaily(DateTime anchor, DateTime fromDate)
        {
            if (anchor >= fromDate) return anchor;
            var days = (fromDate - anchor).Days;
            return anchor.AddDays(days);
        }

        private static DateTime NextWeekly(DateTime anchor, DateTime fromDate)
        {
            if (anchor >= fromDate) return anchor;
            var days = (fromDate - anchor).Days;
            var periods = (int)Math.Ceiling(days / 7.0);
            return anchor.AddDays(periods * 7);
        }

        /// <summary>First schedule date &gt;= fromDate using AddMonths(step) from anchor.</summary>
        private static DateTime? NextSteppingMonths(DateTime anchor, DateTime fromDate, int stepMonths)
        {
            if (stepMonths <= 0) return null;
            if (anchor >= fromDate) return anchor;
            var cursor = anchor;
            const int maxSteps = 2400;
            var steps = 0;
            while (cursor < fromDate && steps++ < maxSteps)
                cursor = cursor.AddMonths(stepMonths);
            return steps >= maxSteps ? null : cursor;
        }

        private static DateTime NextYearly(DateTime anchor, DateTime fromDate)
        {
            if (anchor >= fromDate) return anchor;
            var years = fromDate.Year - anchor.Year;
            var cursor = anchor.AddYears(years);
            if (cursor < fromDate)
                cursor = cursor.AddYears(1);
            return cursor;
        }
    }
}
