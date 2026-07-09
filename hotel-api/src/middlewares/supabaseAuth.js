import { verifySupabaseJwt } from "../../utils/verifySupabaseJwt.js";
import user from "../services/user.service.js";
import { LRUCache } from 'lru-cache';

const userCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60, // 1 minute
});

export async function supabaseAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing auth token" });
        }

        const token = authHeader.slice(7);

        let decoded;
        try {
            decoded = await verifySupabaseJwt(token);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const authUserId = decoded.sub;

        if (!authUserId || decoded.role !== "authenticated") {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Check cache first
        let dbUser = userCache.get(authUserId);

        if (!dbUser) {
            const { rows } = await user.getUser({ authUserId });
            if (!rows.length) {
                return res.status(403).json({ error: "User not found" });
            }
            dbUser = rows[0];
            userCache.set(authUserId, dbUser);
        }

        if (!dbUser.is_active) {
            return res.status(403).json({ error: "User blocked" });
        }

        req.user = {
            user_id: authUserId,
            email: decoded.email,
            property_id: dbUser.property_id
        };

        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(500).json({ error: "Authentication failed" });
    }
}



// import { getDb } from "../../utils/getDb.js";
// import supabase from "../services/Supabase.service.js";
// import user from "../services/user.service.js";

// export async function supabaseAuth(req, res, next) {
//     try {
//         const authHeader = req.headers.authorization;
//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             return res.status(401).json({ error: "Missing auth token" });
//         }

//         const token = authHeader.replace("Bearer ", "");

//         const { data, error } = await supabase.client().auth.getUser(token);

//         if (error || !data?.user) {
//             return res.status(401).json({ error: "Invalid or expired token" });
//         }

//         const authUser = data.user;

//         const db = getDb();
//         // await db.connect();

//         const { rows } = await user.getUser({ authUser, db })

//         // await db.end();

//         if (!rows.length || !rows[0].is_active) {
//             return res.status(403).json({ error: "User blocked, connect your admin" });
//         }

//         req.user = {
//             user_id: authUser.id,
//             // user_id: rows[0].id,
//             email: rows[0].email,
//             property_id: rows[0].property_id
//         };

//         next();
//     } catch (err) {
//         console.error("Auth middleware error:", err);
//         res.status(500).json({ error: "Authentication failed" });
//     }
// }

