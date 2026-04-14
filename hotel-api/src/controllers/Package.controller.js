import packageService from "../services/Package.service.js";

class PackageController {
    async create(req, res) {
        try {
            const createdBy = req.user.user_id
            const { propertyId, packageName, description, basePrice, isActive } = req.body;

            if (!propertyId || !packageName) {
                return res.status(400).json({
                    error: "propertyId and packageName are required",
                });
            }

            const pkg = await packageService.createPackage({ propertyId, packageName, description, basePrice, createdBy, isActive });

            return res.status(201).json({
                message: "Package created",
                data: pkg,
            });
        } catch (err) {
            console.error("Create package error:", err);
            return res.status(500).json({ message: "Failed to create package" });
        }
    };

    async getByProperty(req, res) {
        try {
            const propertyId = Number(req.query.property_id);
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 10);

            if (!propertyId) {
                return res.status(400).json({
                    error: "property_id is required",
                });
            }

            const packages =
                await packageService.getPackagesByProperty(propertyId, page, limit);

            return res.json(packages);
        } catch (err) {
            console.error("Get packages error:", err);
            return res.status(500).json({ message: "Failed to fetch packages" });
        }
    };

    async getById(req, res) {
        try {
            const id = Number(req.params.id);

            const pkg = await packageService.getPackageById(id);

            if (!pkg) {
                return res.status(404).json({ message: "Package not found" });
            }

            return res.json({ data: pkg });
        } catch (err) {
            console.error("Get package by id error:", err);
            return res.status(500).json({ message: "Failed to fetch package" });
        }
    };

    async update(req, res) {
        try {
            const id = Number(req.params.id);
            const updatedBy = req.user.user_id
            const { packageName, description, basePrice, isActive } = req.body;

            const pkg = await packageService.updatePackage({ id, packageName, description, basePrice, isActive, updatedBy });

            return res.json({
                message: "Package updated",
                data: pkg,
            });
        } catch (err) {
            console.error("Update package error:", err);
            return res.status(500).json({ message: "Failed to update package" });
        }
    };

    async updatePackagesBulk(req, res) {
        try {
            const propertyId = Number(req.params.propertyId);
            const userId = req.user.user_id
            const packages = req.body;

            const pkg = await packageService.updatePackagesBulk({ packages, propertyId, userId });

            return res.json(pkg);
        } catch (err) {
            console.error("Update package error:", err);
            return res.status(500).json({ message: "Failed to update package" });
        }
    };

    async deactivate(req, res) {
        try {
            const id = Number(req.params.id);
            const userId = req.user.user_id

            const pkg = await packageService.deactivatePackage(id, userId);

            return res.json({
                message: "Package deactivated",
                data: pkg,
            });
        } catch (err) {
            console.error("Deactivate package error:", err);
            return res.status(500).json({ message: "Failed to deactivate package" });
        }
    };

    async getPackagesByUser(req, res) {
        try {
            const userId = req.user.user_id
            const packages = await packageService.getPackagesByUser(userId)
            return res.json({ message: "Success", packages })
        } catch (error) {
            console.log("🚀 ~ PackageController ~ getPackagesByUser ~ error:", error)
            return res.status(500).json({ message: "Error fetching packages" })
        }
    }

    async generatePackagesForAllProperties(req, res) {
        try {
            const userId = req.user.user_id
            const count = await packageService.generatePackagesForAllProperties(userId)
            return res.status(201).json(count)
        } catch (error) {
            console.log("🚀 ~ PackageController ~ generatePackagesForAllProperties ~ error:", error)
            return res.status(500).json({ message: "Error creating packages" })
        }
    }
}

export default Object.freeze(new PackageController);
