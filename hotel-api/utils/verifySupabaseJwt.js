import supabase from "../src/services/Supabase.service.js";

export async function verifySupabaseJwt(token) {
    const { data, error } = await supabase.client().auth.getUser(token);
    
    if (error || !data?.user) {
        // Prevent alarming stack traces for normal token expirations
        if (error && error.code !== 'bad_jwt') {
            console.error("Supabase Auth Error:", error.message || error);
        }
        throw new Error("Invalid or expired token");
    }

    return {
        sub: data.user.id,
        role: data.user.role || "authenticated",
        email: data.user.email
    };
}
