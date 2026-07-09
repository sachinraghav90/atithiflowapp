import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

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

            const oldBanks = await this.getPropertyBankAccounts(propertyId);
            const oldMap = new Map(oldBanks.map(b => [b.id, b]));
            const changes = {};

            /* ---------- DELETE ---------- */
            if (deletedBankIds.length) {
                for (const delId of deletedBankIds) {
                    const oldB = oldMap.get(delId);
                    if (oldB) {
                        changes[`Bank Account (${oldB.bank_name})`] = { old: `A/C: ${oldB.account_number}`, new: "Removed" };
                    }
                }

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
                    const oldB = oldMap.get(bank.id);
                    if (oldB) {
                        const bankChanges = [];
                        if (oldB.bank_name !== bank.bank_name) bankChanges.push(`Bank: ${oldB.bank_name} -> ${bank.bank_name}`);
                        if (oldB.account_number !== bank.account_number) bankChanges.push(`A/C: ${oldB.account_number} -> ${bank.account_number}`);
                        if (oldB.account_holder_name !== bank.account_holder_name) bankChanges.push(`Holder: ${oldB.account_holder_name} -> ${bank.account_holder_name}`);
                        if (oldB.ifsc_code !== bank.ifsc_code) bankChanges.push(`IFSC: ${oldB.ifsc_code} -> ${bank.ifsc_code}`);

                        if (bankChanges.length > 0) {
                            changes[`Bank Account (${bank.bank_name})`] = { old: "Old Details", new: bankChanges.join(", ") };
                        }
                    }

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
                    changes[`Bank Account (${bank.bank_name})`] = { old: "None", new: `Added A/C: ${bank.account_number}` };

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
                if (Object.keys(changes).length > 0) {
                    await AuditService.log({
                        property_id: propertyId,
                        event_id: propertyId,
                        table_name: "properties",
                        event_type: "UPDATE",
                        task_name: "Update Property Bank Accounts",
                        comments: "Property bank accounts modified",
                        details: JSON.stringify(changes),
                        user_id: userId
                    });
                }
            } catch (error) {
                console.error("Audit log failed for bank accounts:", error);
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