import { getDb } from "../utils/getDb.js";
import { roles } from "../utils/roles.js";
import supabase from "../src/services/Supabase.service.js";
import role from "../src/services/Role.service.js";
import user from "../src/services/user.service.js";

(async function () {

    const email = process.env.SUPERADMIN_EMAIL || "superadmin@atithiflow.com";
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe@123";

    const { data, error } = await supabase.client().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (error) {
        console.error("Auth user error:", error.message);
        process.exit(1);
    }

    const authUserId = data.user.id;

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
