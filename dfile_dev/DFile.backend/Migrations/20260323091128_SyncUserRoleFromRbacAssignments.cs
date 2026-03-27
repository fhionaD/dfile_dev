using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace dfile.backend.Migrations
{
    /// <inheritdoc />
    public partial class SyncUserRoleFromRbacAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Align Users.Role / Users.RoleLabel with RBAC: UserRoleAssignment → TenantRole → RoleTemplate.
            // JWT ClaimTypes.Role uses Users.Role; module permissions use assignments — this removes drift.
            // One row per user: first assignment by UserRoleAssignments.Id when multiple exist.
            migrationBuilder.Sql("""
                UPDATE u
                SET
                    u.Role = x.TemplateName,
                    u.RoleLabel = CASE
                        WHEN x.CustomLabel IS NOT NULL AND LEN(LTRIM(RTRIM(x.CustomLabel))) > 0
                        THEN x.CustomLabel
                        ELSE x.TemplateName
                    END
                FROM Users AS u
                INNER JOIN (
                    SELECT
                        ura.UserId,
                        rt.Name AS TemplateName,
                        tr.CustomLabel,
                        ROW_NUMBER() OVER (PARTITION BY ura.UserId ORDER BY ura.Id) AS rn
                    FROM UserRoleAssignments AS ura
                    INNER JOIN TenantRoles AS tr ON tr.Id = ura.TenantRoleId
                    INNER JOIN RoleTemplates AS rt ON rt.Id = tr.RoleTemplateId
                    WHERE rt.IsArchived = CAST(0 AS bit)
                ) AS x ON x.UserId = u.Id AND x.rn = 1
                WHERE u.TenantId IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only repair; no schema change to revert.
        }
    }
}
