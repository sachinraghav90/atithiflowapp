import { generateRefRoomTypes } from "../utils/generateRefRoomTypes.js";
import { getDb } from "../utils/getDb.js";

(async function seedMasterData() {
    const db = getDb();

    try {
        const ROLES = [
            "SUPER_ADMIN",
            "OWNER",
            "ADMIN",
            "MANAGER",
            // "RECEPTIONIST",
        ];

        for (const name of ROLES) {
            await db.query(
                `
                INSERT INTO public.roles (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
                `,
                [name]
            );
        }
        console.log("roles seeded");

        const SIDEBAR_LINKS = [
            // {
            //     link_name: "Dashboard",
            //     endpoint: "/dashboard",
            //     sort_order: 1,
            //     children: [],
            // },
            {
                link_name: "Room Status",
                endpoint: "/room-status",
                sort_order: 2,
            },
            {
                link_name: "Properties",
                endpoint: "/properties",
                sort_order: 3,
            },
            {
                link_name: "Bookings",
                endpoint: "/bookings",
                sort_order: 3,
            },
            {
                link_name: "Rooms",
                endpoint: "/rooms",
                sort_order: 4,
            },
            {
                link_name: "Roles",
                endpoint: "/roles",
                sort_order: 5,
            },
            {
                link_name: "Staff",
                endpoint: "/staff",
                sort_order: 5,
            },
            {
                link_name: "Plans",
                endpoint: "/plans",
                sort_order: 6,
            },
            {
                link_name: "Room Categories",
                endpoint: "/room-categories",
                sort_order: 7,
            },
            {
                link_name: "Vendors",
                endpoint: "/vendors",
                sort_order: 8,
            },
            {
                link_name: "Laundry Pricing",
                endpoint: "/laundry-pricing",
                sort_order: 9,
            },
            {
                link_name: "Laundry Orders",
                endpoint: "/laundry-orders",
                sort_order: 10,
            },
            {
                link_name: "Enquiries",
                endpoint: "/enquiries",
                sort_order: 11,
            },
            // {
            //     link_name: "New Enquiry",
            //     endpoint: "/create-enquiry",
            //     sort_order: 12,
            // },
            {
                link_name: "Menu Items",
                endpoint: "/menu-items",
                sort_order: 13,
            },
            {
                link_name: "Restaurant Orders",
                endpoint: "/orders",
                sort_order: 14,
            },
            // {
            //     link_name: "Tables",
            //     endpoint: "/restaurant-tables",
            //     sort_order: 15,
            // },
            {
                link_name: "Kitchen Inventory",
                endpoint: "/kitchen-inventory",
                sort_order: 16,
            },
            {
                link_name: "Master Inventory",
                endpoint: "/inventory-master",
                sort_order: 17,
            },
            // {
            //     link_name: "Settings",
            //     endpoint: "/settings",
            //     sort_order: 99,
            //     children: [
            //         { link_name: "Property", endpoint: "/settings/property", sort_order: 1 },
            //         { link_name: "Users", endpoint: "/settings/users", sort_order: 2 },
            //     ],
            // },
        ];

        for (const parent of SIDEBAR_LINKS) {
            const parentRes = await db.query(
                `
                INSERT INTO public.sidebar_links (link_name, endpoint, sort_order)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
                RETURNING id
                `,
                [parent.link_name, parent.endpoint, parent.sort_order]
            );

            let parentId = parentRes.rows[0]?.id;

            if (!parentId) {
                const existing = await db.query(
                    `SELECT id FROM public.sidebar_links WHERE endpoint = $1`,
                    [parent.endpoint]
                );
                parentId = existing.rows[0].id;
            }

            for (const child of parent.children ?? []) {
                await db.query(
                    `
                    INSERT INTO public.sidebar_links
                        (link_name, endpoint, parent_id, sort_order)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                    `,
                    [child.link_name, child.endpoint, parentId, child.sort_order]
                );
            }
        }
        console.log("sidebar_links seeded");

        await db.query(`
                    INSERT INTO public.role_sidebar_links (
                        role_id,
                        sidebar_link_id,
                        can_read,
                        can_create,
                        can_update,
                        can_delete
                    )
                    SELECT
                        r.id,
                        s.id,
                        true,
                        true,
                        true,
                        true
                    FROM public.roles r
                    CROSS JOIN public.sidebar_links s
                    WHERE r.name = 'SUPER_ADMIN'
                    ON CONFLICT (role_id, sidebar_link_id) DO NOTHING
                `);

        console.log("SUPER_ADMIN sidebar permissions seeded");

        const REF_PACKAGES = [
            {
                package_name: "AP",
                description: "Room with Breakfast & Dinner",
            },
            {
                package_name: "AP + High Tea",
                description: "Room with Tea, Breakfast & Dinner",
            },
            {
                package_name: "CP",
                description: "Room with Breakfast",
            },
            {
                package_name: "EP",
                description: "Room only",
            },
            {
                package_name: "MAP",
                description: "Room with Breakfast, Lunch & Dinner",
            },
            {
                package_name: "MAP + High Tea",
                description: "Room with Tea, Breakfast, Lunch & Dinner",
            },
        ];

        for (const pkg of REF_PACKAGES) {
            await db.query(
                `
                INSERT INTO public.ref_packages (package_name, description)
                VALUES ($1, $2)
                ON CONFLICT (LOWER(package_name)) DO NOTHING
                `,
                [pkg.package_name, pkg.description]
            );
        }
        console.log("ref_packages seeded");

        const BED_TYPES = [
            "Single Bed",
            "Double Bed",
            "Triple Bed",
            "Quad Bed",
        ];

        for (const name of BED_TYPES) {
            await db.query(
                `
                INSERT INTO public.bed_types (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
                `,
                [name]
            );
        }
        console.log("bed_types seeded");

        const AC_TYPES = [
            "AC",
            "Non-AC",
        ];

        for (const name of AC_TYPES) {
            await db.query(
                `
                INSERT INTO public.ac_types (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
                `,
                [name]
            );
        }
        console.log("ac_types seeded");

        const ROOM_CATEGORIES = [
            {
                name: "Standard",
                description: "Basic room with essential amenities",
            },
            {
                name: "Deluxe",
                description: "Spacious room with premium facilities",
            },
            {
                name: "Semi Deluxe",
                description: "Spacious room with premium interiors",
            },
            {
                name: "Super Deluxe",
                description: "Spacious room with premium+ interiors",
            },
            {
                name: "Suite",
                description: "Luxury room with living area",
            },
        ];

        for (const cat of ROOM_CATEGORIES) {
            await db.query(
                `
                INSERT INTO public.room_categories (name, description)
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING
                `,
                [cat.name, cat.description]
            );
        }

        await generateRefRoomTypes(db, null)
        console.log("room_categories seeded");

        const REF_LAUNDRY_ITEMS = [
            // `"Shirt",
            // "T-Shirt",
            // "Trouser",
            // "Jeans",
            // "Bedsheet",
            // "Pillow Cover",
            // "Towel",
            // "Bath Towel",
            // "Hand Towel",
            // "Blanket",
            // "Curtain",
            // "Saree",
            // "Suit (2 Pc)",
            // "Suit (3 Pc)",
            // "Jacket",
            // "Blazer",
            // "Coat",
            // "Sweater",
            // "Scarf",
            // "Unif`orm"
        ];

        for (const itemName of REF_LAUNDRY_ITEMS) {
            await db.query(
                `
                INSERT INTO public.ref_laundry (item_name)
                VALUES ($1)
                ON CONFLICT (item_name) DO NOTHING
                `,
                [itemName]
            );
        }

        console.log("ref_laundry seeded");

        // -----------------------------
        // Inventory Types (Extension + Table)
        // -----------------------------

        const INVENTORY_TYPES = ["Table", "Room", "Kitchen", "Restaurant", "Store",
            "House Keeping"
        ];

        for (const type of INVENTORY_TYPES) {
            await db.query(
                `
                INSERT INTO public.inventory_types (type)
                VALUES ($1)
                ON CONFLICT (type) DO NOTHING
                `,
                [type]
            );
        }

        console.log("inventory_types seeded");


        console.log("\nMaster data seeded successfully");
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        await db.end();
        process.exit(1);
    }
})();
