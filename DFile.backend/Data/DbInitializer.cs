using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            try
            {
                context.Database.Migrate();
            }
            catch (Exception ex)
            {
                var msg = ex.Message + (ex.InnerException?.Message ?? "");
                if (msg.Contains("already an object named") || msg.Contains("There is already"))
                {
                    try
                    {
                        foreach (var migration in context.Database.GetPendingMigrations().ToList())
                        {
                            context.Database.ExecuteSqlRaw(
                                "IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = {0}) " +
                                "INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ({0}, '8.0.0')",
                                migration);
                        }
                    }
                    catch { /* best-effort */ }
                }
            }

            SeedAll(context);
        }

        private static void SeedAll(AppDbContext context)
        {
            // ------------------------------------------------------------------
            // TENANTS (3)
            // ------------------------------------------------------------------
            var t1 = UpsertTenant(context, "Alpha Holdings",   SubscriptionPlanType.Pro);
            var t2 = UpsertTenant(context, "Beta Industries",  SubscriptionPlanType.Basic);
            var t3 = UpsertTenant(context, "Gamma Logistics",  SubscriptionPlanType.Starter);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // USERS (9) â€” 2 Super Admins + 3 Alpha + 3 Beta + 1 Gamma
            // ------------------------------------------------------------------
            var users = new[]
            {
                ("Super",   "Admin One",        "superadmin@dfile.com",          "superadmin123",    "Super Admin",  "System Super Admin",    (int?)null),
                ("Super",   "Admin Two",        "superadmin2@dfile.com",         "superadmin456",    "Super Admin",  "System Super Admin",    (int?)null),
                ("Alpha",   "Admin",            "admin.alpha@dfile.com",         "admin123",         "Admin",        "Tenant Administrator",  (int?)t1.Id),
                ("Alpha",   "Finance Manager",  "finance.alpha@dfile.com",       "finance123",       "Finance",      "Finance Manager",       (int?)t1.Id),
                ("Alpha",   "Maintenance Mgr",  "maintenance.alpha@dfile.com",   "maintenance123",   "Maintenance",  "Maintenance Manager",   (int?)t1.Id),
                ("Beta",    "Admin",            "admin.beta@dfile.com",          "admin456",         "Admin",        "Tenant Administrator",  (int?)t2.Id),
                ("Beta",    "Finance Manager",  "finance.beta@dfile.com",        "finance456",       "Finance",      "Finance Manager",       (int?)t2.Id),
                ("Beta",    "Maintenance Mgr",  "maintenance.beta@dfile.com",    "maintenance456",   "Maintenance",  "Maintenance Manager",   (int?)t2.Id),
                ("Gamma",   "Admin",            "admin.gamma@dfile.com",         "admin789",         "Admin",        "Tenant Administrator",  (int?)t3.Id),
            };
            foreach (var (firstName, lastName, email, pass, role, label, tid) in users)
                UpsertUser(context, firstName, lastName, email, pass, role, label, tid);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // ROLE TEMPLATES (4 system templates)
            // ------------------------------------------------------------------
            SeedRoleTemplates(context);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // TENANT ROLES + USER ROLE ASSIGNMENTS
            // ------------------------------------------------------------------
            SeedTenantRolesAndAssignments(context, t1.Id, t2.Id, t3.Id);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // EMPLOYEES: mirror tenant login users (Users) so Personnel / Users UI lists them
            // ------------------------------------------------------------------
            SeedEmployeesFromLoginUsers(context);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // ASSET CATEGORIES (15 â€” global, TenantId = null)
            // ------------------------------------------------------------------
            var catDefs = new[]
            {
                ("cat-it-equipment",      "IT Equipment",           HandlingType.Fixed,      "Servers, workstations, laptops, monitors, and networking gear"),
                ("cat-office-supplies",   "Office Supplies",        HandlingType.Consumable, "Paper, pens, ink cartridges, and other day-to-day consumables"),
                ("cat-vehicles",          "Vehicles",               HandlingType.Movable,    "Company cars, delivery vans, motorcycles, and forklifts"),
                ("cat-heavy-machinery",   "Heavy Machinery",        HandlingType.Fixed,      "Industrial machines, CNC equipment, presses, and generators"),
                ("cat-hand-tools",        "Hand Tools",             HandlingType.Movable,    "Drills, wrenches, hammers, and portable power tools"),
                ("cat-electrical",        "Electrical Components",  HandlingType.Consumable, "Cables, fuses, circuit breakers, switches, and wiring"),
                ("cat-furniture",         "Furniture",              HandlingType.Fixed,      "Desks, chairs, filing cabinets, shelving, and conference tables"),
                ("cat-safety-equipment",  "Safety Equipment",       HandlingType.Movable,    "Helmets, harnesses, fire extinguishers, first aid kits"),
                ("cat-av-equipment",      "AV Equipment",           HandlingType.Movable,    "Projectors, screens, sound systems, and video conferencing units"),
                ("cat-medical-devices",   "Medical Devices",        HandlingType.Fixed,      "Diagnostic equipment, examination tables, and treatment devices"),
                ("cat-cleaning",          "Cleaning Equipment",     HandlingType.Movable,    "Industrial vacuums, floor scrubbers, pressure washers"),
                ("cat-lab-equipment",     "Laboratory Equipment",   HandlingType.Fixed,      "Microscopes, centrifuges, analyzers, and testing apparatus"),
                ("cat-hvac",              "HVAC Systems",           HandlingType.Fixed,      "Air conditioning units, ventilation systems, and heating equipment"),
                ("cat-security",          "Security Systems",       HandlingType.Fixed,      "CCTV cameras, access control panels, and alarm systems"),
                ("cat-packaging",         "Packaging Materials",    HandlingType.Consumable, "Boxes, bubble wrap, tape, labels, and shipping materials"),
            };
            foreach (var (id, name, ht, desc) in catDefs)
                UpsertAssetCategory(context, id, name, ht, desc);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // ROOM CATEGORIES
            // ------------------------------------------------------------------
            var alphaAdmin = context.Users.FirstOrDefault(u => u.Email == "admin.alpha@dfile.com");
            var adminId = alphaAdmin?.Id;
            var rcDefs = new[]
            {
                ("rc-office",      "Office",       "Private office space"),
                ("rc-conference",  "Conference",   "Meeting and conference rooms"),
                ("rc-warehouse",   "Warehouse",    "Storage and warehouse areas"),
                ("rc-lab",         "Laboratory",   "Research and testing labs"),
                ("rc-workshop",    "Workshop",     "Maintenance and repair bays"),
            };
            foreach (var (id, name, desc) in rcDefs)
                UpsertRoomCategory(context, id, name, desc, t1.Id, adminId);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // ROOMS (10 for Alpha Holdings)
            // ------------------------------------------------------------------
            var roomDefs = new[]
            {
                ("room-001", "Main Office A",          "Ground", "rc-office"),
                ("room-002", "Main Office B",          "Ground", "rc-office"),
                ("room-003", "Conference Room Alpha",  "Level 1","rc-conference"),
                ("room-004", "Conference Room Beta",   "Level 1","rc-conference"),
                ("room-005", "Warehouse Block A",      "Ground", "rc-warehouse"),
                ("room-006", "Warehouse Block B",      "Ground", "rc-warehouse"),
                ("room-007", "IT Lab",                 "Level 2","rc-lab"),
                ("room-008", "Maintenance Workshop",   "Ground", "rc-workshop"),
                ("room-009", "Executive Office",       "Level 3","rc-office"),
                ("room-010", "Training Room",          "Level 2","rc-conference"),
            };
            foreach (var (id, name, floor, catId) in roomDefs)
                UpsertRoom(context, id, name, floor, catId, t1.Id);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // DEPARTMENTS (Alpha Holdings)
            // ------------------------------------------------------------------
            var deptDefs = new[]
            {
                ("dept-it",      "Information Technology", "IT infrastructure, software, and support"),
                ("dept-finance", "Finance",                "Budgeting, accounting, and procurement"),
                ("dept-ops",     "Operations",            "Day-to-day operational activities"),
                ("dept-maint",   "Maintenance",           "Facility and equipment maintenance"),
                ("dept-hr",      "Human Resources",       "Recruitment, payroll, and HR operations"),
            };
            foreach (var (id, name, desc) in deptDefs)
                UpsertDepartment(context, id, name, desc, t1.Id);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // ASSETS (120) â€” seeded across all 15 categories, all 3 tenants
            // ------------------------------------------------------------------
            SeedAssets(context, t1.Id, t2.Id, t3.Id);
            context.SaveChanges();

            // ------------------------------------------------------------------
            // MAINTENANCE RECORDS (80)
            // ------------------------------------------------------------------
            SeedMaintenanceRecords(context, t1.Id, t2.Id);
            context.SaveChanges();
        }

        // ======================================================================
        // ASSET SEED (120 records)
        // ======================================================================
        private static void SeedAssets(AppDbContext context, int t1, int t2, int t3)
        {
            if (context.Assets.Any()) return;

            var now = DateTime.UtcNow;

            var assets = new List<Asset>
            {
                // ---- IT Equipment (cat-it-equipment) ------------------------
                MkAsset("AST-0001", "HP ProBook 450 G9 Laptop",                 "cat-it-equipment", 1,   "room-001", "HP",          "ProBook 450 G9",  "SN-HP-001", now.AddYears(-2), "TechVision",   75000m,  3, t1),
                MkAsset("AST-0002", "Dell OptiPlex 7090 Desktop",               "cat-it-equipment", 1,   "room-001", "Dell",        "OptiPlex 7090",   "SN-DL-001", now.AddYears(-1), "CompWorld",    55000m,  3, t1),
                MkAsset("AST-0003", "Cisco Catalyst 2960 Network Switch",       "cat-it-equipment", 1,   "room-007", "Cisco",       "Catalyst 2960",   "SN-CS-001", now.AddYears(-3), "NetSupply",    38000m,  5, t1),
                MkAsset("AST-0004", "Dell PowerEdge R740 Server",               "cat-it-equipment", 1,   "room-007", "Dell",        "PowerEdge R740",  "SN-DL-002", now.AddYears(-2), "CompWorld",   180000m,  5, t1),
                MkAsset("AST-0005", "LG 27\" 4K Monitor",                       "cat-it-equipment", 1,   "room-001", "LG",          "27UK850-W",       "SN-LG-001", now.AddYears(-1), "DisplayPro",   22000m,  3, t1),
                MkAsset("AST-0006", "Epson WorkForce Pro Printer",              "cat-it-equipment", 1,   "room-002", "Epson",       "WF-4830",         "SN-EP-001", now.AddYears(-2), "PrintMart",    18000m,  3, t1),
                MkAsset("AST-0007", "Lenovo ThinkPad X1 Carbon",               "cat-it-equipment", 2,   "room-009", "Lenovo",      "X1 Carbon Gen10", "SN-LN-001", now.AddYears(-1), "TechVision",   95000m,  3, t1),
                MkAsset("AST-0008", "Ubiquiti UniFi Access Point",             "cat-it-equipment", 1,   "room-007", "Ubiquiti",    "UAP-AC-PRO",      "SN-UB-001", now.AddYears(-2), "NetSupply",     8500m,  4, t1),
                MkAsset("AST-0009", "APC Smart-UPS 1500VA",                    "cat-it-equipment", 1,   "room-007", "APC",         "SMT1500",         "SN-AP-001", now.AddYears(-3), "PowerTech",    28000m,  5, t1),
                MkAsset("AST-0010", "HP LaserJet Pro M404dn",                  "cat-it-equipment", 3, "room-002", "HP",          "M404dn",          "SN-HP-002", now.AddYears(-3), "PrintMart",    16000m,  3, t1),

                // ---- Vehicles (cat-vehicles) ---------------------------------
                MkAsset("AST-0011", "Toyota Hilux 2023 Pickup",                "cat-vehicles", 1,   null,       "Toyota",      "Hilux 2023",      "PLATE-TH01", now.AddYears(-1), "AutoMotive",  850000m,  7, t1),
                MkAsset("AST-0012", "Toyota HiAce Cargo Van",                  "cat-vehicles", 2,   null,       "Toyota",      "HiAce 2022",      "PLATE-TH02", now.AddYears(-2), "AutoMotive",  780000m,  7, t1),
                MkAsset("AST-0013", "Isuzu ELF 3.5T Truck",                   "cat-vehicles", 1,   null,       "Isuzu",       "ELF NLR85",       "PLATE-IS01", now.AddYears(-3), "TruckPros",   950000m, 10, t1),
                MkAsset("AST-0014", "Honda XRM 125 Motorcycle",               "cat-vehicles", 1,   null,       "Honda",       "XRM 125",         "PLATE-HX01", now.AddYears(-2), "MotorDeals",   65000m,  5, t1),
                MkAsset("AST-0015", "Hyundai H-100 Van",                      "cat-vehicles", 4,    null,       "Hyundai",     "H-100",           "PLATE-HH01", now.AddYears(-6), "AutoMotive",  420000m,  7, t1, isArchived:true),
                MkAsset("AST-0016", "Toyota Fortuner SUV",                    "cat-vehicles", 2,   null,       "Toyota",      "Fortuner 2022",   "PLATE-TF01", now.AddYears(-2), "AutoMotive", 1350000m,  7, t2),
                MkAsset("AST-0017", "Mitsubishi L300 FB Van",                 "cat-vehicles", 1,   null,       "Mitsubishi",  "L300 FB 2021",    "PLATE-ML01", now.AddYears(-3), "AutoMotive",  480000m,  7, t2),
                MkAsset("AST-0018", "Suzuki APV Cargo",                       "cat-vehicles", 1,   null,       "Suzuki",      "APV Cargo",       "PLATE-SA01", now.AddYears(-2), "AutoMotive",  390000m,  5, t3),

                // ---- Heavy Machinery (cat-heavy-machinery) -------------------
                MkAsset("AST-0019", "Makita Belt Grinder 2040",               "cat-heavy-machinery", 1,  "room-008", "Makita",      "2040",            "SN-MK-001", now.AddYears(-3), "MachineMart",  85000m,  7, t1),
                MkAsset("AST-0020", "Bosch GSH 5 CE Demolition Hammer",       "cat-heavy-machinery", 1,  "room-008", "Bosch",       "GSH 5 CE",        "SN-BS-001", now.AddYears(-2), "ToolsPlus",    28000m,  5, t1),
                MkAsset("AST-0021", "Ingersoll Rand Air Compressor 25HP",     "cat-heavy-machinery", 1,  "room-008", "Ingersoll Rand","SS5L5",          "SN-IR-001", now.AddYears(-4), "MachineMart", 145000m, 10, t1),
                MkAsset("AST-0022", "Caterpillar Forklift 3-Ton",             "cat-heavy-machinery", 1,  "room-005", "Caterpillar", "GP30N",           "SN-CA-001", now.AddYears(-3), "HeavyEquip", 1200000m, 10, t1),
                MkAsset("AST-0023", "Komatsu Hydraulic Excavator",            "cat-heavy-machinery", 3,"room-005", "Komatsu",     "PC200-8",         "SN-KM-001", now.AddYears(-5), "HeavyEquip", 3500000m, 10, t2),
                MkAsset("AST-0024", "Stanley FatMax Band Saw",                "cat-heavy-machinery", 1,  "room-008", "Stanley",     "FatMax BS-18",    "SN-ST-001", now.AddYears(-2), "ToolsPlus",    42000m,  5, t3),

                // ---- Hand Tools (cat-hand-tools) ----------------------------
                MkAsset("AST-0025", "Makita 18V Drill Driver Kit",            "cat-hand-tools", 1,   "room-008", "Makita",      "DHP487",          "SN-MK-002", now.AddYears(-1), "ToolsPlus",     6500m,  3, t1),
                MkAsset("AST-0026", "Bosch Professional Jigsaw GST 160 BCE",  "cat-hand-tools", 1,   "room-008", "Bosch",       "GST 160 BCE",     "SN-BS-002", now.AddYears(-2), "ToolsPlus",     9800m,  3, t1),
                MkAsset("AST-0027", "DeWalt 60V Circular Saw",                "cat-hand-tools", 2,   "room-008", "DeWalt",      "DCS575T1",        "SN-DW-001", now.AddYears(-1), "MachineMart",  12500m,  3, t1),
                MkAsset("AST-0028", "Milwaukee 12V Impact Driver",            "cat-hand-tools", 1,   "room-008", "Milwaukee",   "M12 FIWF12",      "SN-MW-001", now.AddYears(-1), "ToolsPlus",     7200m,  3, t2),
                MkAsset("AST-0029", "Ryobi 4-Piece Combo Kit",               "cat-hand-tools", 1,   "room-008", "Ryobi",       "PCK300K2",        "SN-RY-001", now.AddYears(-2), "ToolsPlus",     5900m,  3, t2),
                MkAsset("AST-0030", "Stanley 26pc Hand Tool Set",             "cat-hand-tools", 1,   null,       "Stanley",     "STMT73795",       "SN-ST-002", now.AddYears(-1), "ToolsPlus",     3500m,  3, t3),

                // ---- Furniture (cat-furniture) ------------------------------
                MkAsset("AST-0031", "Herman Miller Aeron Office Chair",       "cat-furniture", 1,   "room-001", "Herman Miller","Aeron B",        "SN-HM-001", now.AddYears(-2), "OfficePro",    48000m,  7, t1),
                MkAsset("AST-0032", "Steelcase Leap V2 Ergonomic Chair",      "cat-furniture", 1,   "room-001", "Steelcase",   "Leap V2",         "SN-SC-001", now.AddYears(-1), "OfficePro",    38000m,  7, t1),
                MkAsset("AST-0033", "IKEA BEKANT Sit-Stand Desk",             "cat-furniture", 1,   "room-001", "IKEA",        "BEKANT 160x80",   "SN-IK-001", now.AddYears(-2), "FurnitureHub", 18500m,  5, t1),
                MkAsset("AST-0034", "Conference Table 3.6M x 1.2M",          "cat-furniture", 1,   "room-003", "OfficeFurn",  "CT-3612",         "SN-OF-001", now.AddYears(-3), "FurnitureHub", 65000m,  7, t1),
                MkAsset("AST-0035", "Metal Storage Cabinet 5-Tier",          "cat-furniture", 1,   "room-005", "Hirsh",       "5-Tier Steel",    "SN-HR-001", now.AddYears(-3), "OfficePro",    12000m,  7, t1),
                MkAsset("AST-0036", "Executive Wooden Desk 180cm",           "cat-furniture", 1,   "room-009", "OfficeFurn",  "EX-180",          "SN-OF-002", now.AddYears(-2), "FurnitureHub", 28000m,  7, t1),
                MkAsset("AST-0037", "Whiteboard 180x120cm",                  "cat-furniture", 1,   "room-003", "Quartet",     "M7248A",          "SN-QT-001", now.AddYears(-1), "OfficePro",     5800m,  5, t1),
                MkAsset("AST-0038", "Reception Counter L-Shape",             "cat-furniture", 1,   "room-001", "OfficeFurn",  "RC-LS01",         "SN-OF-003", now.AddYears(-3), "FurnitureHub", 45000m,  7, t1),
                MkAsset("AST-0039", "Training Room Chair Set (20pcs)",       "cat-furniture",     1,   "room-010", "Torasen",     "TR-CH20",         "SN-TR-001", now.AddYears(-2), "FurnitureHub", 32000m,  5, t1),
                MkAsset("AST-0040", "Steel Bookshelf 5-Level",               "cat-furniture", 1,   "room-002", "Hirsh",       "SB-5L",           "SN-HR-002", now.AddYears(-2), "OfficePro",     8500m,  7, t1),

                // ---- AV Equipment (cat-av-equipment) -------------------------
                MkAsset("AST-0041", "Epson EB-FH52 Full HD Projector",       "cat-av-equipment", 1,   "room-003", "Epson",       "EB-FH52",         "SN-EP-002", now.AddYears(-1), "AVSupply",     38000m,  4, t1),
                MkAsset("AST-0042", "Samsung 75\" 4K Interactive Display",   "cat-av-equipment", 1,   "room-003", "Samsung",     "QM75C",           "SN-SM-001", now.AddYears(-1), "DisplayPro",  185000m,  5, t1),
                MkAsset("AST-0043", "Logitech Rally Video Conference Kit",   "cat-av-equipment", 1,   "room-004", "Logitech",    "Rally System",    "SN-LG-002", now.AddYears(-2), "AVSupply",     95000m,  4, t1),
                MkAsset("AST-0044", "Bose L1 Pro8 Portable PA System",      "cat-av-equipment", 1,   null,       "Bose",        "L1 Pro8",         "SN-BO-001", now.AddYears(-2), "SoundPro",     58000m,  5, t1),
                MkAsset("AST-0045", "Polycom RealPresence Trio 8800",        "cat-av-equipment", 1,   "room-003", "Polycom",     "RealPresence",    "SN-PL-001", now.AddYears(-3), "AVSupply",     32000m,  4, t2),
                MkAsset("AST-0046", "Optoma ZH461 Laser Projector",         "cat-av-equipment", 1,   "room-010", "Optoma",      "ZH461",           "SN-OP-001", now.AddYears(-1), "DisplayPro",   72000m,  4, t2),

                // ---- HVAC Systems (cat-hvac) ---------------------------------
                MkAsset("AST-0047", "Daikin 5HP Split-Type AC Unit A",       "cat-hvac", 1,   "room-007", "Daikin",      "FTYN50K",         "SN-DK-001", now.AddYears(-2), "CoolTech",     65000m,  7, t1),
                MkAsset("AST-0048", "Daikin 5HP Split-Type AC Unit B",       "cat-hvac", 1,   "room-003", "Daikin",      "FTYN50K",         "SN-DK-002", now.AddYears(-2), "CoolTech",     65000m,  7, t1),
                MkAsset("AST-0049", "Carrier Industrial AC 20HP",            "cat-hvac", 3, "room-005", "Carrier",     "50XC-020",        "SN-CR-001", now.AddYears(-4), "CoolTech",    280000m, 10, t1),
                MkAsset("AST-0050", "Mitsubishi Electric VRF System",        "cat-hvac", 1,   "room-002", "Mitsubishi",  "PUHY-EP250",      "SN-ME-001", now.AddYears(-3), "CoolTech",    450000m, 10, t2),
                MkAsset("AST-0051", "Panasonic Ceiling Fan Industrial",      "cat-hvac", 1,   "room-005", "Panasonic",   "F-CILW084",       "SN-PA-001", now.AddYears(-2), "CoolTech",      8800m,  7, t3),

                // ---- Security Systems (cat-security) -------------------------
                MkAsset("AST-0052", "Hikvision 16CH DVR System",             "cat-security", 1,   "room-007", "Hikvision",   "DS-7216HGHI-K2",  "SN-HK-001", now.AddYears(-2), "SecurePro",    48000m,  5, t1),
                MkAsset("AST-0053", "Hikvision 4MP Turret Camera x8",       "cat-security", 1,   null,       "Hikvision",   "DS-2CD2343G2-I",  "SN-HK-002", now.AddYears(-2), "SecurePro",    32000m,  5, t1),
                MkAsset("AST-0054", "ZKTeco Face Recognition Access Ctrl",  "cat-security", 1,   "room-001", "ZKTeco",      "SpeedFace-V4L",   "SN-ZK-001", now.AddYears(-1), "SecurePro",    35000m,  5, t1),
                MkAsset("AST-0055", "Bosch DS303i Motion Detector Set",     "cat-security", 1,   null,       "Bosch",       "DS303i",          "SN-BS-003", now.AddYears(-2), "SecurePro",    12500m,  5, t2),
                MkAsset("AST-0056", "Paradox EVO192 Alarm Panel",           "cat-security", 1,   "room-007", "Paradox",     "EVO192",          "SN-PX-001", now.AddYears(-3), "SecurePro",    18000m,  5, t2),

                // ---- Safety Equipment (cat-safety-equipment) -----------------
                MkAsset("AST-0057", "Ansul R-102 Fire Suppression System",  "cat-safety-equipment", 1,  "room-005", "Ansul",       "R-102",           "SN-AN-001", now.AddYears(-2), "SafetyFirst",  75000m,  5, t1),
                MkAsset("AST-0058", "3M Scott Air Pack Breathing Apparatus","cat-safety-equipment", 1,  "room-008", "3M Scott",    "Air-Pak X3 Pro",  "SN-3M-001", now.AddYears(-2), "SafetyFirst",  45000m,  5, t1),
                MkAsset("AST-0059", "Industrial First Aid Cabinet",         "cat-safety-equipment", 1,  "room-001", "Medline",     "3-Shelf Cabinet", "SN-ML-001", now.AddYears(-1), "SafetyFirst",   8500m,  5, t1),
                MkAsset("AST-0060", "Draeger Multi-Gas Detector",           "cat-safety-equipment", 1,  "room-008", "Draeger",     "X-am 5000",       "SN-DR-001", now.AddYears(-2), "SafetyFirst",  28000m,  5, t1),
                MkAsset("AST-0061", "Petzl Vertex Hard Hat with Lamp",      "cat-safety-equipment", 1,  null,       "Petzl",       "Vertex Vent",     "SN-PZ-001", now.AddYears(-1), "SafetyFirst",   3500m,  3, t2),

                // ---- Laboratory Equipment (cat-lab-equipment) ----------------
                MkAsset("AST-0062", "Olympus BX53 Biological Microscope",   "cat-lab-equipment", 1,  "room-007", "Olympus",     "BX53",            "SN-OL-001", now.AddYears(-3), "LabSupply",   320000m,  7, t1),
                MkAsset("AST-0063", "Eppendorf 5430R Centrifuge",           "cat-lab-equipment", 1,  "room-007", "Eppendorf",   "5430R",           "SN-EP-003", now.AddYears(-2), "LabSupply",   185000m,  7, t1),
                MkAsset("AST-0064", "Mettler Toledo MS Balance 220g",       "cat-lab-equipment", 1,  "room-007", "Mettler",     "MS 220/01",       "SN-MT-001", now.AddYears(-2), "LabSupply",    42000m,  5, t1),
                MkAsset("AST-0065", "Fisher Scientific Water Bath 5L",      "cat-lab-equipment", 1,  "room-007", "Fisher",      "WB-5L",           "SN-FS-001", now.AddYears(-3), "LabSupply",    28000m,  5, t2),

                // ---- Cleaning Equipment (cat-cleaning) ----------------------
                MkAsset("AST-0066", "Karcher BD 80/100 W Floor Scrubber",   "cat-cleaning", 1,  "room-005", "Karcher",     "BD 80/100 W",     "SN-KA-001", now.AddYears(-2), "CleanPro",    185000m,  5, t1),
                MkAsset("AST-0067", "Tennant T5e Ride-On Scrubber",         "cat-cleaning", 1,  "room-005", "Tennant",     "T5e",             "SN-TN-001", now.AddYears(-3), "CleanPro",    380000m,  7, t1),
                MkAsset("AST-0068", "Nilfisk VP600HEPA Vacuum Cleaner",     "cat-cleaning", 1,  "room-008", "Nilfisk",     "VP600HEPA",       "SN-NF-001", now.AddYears(-1), "CleanPro",    15000m,   3, t1),
                MkAsset("AST-0069", "Rotowash R45 Wet Mop Machine",         "cat-cleaning", 1,  "room-006", "Rotowash",    "R45",             "SN-RW-001", now.AddYears(-2), "CleanPro",    48000m,   5, t2),

                // ---- Medical Devices (cat-medical-devices) ------------------
                MkAsset("AST-0070", "Mindray BS-240 Chemistry Analyzer",    "cat-medical-devices", 1,  "room-007", "Mindray",     "BS-240",          "SN-MR-001", now.AddYears(-2), "MedSupply",   680000m, 10, t1),
                MkAsset("AST-0071", "Omron IntelliSense BP Monitor x5",     "cat-medical-devices", 1,  "room-001", "Omron",       "HEM-907XL",       "SN-OM-001", now.AddYears(-1), "MedSupply",    12500m,  5, t1),
                MkAsset("AST-0072", "Hill-Rom Versacare Hospital Bed",      "cat-medical-devices", 1,  null,       "Hill-Rom",    "P3200",           "SN-HR-003", now.AddYears(-3), "MedSupply",   185000m,  7, t2),

                // ---- More IT Equipment (t2 and t3) --------------------------
                MkAsset("AST-0073", "HP EliteBook 840 G9 Laptop",           "cat-it-equipment", 1,   null,       "HP",          "EliteBook 840 G9","SN-HP-003", now.AddYears(-1), "TechVision",   88000m,  3, t2),
                MkAsset("AST-0074", "Apple MacBook Pro M2 14\"",            "cat-it-equipment", 2,   null,       "Apple",       "MacBook Pro M2",  "SN-AP-002", now.AddYears(-1), "AppleStore",  125000m,  3, t2),
                MkAsset("AST-0075", "Cisco Meraki MX68 Firewall",           "cat-it-equipment", 1,   null,       "Cisco",       "MX68",            "SN-CS-002", now.AddYears(-2), "NetSupply",    65000m,  5, t2),
                MkAsset("AST-0076", "Synology DS1621+ NAS Server",          "cat-it-equipment", 1,   null,       "Synology",    "DS1621+",         "SN-SY-001", now.AddYears(-1), "StoragePro",   95000m,  5, t3),
                MkAsset("AST-0077", "HP Color LaserJet M255dw",             "cat-it-equipment", 1,   null,       "HP",          "M255dw",          "SN-HP-004", now.AddYears(-2), "PrintMart",    22000m,  3, t3),

                // ---- More Furniture (t2) ------------------------------------
                MkAsset("AST-0078", "Humanscale Freedom Task Chair",        "cat-furniture", 1,   null,       "Humanscale",  "Freedom",         "SN-HS-001", now.AddYears(-2), "OfficePro",    55000m,  7, t2),
                MkAsset("AST-0079", "IKEA GALANT T-Leg Desk 160cm",         "cat-furniture", 1,   null,       "IKEA",        "GALANT T-Leg",    "SN-IK-002", now.AddYears(-1), "FurnitureHub", 12500m,  5, t2),
                MkAsset("AST-0080", "Mayline 6-Drawer Legal File Cabinet",  "cat-furniture", 1,   null,       "Mayline",     "6DLG",            "SN-MY-001", now.AddYears(-3), "OfficePro",    18000m,  7, t2),

                // ---- More Vehicles / HVAC / Security (t3) -------------------
                MkAsset("AST-0081", "Ford Ranger 2022 Pickup",              "cat-vehicles", 1,   null,       "Ford",        "Ranger XLS",      "PLATE-FR01", now.AddYears(-2), "AutoMotive",  920000m,  7, t3),
                MkAsset("AST-0082", "TCL 2HP Window-Type AC Unit",          "cat-hvac", 1,   null,       "TCL",         "TAC-18CW/AG",     "SN-TC-001", now.AddYears(-1), "CoolTech",     18500m,  5, t3),
                MkAsset("AST-0083", "Dahua 8CH NVR Security Kit",           "cat-security", 1,   null,       "Dahua",       "DHI-XVR5108H",    "SN-DA-001", now.AddYears(-1), "SecurePro",    28000m,  5, t3),

                // ---- Consumables / Office Supplies (bulk â€” all tenants) -----
                MkAsset("AST-0084", "Epson 664 Ink Bottle Set x50",         "cat-electrical", 1,   "room-006", "Epson",       "T664 EcoTank",    "SN-EI-001", now.AddMonths(-6),"PrintMart",     4500m,  1, t1),
                MkAsset("AST-0085", "Zebra ZT410 Industrial Label Printer", "cat-it-equipment", 1,   "room-006", "Zebra",       "ZT410",           "SN-ZB-001", now.AddYears(-2), "LabelPro",     55000m,  5, t1),
                MkAsset("AST-0086", "Dymo LabelWriter 450 Turbo",           "cat-it-equipment", 1,   "room-006", "Dymo",        "LW 450 Turbo",    "SN-DY-001", now.AddYears(-1), "LabelPro",      7800m,  3, t1),
                MkAsset("AST-0087", "Honeywell Xenon 1902 Barcode Scanner", "cat-it-equipment", 1,   "room-006", "Honeywell",   "Xenon 1902",      "SN-HW-001", now.AddYears(-2), "ScanTech",      6500m,  3, t1),
                MkAsset("AST-0088", "Plantronics Blackwire C3225 Headset",  "cat-it-equipment", 1,   "room-001", "Plantronics", "Blackwire C3225", "SN-PT-001", now.AddYears(-1), "AVSupply",      2800m,  3, t1),

                // ---- Electrical Components (cat-electrical) -----------------
                MkAsset("AST-0089", "Schneider Electric MCB Panel 18-Way",  "cat-electrical", 1,   "room-007", "Schneider",   "EZ9F56206",       "SN-SE-001", now.AddYears(-3), "ElecSupply",   35000m, 10, t1),
                MkAsset("AST-0090", "ABB ACS355 Variable Frequency Drive",  "cat-electrical", 1,   "room-008", "ABB",         "ACS355-03E-15A6", "SN-AB-001", now.AddYears(-2), "ElecSupply",   48000m,  7, t1),
                MkAsset("AST-0091", "Fluke 87V Industrial Multimeter",      "cat-electrical", 1,   "room-008", "Fluke",       "87V",             "SN-FL-001", now.AddYears(-2), "ElecSupply",   22000m,  5, t1),
                MkAsset("AST-0092", "Legrand PDU Rack Power Strip 16A",     "cat-electrical", 1,   "room-007", "Legrand",     "PDU-16A",         "SN-LR-001", now.AddYears(-1), "ElecSupply",    8500m,  5, t1),

                // ---- Packaging Materials (cat-packaging) --------------------
                MkAsset("AST-0093", "Strapack RQ-8 Strapping Machine",      "cat-packaging", 1,   "room-006", "Strapack",    "RQ-8",            "SN-SP-001", now.AddYears(-2), "PackPro",      68000m,  5, t1),
                MkAsset("AST-0094", "3M Accu-Tab Tape Dispenser",           "cat-packaging", 1,   "room-006", "3M",          "AccuTab",         "SN-3MA-001",now.AddYears(-1), "PackPro",       4200m,  3, t1),
                MkAsset("AST-0095", "Neopost IS-280 Folder Inserter",       "cat-packaging", 1,   "room-006", "Neopost",     "IS-280",          "SN-NP-001", now.AddYears(-3), "OfficePro",    85000m,  7, t1),

                // ---- Additional IT / AV (t1) --------------------------------
                MkAsset("AST-0096", "Raspberry Pi 4 Development Kit",       "cat-it-equipment", 1,   "room-007", "Raspberry Pi","Pi 4 Model B",    "SN-RP-001", now.AddMonths(-8),"TechVision",    3500m,  3, t1),
                MkAsset("AST-0097", "Android Tablet Samsung Tab S8 x3",     "cat-it-equipment", 1,   null,       "Samsung",     "Galaxy Tab S8",   "SN-SM-002", now.AddYears(-1), "TechVision",   45000m,  3, t1),
                MkAsset("AST-0098", "Barco ClickShare CS-100 Wireless",     "cat-av-equipment", 1,   "room-004", "Barco",       "CS-100",          "SN-BA-001", now.AddYears(-2), "AVSupply",     28000m,  4, t1),
                MkAsset("AST-0099", "Shure MX392/C Boundary Microphone",    "cat-av-equipment", 1,   "room-003", "Shure",       "MX392/C",         "SN-SH-001", now.AddYears(-2), "AVSupply",      9500m,  5, t1),

                // ---- Archived assets (~10%) ---------------------------------
                MkAsset("AST-0100", "Dell Latitude 5510 Laptop (EOL)",      "cat-it-equipment",  4,    null,       "Dell",        "Latitude 5510",   "SN-DL-003", now.AddYears(-5), "CompWorld",    35000m,  3, t1, isArchived:true),
                MkAsset("AST-0101", "HP Deskjet 2720 (EOL)",                "cat-it-equipment",  4,    null,       "HP",          "Deskjet 2720",    "SN-HP-005", now.AddYears(-6), "PrintMart",     4500m,  3, t1, isArchived:true),
                MkAsset("AST-0102", "Broken Carrier Window AC (EOL)",       "cat-hvac",          4,    null,       "Carrier",     "CA-W12T",         "SN-CR-002", now.AddYears(-7), "CoolTech",     18000m,  5, t1, isArchived:true),
                MkAsset("AST-0103", "Old Reception Chair Set (EOL)",        "cat-furniture",     4,    null,       "OfficeFurn",  "RC-12",           "SN-OF-004", now.AddYears(-6), "FurnitureHub",  8000m,  5, t1, isArchived:true),
                MkAsset("AST-0104", "Sharp MX-2640N Multifunction (EOL)",   "cat-it-equipment",  4,    null,       "Sharp",       "MX-2640N",        "SN-SX-001", now.AddYears(-5), "PrintMart",    65000m,  5, t1, isArchived:true),

                // ---- More diverse catalog to reach 120 ----------------------
                MkAsset("AST-0105", "Toshiba e-STUDIO 3515AC Copier",       "cat-it-equipment", 1,   "room-002", "Toshiba",     "e-STUDIO 3515AC", "SN-TS-001", now.AddYears(-2), "PrintMart",    98000m,  5, t1),
                MkAsset("AST-0106", "Honeywell Dolphin CT45 Mobile Comp",   "cat-it-equipment", 1,   "room-006", "Honeywell",   "CT45",            "SN-HD-001", now.AddYears(-1), "ScanTech",     35000m,  3, t1),
                MkAsset("AST-0107", "Lutron Maestro Lighting Control",      "cat-electrical", 1,   "room-003", "Lutron",      "Maestro MA-600",  "SN-LT-001", now.AddYears(-2), "ElecSupply",    8500m,  5, t1),
                MkAsset("AST-0108", "Crown XLi 3500 Power Amplifier",      "cat-av-equipment", 1,   null,       "Crown",       "XLi 3500",        "SN-CR-003", now.AddYears(-3), "SoundPro",     28000m,  5, t1),
                MkAsset("AST-0109", "Leica Disto D510 Laser Distance",     "cat-hand-tools", 1,   "room-008", "Leica",       "Disto D510",      "SN-LC-001", now.AddYears(-2), "SurveyPlus",   12500m,  5, t1),
                MkAsset("AST-0110", "Trimble R12i GNSS Receiver",          "cat-lab-equipment", 1,  null,       "Trimble",     "R12i",            "SN-TM-001", now.AddYears(-1), "SurveyPlus",  450000m,  7, t1),
                MkAsset("AST-0111", "Yaskawa Motoman MH50 Robot Arm",      "cat-heavy-machinery", 1,  "room-008", "Yaskawa",     "Motoman MH50",    "SN-YA-001", now.AddYears(-2), "HeavyEquip", 2800000m, 10, t2),
                MkAsset("AST-0112", "Grundfos CR 5-16 Centrifugal Pump",   "cat-heavy-machinery", 1,  "room-005", "Grundfos",    "CR 5-16",         "SN-GR-001", now.AddYears(-3), "MachineMart",  85000m,  7, t2),
                MkAsset("AST-0113", "ABB IRB 1200 Collaborative Robot",    "cat-heavy-machinery", 3,"room-008", "ABB",         "IRB 1200",        "SN-AB-002", now.AddYears(-2), "HeavyEquip", 1950000m, 10, t2),
                MkAsset("AST-0114", "Keyence CV-X480 Vision System",       "cat-lab-equipment", 1,  "room-007", "Keyence",     "CV-X480",         "SN-KY-001", now.AddYears(-1), "LabSupply",   285000m,  5, t2),
                MkAsset("AST-0115", "Brother P-Touch Titan Label Tape",    "cat-packaging", 1,  null,       "Brother",     "TZe-241",         "SN-BR-001", now.AddMonths(-3),"LabelPro",       1200m,  1, t2),
                MkAsset("AST-0116", "Leica TS16 Total Station",            "cat-lab-equipment", 1,  null,       "Leica",       "TS16",            "SN-LC-002", now.AddYears(-1), "SurveyPlus",  680000m,  7, t3),
                MkAsset("AST-0117", "Graco Merkur 34:1 Spray Pump",        "cat-hand-tools", 1,  "room-008", "Graco",       "Merkur 34:1",     "SN-GC-001", now.AddYears(-2), "ToolsPlus",    45000m,  5, t3),
                MkAsset("AST-0118", "Flir T530 Thermal Infrared Camera",   "cat-safety-equipment", 1, null,       "FLIR",        "T530",            "SN-FR-001", now.AddYears(-1), "SafetyFirst",  295000m,  5, t3),
                MkAsset("AST-0119", "Roper Whitney Manual Punch Press",    "cat-heavy-machinery", 1,  "room-008", "Roper Whitney","P24",            "SN-RW-002", now.AddYears(-4), "MachineMart",  185000m, 10, t3),
                MkAsset("AST-0120", "Trane XR15 Heat Pump System",         "cat-hvac", 1,  null,       "Trane",       "XR15",            "SN-TR-002", now.AddYears(-3), "CoolTech",    380000m, 10, t3),
            };

            context.Assets.AddRange(assets.Where(a => !context.Assets.Any(x => x.Id == a.Id)));
        }

        // ======================================================================
        // MAINTENANCE RECORDS (80 records)
        // ======================================================================
        private static void SeedMaintenanceRecords(AppDbContext context, int t1, int t2)
        {
            if (context.MaintenanceRecords.Any()) return;

            var now = DateTime.UtcNow;

            var records = new List<MaintenanceRecord>
            {
                // Completed maintenance (past)
                MkMaint("MNT-001", "AST-0001", "Annual preventive maintenance â€” laptop cleaning and thermal repaste",     "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-12), now.AddMonths(-12).AddDays(1),  800m,  t1),
                MkMaint("MNT-002", "AST-0003", "Network switch firmware update and port inspection",                       "Completed",    "Medium", "Preventive",  "Yearly",  now.AddMonths(-10), now.AddMonths(-10).AddDays(1),  1500m, t1),
                MkMaint("MNT-003", "AST-0004", "Server RAM upgrade and disk health check",                                 "Completed",    "High",   "Upgrade",     "One-time",now.AddMonths(-8),  now.AddMonths(-8).AddDays(2),   8500m, t1),
                MkMaint("MNT-004", "AST-0009", "UPS battery replacement cycle",                                           "Completed",    "High",   "Corrective",  "Yearly",  now.AddMonths(-7),  now.AddMonths(-7).AddDays(1),   4500m, t1),
                MkMaint("MNT-005", "AST-0011", "Toyota Hilux 5000km scheduled service",                                   "Completed",    "Medium", "Preventive",  "Monthly", now.AddMonths(-6),  now.AddMonths(-6).AddDays(1),   3500m, t1),
                MkMaint("MNT-006", "AST-0012", "HiAce van brake pad replacement",                                         "Completed",    "High",   "Corrective",  "One-time",now.AddMonths(-5),  now.AddMonths(-5).AddDays(2),   6500m, t1),
                MkMaint("MNT-007", "AST-0013", "Isuzu ELF truck 10000km major service",                                   "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-4),  now.AddMonths(-4).AddDays(1),  12000m, t1),
                MkMaint("MNT-008", "AST-0019", "Belt grinder blade replacement and calibration",                           "Completed",    "Medium", "Corrective",  "One-time",now.AddMonths(-5),  now.AddMonths(-5).AddDays(3),   2800m, t1),
                MkMaint("MNT-009", "AST-0021", "Air compressor valve service and oil change",                             "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-6),  now.AddMonths(-6).AddDays(2),   4200m, t1),
                MkMaint("MNT-010", "AST-0022", "Caterpillar forklift 250-hour service",                                   "Completed",    "High",   "Preventive",  "Monthly", now.AddMonths(-3),  now.AddMonths(-3).AddDays(2),   8500m, t1),
                MkMaint("MNT-011", "AST-0031", "Office chair pneumatic cylinder replacement",                              "Completed",    "Low",    "Corrective",  "One-time",now.AddMonths(-4),  now.AddMonths(-4).AddDays(1),    850m, t1),
                MkMaint("MNT-012", "AST-0033", "Height-adjustment mechanism lubrication",                                 "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-6),  now.AddMonths(-6).AddDays(1),    500m, t1),
                MkMaint("MNT-013", "AST-0041", "Projector lamp replacement",                                              "Completed",    "Medium", "Corrective",  "One-time",now.AddMonths(-3),  now.AddMonths(-3).AddDays(1),   6500m, t1),
                MkMaint("MNT-014", "AST-0043", "Video conference camera recalibration and firmware update",               "Completed",    "Medium", "Preventive",  "Yearly",  now.AddMonths(-5),  now.AddMonths(-5).AddDays(2),   3500m, t1),
                MkMaint("MNT-015", "AST-0047", "Daikin AC annual cleaning and refrigerant check",                        "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-2),  now.AddMonths(-2).AddDays(1),   4500m, t1),
                MkMaint("MNT-016", "AST-0048", "Daikin AC filter deep clean",                                             "Completed",    "Medium", "Preventive",  "Monthly", now.AddMonths(-1),  now.AddMonths(-1).AddDays(1),   1200m, t1),
                MkMaint("MNT-017", "AST-0052", "DVR firmware update and HDD health check",                                "Completed",    "Medium", "Preventive",  "Yearly",  now.AddMonths(-4),  now.AddMonths(-4).AddDays(1),   2500m, t1),
                MkMaint("MNT-018", "AST-0054", "Face recognition database update and sensor clean",                       "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-3),  now.AddMonths(-3).AddDays(1),   1800m, t1),
                MkMaint("MNT-019", "AST-0057", "Fire suppression system annual inspection and recharge",                  "Completed",    "High",   "Inspection",  "Yearly",  now.AddMonths(-2),  now.AddMonths(-2).AddDays(3),   8500m, t1),
                MkMaint("MNT-020", "AST-0062", "Microscope calibration and lens cleaning",                                "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-5),  now.AddMonths(-5).AddDays(2),   6500m, t1),
                MkMaint("MNT-021", "AST-0063", "Centrifuge rotor balancing and inspection",                               "Completed",    "High",   "Inspection",  "Yearly",  now.AddMonths(-4),  now.AddMonths(-4).AddDays(2),   4500m, t1),
                MkMaint("MNT-022", "AST-0066", "Floor scrubber brush replacement and tank clean",                         "Completed",    "Medium", "Preventive",  "Monthly", now.AddMonths(-2),  now.AddMonths(-2).AddDays(1),   3200m, t1),
                MkMaint("MNT-023", "AST-0067", "Ride-on scrubber battery replacement",                                    "Completed",    "High",   "Corrective",  "One-time",now.AddMonths(-3),  now.AddMonths(-3).AddDays(2),   9500m, t1),
                MkMaint("MNT-024", "AST-0070", "Chemistry analyzer calibration with certified standards",                 "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-6),  now.AddMonths(-6).AddDays(3),  28000m, t1),
                MkMaint("MNT-025", "AST-0089", "MCB panel thermal scan and tightening",                                   "Completed",    "High",   "Inspection",  "Yearly",  now.AddMonths(-4),  now.AddMonths(-4).AddDays(1),   5500m, t1),
                MkMaint("MNT-026", "AST-0090", "VFD parameter reset and cooling fan replacement",                         "Completed",    "High",   "Corrective",  "One-time",now.AddMonths(-3),  now.AddMonths(-3).AddDays(2),   8500m, t1),
                MkMaint("MNT-027", "AST-0093", "Strapping machine tension calibration",                                   "Completed",    "Medium", "Preventive",  "Monthly", now.AddMonths(-2),  now.AddMonths(-2).AddDays(1),   1800m, t1),
                MkMaint("MNT-028", "AST-0016", "Toyota Fortuner 10000km service â€” oil, filter, tyre rotation",            "Completed",    "High",   "Preventive",  "Monthly", now.AddMonths(-3),  now.AddMonths(-3).AddDays(1),   8500m, t2),
                MkMaint("MNT-029", "AST-0023", "Komatsu excavator hydraulic system flush",                                "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-8),  now.AddMonths(-7).AddDays(5),  45000m, t2),
                MkMaint("MNT-030", "AST-0050", "VRF system annual refrigerant balance check",                             "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-5),  now.AddMonths(-5).AddDays(2),  18000m, t2),

                // In Progress maintenance (current)
                MkMaint("MNT-031", "AST-0049", "Carrier industrial AC cooling coil replacement â€” currently dismantled",   "In Progress",  "High",   "Corrective",  "One-time",now.AddDays(-7),    null,                           35000m, t1),
                MkMaint("MNT-032", "AST-0010", "HP LaserJet fuser unit replacement â€” parts on order",                    "In Progress",  "Medium", "Corrective",  "One-time",now.AddDays(-5),    null,                            4500m, t1),
                MkMaint("MNT-033", "AST-0020", "Bosch demolition hammer housing crack repair",                            "In Progress",  "High",   "Corrective",  "One-time",now.AddDays(-3),    null,                            3200m, t1),
                MkMaint("MNT-034", "AST-0023", "Komatsu excavator bucket pin and bushing replacement",                    "In Progress",  "High",   "Corrective",  "One-time",now.AddDays(-10),   null,                           65000m, t2),
                MkMaint("MNT-035", "AST-0113", "ABB robot arm joint 4 bearing overhaul",                                  "In Progress",  "High",   "Corrective",  "One-time",now.AddDays(-14),   null,                           85000m, t2),

                // Scheduled maintenance (upcoming)
                MkMaint("MNT-036", "AST-0001", "Annual preventive maintenance â€” laptop Year 3",                           "Scheduled",    "Low",    "Preventive",  "Yearly",  now.AddDays(14),    null,                             800m, t1),
                MkMaint("MNT-037", "AST-0004", "Server quarterly health check and log review",                            "Scheduled",    "High",   "Inspection",  "Yearly",  now.AddDays(7),     null,                            3500m, t1),
                MkMaint("MNT-038", "AST-0007", "ThinkPad battery calibration and thermal check",                          "Scheduled",    "Low",    "Preventive",  "Yearly",  now.AddDays(21),    null,                             600m, t1),
                MkMaint("MNT-039", "AST-0011", "Toyota Hilux 10000km service",                                            "Scheduled",    "Medium", "Preventive",  "Monthly", now.AddDays(10),    null,                            3500m, t1),
                MkMaint("MNT-040", "AST-0013", "Isuzu ELF Annual Safety Inspection (LTO)",                                "Scheduled",    "High",   "Inspection",  "Yearly",  now.AddDays(30),    null,                            5500m, t1),
                MkMaint("MNT-041", "AST-0019", "Belt grinder annual inspection and motor brush replacement",               "Scheduled",    "Medium", "Preventive",  "Yearly",  now.AddDays(15),    null,                            2800m, t1),
                MkMaint("MNT-042", "AST-0021", "Air compressor annual safety valve test",                                  "Scheduled",    "High",   "Inspection",  "Yearly",  now.AddDays(20),    null,                            4500m, t1),
                MkMaint("MNT-043", "AST-0022", "Caterpillar forklift 500-hour major service",                             "Scheduled",    "High",   "Preventive",  "Monthly", now.AddDays(5),     null,                           18000m, t1),
                MkMaint("MNT-044", "AST-0047", "Daikin AC monthly filter clean",                                          "Scheduled",    "Low",    "Preventive",  "Monthly", now.AddDays(3),     null,                            1200m, t1),
                MkMaint("MNT-045", "AST-0048", "Daikin AC monthly filter clean",                                          "Scheduled",    "Low",    "Preventive",  "Monthly", now.AddDays(3),     null,                            1200m, t1),
                MkMaint("MNT-046", "AST-0052", "CCTV camera lens clean and angle verification",                           "Scheduled",    "Low",    "Preventive",  "Yearly",  now.AddDays(25),    null,                            2500m, t1),
                MkMaint("MNT-047", "AST-0057", "Fire extinguisher monthly inspection",                                    "Scheduled",    "High",   "Inspection",  "Monthly", now.AddDays(1),     null,                             500m, t1),
                MkMaint("MNT-048", "AST-0059", "First aid cabinet restocking",                                            "Scheduled",    "Medium", "Preventive",  "Monthly", now.AddDays(2),     null,                            2800m, t1),
                MkMaint("MNT-049", "AST-0062", "Microscope objective lens replacement",                                   "Scheduled",    "High",   "Upgrade",     "One-time",now.AddDays(14),    null,                           18000m, t1),
                MkMaint("MNT-050", "AST-0066", "Floor scrubber paddles replacement",                                      "Scheduled",    "Medium", "Preventive",  "Monthly", now.AddDays(7),     null,                            3500m, t1),
                MkMaint("MNT-051", "AST-0067", "Ride-on scrubber quarterly full service",                                 "Scheduled",    "High",   "Preventive",  "Yearly",  now.AddDays(14),    null,                           12000m, t1),
                MkMaint("MNT-052", "AST-0070", "Chemistry analyzer monthly QC check",                                    "Scheduled",    "High",   "Inspection",  "Monthly", now.AddDays(5),     null,                            5500m, t1),
                MkMaint("MNT-053", "AST-0089", "MCB annual thermographic scan",                                           "Scheduled",    "High",   "Inspection",  "Yearly",  now.AddDays(45),    null,                            8500m, t1),
                MkMaint("MNT-054", "AST-0093", "Strapping machine annual belt replacement",                                "Scheduled",    "Medium", "Preventive",  "Yearly",  now.AddDays(30),    null,                            4200m, t1),
                MkMaint("MNT-055", "AST-0016", "Toyota Fortuner 15000km service",                                         "Scheduled",    "High",   "Preventive",  "Monthly", now.AddDays(15),    null,                            8500m, t2),
                MkMaint("MNT-056", "AST-0023", "Komatsu excavator 500-hour service",                                      "Scheduled",    "High",   "Preventive",  "Yearly",  now.AddDays(30),    null,                           45000m, t2),
                MkMaint("MNT-057", "AST-0050", "VRF system quarterly filter service",                                     "Scheduled",    "Medium", "Preventive",  "Monthly", now.AddDays(10),    null,                            6500m, t2),
                MkMaint("MNT-058", "AST-0111", "Robot arm lubrication and TCP calibration",                               "Scheduled",    "High",   "Preventive",  "Monthly", now.AddDays(7),     null,                           28000m, t2),
                MkMaint("MNT-059", "AST-0113", "ABB robot axis 6 belt replacement",                                       "Scheduled",    "High",   "Corrective",  "One-time",now.AddDays(21),    null,                           45000m, t2),

                // Overdue maintenance (past due date, pending)
                MkMaint("MNT-060", "AST-0006", "Epson printer head deep clean â€” overdue",                                 "Pending",      "Low",    "Preventive",  "Monthly", now.AddDays(-30),   null,                            1200m, t1),
                MkMaint("MNT-061", "AST-0008", "UniFi AP factory reset and channel optimization â€” overdue",              "Pending",      "Medium", "Preventive",  "Yearly",  now.AddDays(-45),   null,                            2500m, t1),
                MkMaint("MNT-062", "AST-0014", "Honda XRM annual LTO inspection â€” overdue",                              "Pending",      "High",   "Inspection",  "Yearly",  now.AddDays(-15),   null,                            2800m, t1),
                MkMaint("MNT-063", "AST-0025", "Cordless drill battery reconditioning â€” overdue",                        "Pending",      "Low",    "Preventive",  "Yearly",  now.AddDays(-20),   null,                             850m, t1),
                MkMaint("MNT-064", "AST-0027", "Circular saw blade replacement â€” overdue",                               "Pending",      "Medium", "Corrective",  "One-time",now.AddDays(-10),   null,                            1800m, t1),
                MkMaint("MNT-065", "AST-0034", "Conference table surface refinishing â€” overdue",                         "Pending",      "Low",    "Preventive",  "Yearly",  now.AddDays(-60),   null,                            8500m, t1),
                MkMaint("MNT-066", "AST-0044", "Bose PA system speaker cone inspection â€” overdue",                       "Pending",      "Medium", "Inspection",  "Yearly",  now.AddDays(-30),   null,                            4500m, t1),
                MkMaint("MNT-067", "AST-0058", "SCBA harness and cylinder recertification â€” overdue",                   "Pending",      "High",   "Inspection",  "Yearly",  now.AddDays(-10),   null,                           18000m, t1),
                MkMaint("MNT-068", "AST-0060", "Gas detector sensor bump test â€” overdue",                                "Pending",      "High",   "Inspection",  "Monthly", now.AddDays(-7),    null,                            1200m, t1),
                MkMaint("MNT-069", "AST-0064", "Analytical balance external calibration â€” overdue",                     "Pending",      "High",   "Preventive",  "Yearly",  now.AddDays(-14),   null,                            8500m, t1),
                MkMaint("MNT-070", "AST-0095", "Folder inserter feed roller replacement â€” overdue",                     "Pending",      "Medium", "Corrective",  "One-time",now.AddDays(-20),   null,                            6500m, t1),
                MkMaint("MNT-071", "AST-0017", "L300 van annual PMS â€” overdue",                                         "Pending",      "High",   "Preventive",  "Monthly", now.AddDays(-20),   null,                            6500m, t2),
                MkMaint("MNT-072", "AST-0055", "Motion detector sensitivity test â€” overdue",                            "Pending",      "Medium", "Inspection",  "Yearly",  now.AddDays(-30),   null,                            1800m, t2),

                // Additional completed (to round out to 80)
                MkMaint("MNT-073", "AST-0002", "Desktop deep clean and SSD defrag",                                       "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-11), now.AddMonths(-11).AddDays(1),    500m, t1),
                MkMaint("MNT-074", "AST-0005", "Monitor pixel calibration and stand lubrication",                        "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-9),  now.AddMonths(-9).AddDays(1),     400m, t1),
                MkMaint("MNT-075", "AST-0026", "Jigsaw orbital-action adjustment service",                               "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-7),  now.AddMonths(-7).AddDays(1),    1200m, t1),
                MkMaint("MNT-076", "AST-0032", "Seat foam replacement for Steelcase Leap V2",                            "Completed",    "Medium", "Corrective",  "One-time",now.AddMonths(-6),  now.AddMonths(-6).AddDays(2),    3800m, t1),
                MkMaint("MNT-077", "AST-0068", "Nilfisk motor brush replacement",                                        "Completed",    "Medium", "Corrective",  "One-time",now.AddMonths(-5),  now.AddMonths(-5).AddDays(1),    2500m, t1),
                MkMaint("MNT-078", "AST-0091", "Fluke multimeter calibration at accredited lab",                         "Completed",    "High",   "Preventive",  "Yearly",  now.AddMonths(-8),  now.AddMonths(-8).AddDays(2),    8500m, t1),
                MkMaint("MNT-079", "AST-0074", "MacBook Pro battery health check and keyboard clean",                    "Completed",    "Low",    "Preventive",  "Yearly",  now.AddMonths(-4),  now.AddMonths(-4).AddDays(1),    1500m, t2),
                MkMaint("MNT-080", "AST-0112", "Grundfos pump impeller wear inspection",                                 "Completed",    "High",   "Inspection",  "Yearly",  now.AddMonths(-6),  now.AddMonths(-6).AddDays(3),    9500m, t2),
            };

            // Only insert records whose referenced AssetId actually exists
            var existingAssetIds = new HashSet<string>(context.Assets.Select(a => a.Id));
            context.MaintenanceRecords.AddRange(
                records.Where(r => existingAssetIds.Contains(r.AssetId)));
        }

        // ======================================================================
        // ROLE TEMPLATES + PERMISSIONS (system-level)
        // ======================================================================
        private static void SeedRoleTemplates(AppDbContext context)
        {
            if (context.RoleTemplates.Any()) return;

            var modules = new[] { "Assets", "AssetCategories", "Rooms", "RoomCategories",
                                  "PurchaseOrders", "Maintenance", "Departments", "Employees", "Tasks", "Reports" };

            // â”€â”€ Admin: full access to everything â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            var admin = new RoleTemplate { Name = "Admin", Description = "Full tenant administration access", IsSystem = true };
            admin.Permissions = modules.Select(m => new RolePermission
            {
                ModuleName = m,
                CanView = true, CanCreate = true, CanEdit = true, CanApprove = true, CanArchive = true
            }).ToList();
            context.RoleTemplates.Add(admin);

            // â”€â”€ Finance Manager: PO full + approve, assets view, reports â”€
            var finance = new RoleTemplate { Name = "Finance Manager", Description = "Purchase orders, budgets, and financial reporting", IsSystem = true };
            finance.Permissions = modules.Select(m => new RolePermission
            {
                ModuleName = m,
                CanView = true,
                CanCreate = m == "PurchaseOrders" || m == "Reports",
                CanEdit   = m == "PurchaseOrders",
                CanApprove = m == "PurchaseOrders",
                CanArchive = m == "PurchaseOrders",
            }).ToList();
            context.RoleTemplates.Add(finance);

            // â”€â”€ Maintenance Manager: maintenance full, assets edit, tasks â”€â”€
            var maint = new RoleTemplate { Name = "Maintenance Manager", Description = "Maintenance scheduling, work orders, and asset upkeep", IsSystem = true };
            maint.Permissions = modules.Select(m => new RolePermission
            {
                ModuleName = m,
                CanView = true,
                CanCreate = m is "Maintenance" or "Tasks",
                CanEdit   = m is "Maintenance" or "Tasks" or "Assets",
                CanApprove = m == "Maintenance",
                CanArchive = m is "Maintenance" or "Tasks",
            }).ToList();
            context.RoleTemplates.Add(maint);
        }

        // ======================================================================
        // TENANT ROLES + USER ASSIGNMENTS
        // ======================================================================
        private static void SeedTenantRolesAndAssignments(AppDbContext context, int t1, int t2, int t3)
        {
            if (context.TenantRoles.Any()) return;

            var templates = context.RoleTemplates.ToList();
            var adminTemplate = templates.First(t => t.Name == "Admin");
            var financeTemplate = templates.First(t => t.Name == "Finance Manager");
            var maintTemplate = templates.First(t => t.Name == "Maintenance Manager");

            // Create TenantRoles for each tenant
            var tenantIds = new[] { t1, t2, t3 };
            var tenantRoles = new List<TenantRole>();

            foreach (var tid in tenantIds)
            {
                tenantRoles.Add(new TenantRole { TenantId = tid, RoleTemplateId = adminTemplate.Id, CustomLabel = "Tenant Administrator" });
                tenantRoles.Add(new TenantRole { TenantId = tid, RoleTemplateId = financeTemplate.Id });
                tenantRoles.Add(new TenantRole { TenantId = tid, RoleTemplateId = maintTemplate.Id });
            }
            context.TenantRoles.AddRange(tenantRoles);
            context.SaveChanges();

            // Assign users to their tenant roles
            var userRoleMap = new Dictionary<string, (int tenantId, string templateName)>
            {
                { "admin.alpha@dfile.com",       (t1, "Admin") },
                { "finance.alpha@dfile.com",     (t1, "Finance Manager") },
                { "maintenance.alpha@dfile.com", (t1, "Maintenance Manager") },
                { "admin.beta@dfile.com",        (t2, "Admin") },
                { "finance.beta@dfile.com",      (t2, "Finance Manager") },
                { "maintenance.beta@dfile.com",  (t2, "Maintenance Manager") },
                { "admin.gamma@dfile.com",       (t3, "Admin") },
            };

            var allTenantRoles = context.TenantRoles.Include(tr => tr.RoleTemplate).ToList();
            var assignments = new List<UserRoleAssignment>();

            foreach (var (email, (tid, tplName)) in userRoleMap)
            {
                var user = context.Users.FirstOrDefault(u => u.Email == email);
                if (user == null) continue;

                var tenantRole = allTenantRoles.FirstOrDefault(tr => tr.TenantId == tid && tr.RoleTemplate.Name == tplName);
                if (tenantRole == null) continue;

                assignments.Add(new UserRoleAssignment { UserId = user.Id, TenantRoleId = tenantRole.Id });
            }

            context.UserRoleAssignments.AddRange(assignments);
        }

        // ======================================================================
        // HELPER FACTORIES
        // ======================================================================
        private static Asset MkAsset(
            string id, string desc, string categoryId, int assetStatus,
            string? room, string? manufacturer, string? model, string? serial,
            DateTime purchaseDate, string vendor, decimal price, int usefulLife,
            int tenantId, bool isArchived = false)
        {
            return new Asset
            {
                Id = id,
                AssetCode = id,
                TagNumber = id,
                AssetName = desc,
                CategoryId = categoryId,
                LifecycleStatus = isArchived ? LifecycleStatus.Disposed : (LifecycleStatus)assetStatus,
                CurrentCondition = AssetCondition.Good,
                Room = room,
                Manufacturer = manufacturer,
                Model = model,
                SerialNumber = serial,
                PurchaseDate = purchaseDate,
                Vendor = vendor,
                AcquisitionCost = price,
                PurchasePrice = price,
                CurrentBookValue = CalculateBookValue(price, usefulLife, purchaseDate),
                MonthlyDepreciation = price / (usefulLife * 12m),
                UsefulLifeYears = usefulLife,
                TenantId = tenantId,
                IsArchived = isArchived,
                Notes = null,
                Documents = null,
                WarrantyExpiry = purchaseDate.AddYears(2),
            };
        }

        private static MaintenanceRecord MkMaint(
            string id, string assetId, string description,
            string status, string priority, string type, string frequency,
            DateTime startDate, DateTime? endDate, decimal cost, int tenantId)
        {
            return new MaintenanceRecord
            {
                Id = id,
                AssetId = assetId,
                Description = description,
                Status = status,
                Priority = priority,
                Type = type,
                Frequency = frequency,
                StartDate = startDate,
                EndDate = endDate,
                Cost = cost,
                DateReported = startDate,
                CreatedAt = startDate,
                UpdatedAt = startDate,
                IsArchived = false,
                TenantId = tenantId,
            };
        }

        private static decimal CalculateBookValue(decimal purchasePrice, int usefulLifeYears, DateTime purchaseDate)
        {
            var monthsElapsed = (decimal)(DateTime.UtcNow - purchaseDate).Days / 30m;
            var totalMonths = usefulLifeYears * 12m;
            var depreciated = purchasePrice * (monthsElapsed / totalMonths);
            var bookValue = purchasePrice - depreciated;
            return bookValue < 0 ? 0 : Math.Round(bookValue, 2);
        }

        private static Tenant UpsertTenant(AppDbContext context, string name, SubscriptionPlanType plan)
        {
            var existing = context.Tenants.FirstOrDefault(t => t.Name == name);
            if (existing != null) return existing;

            var tenant = Tenant.Create(name, plan);
            context.Tenants.Add(tenant);
            context.SaveChanges();
            return tenant;
        }

        private static void UpsertUser(AppDbContext context, string firstName, string lastName, string email, string password,
            string role, string roleLabel, int? tenantId)
        {
            if (!context.Users.Any(u => u.Email == email))
            {
                context.Users.Add(new User
                {
                    FirstName = firstName,
                    LastName = lastName,
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Role = role,
                    RoleLabel = roleLabel,
                    Status = "Active",
                    TenantId = tenantId
                });
            }
        }

        /// <summary>
        /// The tenant "Users" screen lists <see cref="Employee"/> rows from /api/Employees.
        /// Seeded and manually created login accounts live in <see cref="User"/>; without a matching
        /// Employee they never appear. Idempotent: one Employee per User email per tenant.
        /// </summary>
        private static void SeedEmployeesFromLoginUsers(AppDbContext context)
        {
            var tenantUsers = context.Users.Where(u => u.TenantId != null).ToList();
            foreach (var u in tenantUsers)
            {
                if (context.Employees.Any(e => e.Email == u.Email))
                    continue;

                var id = $"EMP-USER-{u.Id}";
                if (context.Employees.Any(e => e.Id == id))
                    continue;

                var code = $"USR-{u.Id:D4}";
                if (context.Employees.Any(e => e.EmployeeCode == code))
                    code = $"USR-{u.Id:D6}";

                var status = u.Status == "Archived" ? "Archived" : "Active";
                if (status != "Archived" && u.Status != "Active")
                    status = u.Status;

                context.Employees.Add(new Employee
                {
                    Id = id,
                    EmployeeCode = code,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    ContactNumber = "—",
                    Department = "Organization",
                    Role = string.IsNullOrWhiteSpace(u.RoleLabel) ? u.Role : u.RoleLabel,
                    HireDate = u.CreatedAt,
                    Status = status,
                    TenantId = u.TenantId
                });
            }
        }

        private static void UpsertAssetCategory(AppDbContext context, string id, string name,
            HandlingType ht, string desc)
        {
            var existing = context.AssetCategories.Find(id);
            if (existing == null)
            {
                // DB constraint now enforces ASTC- prefix (not ACAT-), so keep seeding compliant.
                var existingCodes = context.AssetCategories.Select(c => c.AssetCategoryCode).ToList();
                var trackedCodes = context.ChangeTracker.Entries<AssetCategory>()
                    .Where(e => e.State == Microsoft.EntityFrameworkCore.EntityState.Added)
                    .Select(e => e.Entity.AssetCategoryCode)
                    .ToList();
                existingCodes.AddRange(trackedCodes);

                int seq = existingCodes.Count + 1;
                while (existingCodes.Contains($"ASTC-{seq:D4}")) { seq++; }
                
                context.AssetCategories.Add(new AssetCategory
                {
                    Id = id,
                    AssetCategoryCode = $"ASTC-{seq:D4}",
                    CategoryName = name,
                    HandlingType = ht,
                    Description = desc,
                    TenantId = null
                });
                context.SaveChanges();
            }
            else
            {
                existing.CategoryName = name;
                existing.HandlingType = ht;
                existing.Description = desc;
            }
        }

        private static void UpsertRoomCategory(AppDbContext context, string id, string name,
            string desc, int tenantId, int? createdBy = null)
        {
            var existing = context.RoomCategories.FirstOrDefault(r => r.Id == id);
            if (existing == null)
            {
                var existingCodes = context.RoomCategories.Select(r => r.RoomCategoryCode).ToList();
                int seq = context.RoomCategories.Count() + 1;
                while (existingCodes.Contains($"RMC-{seq:D4}")) { seq++; }

                context.RoomCategories.Add(new RoomCategory
                {
                    Id = id,
                    RoomCategoryCode = $"RMC-{seq:D4}",
                    Name = name,
                    Description = desc,
                    IsArchived = false,
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = createdBy,
                    UpdatedBy = createdBy
                });
                context.SaveChanges();
            }
            else if (existing.CreatedBy == null && createdBy != null)
            {
                existing.CreatedBy = createdBy;
                existing.UpdatedBy = createdBy;
            }
        }

        private static void UpsertRoom(AppDbContext context, string id, string name,
            string floor, string categoryId, int tenantId)
        {
            if (!context.Rooms.Any(r => r.Id == id))
            {
                // Include both persisted and tracked-but-unsaved codes
                var existingCodes = context.Rooms.Select(r => r.RoomCode).ToList();
                var trackedCodes = context.ChangeTracker.Entries<Room>()
                    .Where(e => e.State == Microsoft.EntityFrameworkCore.EntityState.Added)
                    .Select(e => e.Entity.RoomCode)
                    .ToList();
                existingCodes.AddRange(trackedCodes);

                int seq = existingCodes.Count + 1;
                while (existingCodes.Contains($"RM-{seq:D4}")) { seq++; }

                context.Rooms.Add(new Room
                {
                    Id = id,
                    RoomCode = $"RM-{seq:D4}",
                    Name = name,
                    Floor = floor,
                    CategoryId = categoryId,
                    IsArchived = false,
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }
        }

        private static void UpsertDepartment(AppDbContext context, string id, string name,
            string desc, int tenantId)
        {
            if (!context.Departments.Any(d => d.Id == id))
            {
                var seq = context.Departments.Count() + 1;
                context.Departments.Add(new Department
                {
                    Id = id,
                    DepartmentCode = $"DPT-{seq:D4}",
                    Name = name,
                    Description = desc,
                    IsArchived = false,
                    TenantId = tenantId
                });
            }
        }
    }
}
