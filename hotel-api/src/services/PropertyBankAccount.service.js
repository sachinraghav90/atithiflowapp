import { getDb } from "../../utils/getDb.js";

class PropertyBankAccount {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async upsertPropertyBankAccounts({
        propertyId,
        accounts,
        deletedBankIds = [],
        userId
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query('BEGIN');

            let inserted = 0;
            let updated = 0;
            let deleted = 0;

            /* ---------- DELETE ---------- */
            if (deletedBankIds.length) {
                const res = await client.query(
                    `
                DELETE FROM property_bank_accounts
                WHERE id = ANY($1::bigint[])
                AND property_id = $2
                `,
                    [deletedBankIds, propertyId]
                );

                deleted = res.rowCount;
            }

            /* ---------- UPSERT ---------- */
            for (const bank of accounts) {
                if (bank.id) {
                    const res = await client.query(
                        `
                    UPDATE property_bank_accounts
                    SET
                        account_holder_name = $1,
                        account_number = $2,
                        ifsc_code = $3,
                        bank_name = $4,
                        updated_at = NOW(),
                        updated_by = $5
                    WHERE id = $6
                    AND property_id = $7
                    `,
                        [
                            bank.account_holder_name,
                            bank.account_number,
                            bank.ifsc_code,
                            bank.bank_name,
                            userId,
                            bank.id,
                            propertyId
                        ]
                    );

                    updated += res.rowCount;
                } else {
                    await client.query(
                        `
                    INSERT INTO property_bank_accounts (
                        property_id,
                        account_holder_name,
                        account_number,
                        ifsc_code,
                        bank_name,
                        created_by,
                        updated_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $6)
                    `,
                        [
                            propertyId,
                            bank.account_holder_name,
                            bank.account_number,
                            bank.ifsc_code,
                            bank.bank_name,
                            userId
                        ]
                    );

                    inserted++;
                }
            }

            await client.query('COMMIT');

            try {
                /* ---------- AUDIT ---------- */
                await AuditService.log({
                    property_id: propertyId,
                    event_id: propertyId,
                    table_name: "property_bank_accounts",
                    event_type: "UPSERT",
                    task_name: "Upsert Property Bank Accounts",
                    comments: "Property bank accounts modified",
                    details: JSON.stringify({
                        property_id: propertyId,
                        inserted,
                        updated,
                        deleted,
                        total_received: accounts.length,
                        deleted_ids: deletedBankIds
                    }),
                    user_id: userId
                });
            } catch (error) {

            }

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async getPropertyBankAccounts(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                id,
                property_id,
                account_holder_name,
                account_number,
                ifsc_code,
                bank_name,
                created_at,
                updated_at
            FROM public.property_bank_accounts
            WHERE property_id = $1
            ORDER BY created_at ASC
            `,
            [propertyId]
        );

        return rows;
    }

}

export default Object.freeze(new PropertyBankAccount())