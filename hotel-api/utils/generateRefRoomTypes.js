export async function generateRefRoomTypes(db, userId) {
    const { rows: counts } = await db.query(`
        SELECT
            (SELECT COUNT(*) FROM room_categories) AS room_categories_count,
            (SELECT COUNT(*) FROM bed_types) AS bed_types_count,
            (SELECT COUNT(*) FROM ac_types) AS ac_types_count
    `);

    const {
        room_categories_count,
        bed_types_count,
        ac_types_count
    } = counts[0];

    if (
        Number(room_categories_count) === 0 ||
        Number(bed_types_count) === 0 ||
        Number(ac_types_count) === 0
    ) {
        return {
            insertedCount: 0,
            message: "Insufficient masters to generate combinations"
        };
    }

    const { rowCount } = await db.query(
        `
        INSERT INTO ref_room_types (
            room_category_name,
            bed_type_name,
            ac_type_name,
            created_by
        )
        SELECT
            rc.name,
            bt.name,
            at.name,
            $1
        FROM room_categories rc
        CROSS JOIN bed_types bt
        CROSS JOIN ac_types at
        ON CONFLICT (room_category_name, bed_type_name, ac_type_name)
        DO NOTHING
        `,
        [userId]
    );

    return {
        insertedCount: rowCount
    };
}
