export async function generatePropertyRoomTypeRates(db, propertyId, userId) {
    const { rows } = await db.query(`
        SELECT COUNT(*) AS count
        FROM ref_room_types
    `);

    if (Number(rows[0].count) === 0) {
        return {
            insertedCount: 0,
            message: "No reference room types found"
        };
    }

    const { rowCount } = await db.query(
        `
        INSERT INTO room_type_rates (
            property_id,
            room_category_name,
            bed_type_name,
            ac_type_name,
            base_price,
            created_by
        )
        SELECT
            $1 AS property_id,
            rrt.room_category_name,
            rrt.bed_type_name,
            rrt.ac_type_name,
            0 AS base_price,
            $2 AS created_by
        FROM ref_room_types rrt
        ON CONFLICT (
            property_id,
            room_category_name,
            bed_type_name,
            ac_type_name
        )
        DO NOTHING
        `,
        [propertyId, userId]
    );

    return {
        insertedCount: rowCount
    };
}
