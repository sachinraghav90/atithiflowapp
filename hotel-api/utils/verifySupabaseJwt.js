// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// if (!JWT_SECRET) {
//     throw new Error("SUPABASE_JWT_SECRET missing");
// }

// export function verifySupabaseJwt(token) {
//     return jwt.verify(token, JWT_SECRET, {
//         algorithms: ["HS256"]
//     });
// }

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const SUPABASE_URL = process.env.SUPABASE_URL;

const client = jwksClient({
    jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
}

export function verifySupabaseJwt(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                algorithms: ["ES256"],
                issuer: `${SUPABASE_URL}/auth/v1`,
                audience: "authenticated"
            },
            (err, decoded) => {
                if (err) return reject(err);
                resolve(decoded);
            }
        );
    });
}
