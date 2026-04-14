import RefPackageService from "../services/RefPackage.service.js";

class RefPackageController {
    async create(req, res, next) {
        try {
            const { package_name, description } = req.body;

            if (!package_name) {
                return res.status(400).json({
                    message: "package_name is required"
                });
            }

            const data = await RefPackageService.create(
                { package_name, description },
                req.user.user_id
            );

            res.status(201).json(data);
        } catch (err) {
            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Package name already exists"
                });
            }
            next(err);
        }
    }

    async updateById(req, res, next) {
        try {
            const { id } = req.params;
            const { package_name, description } = req.body;

            const data = await RefPackageService.updateById(
                id,
                { package_name, description },
                req.user.user_id
            );

            if (!data) {
                return res.status(404).json({
                    message: "Reference package not found"
                });
            }

            res.status(200).json(data);
        } catch (err) {
            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Package name already exists"
                });
            }
            next(err);
        }
    }

    async deleteById(req, res, next) {
        try {
            const { id } = req.params;

            const data = await RefPackageService.deleteById(id);

            if (!data) {
                return res.status(404).json({
                    message: "Reference package not found"
                });
            }

            res.status(200).json({
                message: "Reference package deleted successfully",
                id: data.id
            });
        } catch (err) {
            next(err);
        }
    }

    async getAll(req, res, next) {
        try {
            const data = await RefPackageService.getAll();
            res.status(200).json(data);
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new RefPackageController())