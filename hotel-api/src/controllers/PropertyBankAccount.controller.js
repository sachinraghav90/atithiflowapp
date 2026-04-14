import PropertyBankAccountService from "../services/PropertyBankAccount.service.js"

class PropertyBankAccounts {
    async upsertAccounts(req, res) {
        try {
            const { accounts, deletedIds } = req.body
            const { propertyId } = req.params
            const userId = req.user.user_id
            await PropertyBankAccountService.upsertPropertyBankAccounts({ accounts, propertyId, userId, deletedIds })
            return res.status(201).json({ message: "Accounts upsert successfully" })
        } catch (error) {
            console.log("🚀 ~ PropertyBankAccount ~ upsertAccounts ~ error:", error)
            return res.status(500).json({ message: "Error upsetting bank accounts" })
        }
    }

    async getBankAccounts(req, res) {
        try {
            const { propertyId } = req.params
            const accounts = await PropertyBankAccountService.getPropertyBankAccounts(propertyId)
            return res.status(201).json(accounts)
        } catch (error) {
            console.log("🚀 ~ PropertyBankAccount ~ getBankAccounts ~ error:", error)
            return res.status(500).json({ message: "Error fetching bank accounts" })
        }
    }
}

export default Object.freeze(new PropertyBankAccounts())