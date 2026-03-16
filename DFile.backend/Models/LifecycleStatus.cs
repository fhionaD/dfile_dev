namespace DFile.backend.Models
{
    public enum LifecycleStatus
    {
        Registered = 0,
        Allocated = 1,
        InUse = 2,
        UnderMaintenance = 3,
        UnderReview = 4,
        ForReplacement = 5,
        Disposed = 6,
        Archived = 7
    }
}
