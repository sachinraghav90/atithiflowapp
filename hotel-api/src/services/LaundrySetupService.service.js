import { getDb } from "../../utils/getDb.js";

class LaundrySetupService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async initPropertyLaundry({ propertyId, userId }) {
        const query = `
            insert into public.laundry (
                property_id,
                item_name,
                description,
                item_rate,
                system_generated,
                created_by
            )
            select
                $1 as property_id,
                rl.item_name as item_name,
                null as description,
                0 as item_rate,
                true as system_generated,
                $2 as created_by
            from public.ref_laundry rl
            where not exists (
                select 1
                from public.laundry l
                where l.property_id = $1
                and l.item_name = rl.item_name
            )
            returning *;
        `;

        const { rows } = await this.#DB.query(query, [propertyId, userId]);
        return rows;
    }

    async initRefLaundryForAllProperties() {
        const query = `
            insert into public.laundry (
                property_id,
                item_name,
                description,
                item_rate,
                system_generated,
                created_by
            )
            select
                p.id as property_id,
                rl.item_name as item_name,
                null as description,
                0 as item_rate,
                true as system_generated,
                $1 as created_by
            from public.properties p
            cross join public.ref_laundry rl
            where not exists (
                select 1
                from public.laundry l
                where l.property_id = p.id
                  and l.item_name = rl.item_name
            )
            order by p.id
            returning property_id, item_name;
        `;

        const { rows } = await this.#DB.query(query, [null]);
        console.log("🚀 ~ LaundrySetupService ~ initRefLaundryForAllProperties ~ rows:", rows)
        return rows;
    }
}

export default Object.freeze(new LaundrySetupService());
