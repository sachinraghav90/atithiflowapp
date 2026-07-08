import { getDb } from "../utils/getDb.js";
import { roles } from "../utils/roles.js";
import supabase from "../src/services/Supabase.service.js";
import role from "../src/services/Role.service.js";
import user from "../src/services/user.service.js";

(async function () {

    const email = process.env.SUPERADMIN_EMAIL || "superadmin@atithiflow.com";
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe@123";

    let authUserId;

    const { data, error } = await supabase.client().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (error) {
        if (error.message.includes("already been registered")) {
            console.log("Auth user already exists. Fetching existing user...");
            const { data: listData, error: listError } = await supabase.client().auth.admin.listUsers();
            if (listError) {
                console.error("Error fetching users:", listError.message);
                process.exit(1);
            }
            const existingUser = listData.users.find(u => u.email === email);
            if (!existingUser) {
                console.error("User not found in list despite existing.");
                process.exit(1);
            }
            authUserId = existingUser.id;
        } else {
            console.error("Auth user error:", error.message);
            process.exit(1);
        }
    } else {
        authUserId = data.user.id;
    }

    const db = getDb();

    const roleName = roles.SUPER_ADMIN;
    const roleId = await role.createRole({ roleName });

    const userRes = await user.createUser({
        authUserId,
        email,
        propertyId: null
    });

    const userId = userRes.id;

    /* -------------------------------------- */
    /* PROPERTY_USERS ROLE ASSIGNMENT        */
    /* -------------------------------------- */

    await db.query(
        `
        INSERT INTO public.property_users (
            property_id,
            user_id,
            role_id
        )
        VALUES (NULL, $1, $2)
        ON CONFLICT DO NOTHING
        `,
        [userId, roleId]
    );

    console.log("Super Admin created successfully");
    console.log("Email:", email);
    console.log("Password:", password);

    await db.end();
    process.exit(0);

})();
