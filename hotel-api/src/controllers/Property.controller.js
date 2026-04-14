import packageService from "../services/package.service.js";
import propertyService from "../services/Property.service.js";

class Property {
  async getById(req, res) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "Invalid property id" });
      }

      const property = await propertyService.getById({ id });

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(property);
    } catch (err) {
      console.error("Property.getById:", err);
      return res.status(500).json({ error: "Failed to fetch property" });
    }
  }

  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        city,
        state,
        country,
        search
      } = req.query;

      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined;

      const isSuperAdmin = req.roles.includes("SUPER_ADMIN");

      const result = await propertyService.getAll({
        page: Number(page),
        limit: Number(limit),
        city,
        state,
        country,
        is_active,
        search,
        user_id: req.user.user_id,
        isSuperAdmin
      });

      return res.json(result);
    } catch (err) {
      console.error("Property.getAll:", err);
      return res.status(500).json({ error: "Failed to fetch properties" });
    }
  }

  async create(req, res) {
    try {
      const userId = req.user?.user_id;
      let ownerUserId = req.params.id
      ownerUserId ??= userId
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const imageFile = req.files?.image?.[0] ?? null;
      const logoFile = req.files?.logo?.[0] ?? null;

      const payload = {
        ...req.body,
        image: imageFile?.buffer ?? null,
        image_mime: imageFile?.mimetype ?? null,
        logo: logoFile?.buffer ?? null,
        logo_mime: logoFile?.mimetype ?? null,
      };

      const property = await propertyService.create({
        payload,
        userId,
        ownerUserId
      });

      const id = property.id
      await packageService.generatePackagesForProperty(id, userId)

      return res.status(201).json(property);
    } catch (err) {
      console.error("Property.create:", err);
      return res.status(500).json({ error: "Failed to create property" });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const userId = req.user?.user_id;

      if (!id) {
        return res.status(400).json({ error: "Invalid property id" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = {
        ...req.body,
      };
      if (req.file) {
        payload.image = req.file.buffer;
        payload.image_mime = req.file.mimetype;
      }

      const updated = await propertyService.update({
        id,
        payload,
        userId,
      });

      if (!updated) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Property.update:", err);
      return res.status(500).json({ error: "Failed to update property" });
    }
  }

  async getImage(req, res) {
    try {
      const id = req.params.id
      if (!id || id == "null") return res.send()
      const { image, image_mime } = await propertyService.getImage({ id })
      res.setHeader('Content-Type', image_mime)
      return res.send(image)
    } catch (error) {
      console.log("🚀 ~ Property ~ getImage ~ error:", error)
      return res.status(500).json({ error: "Failed to get image" });
    }
  }

  async getLogo(req, res) {
    try {
      const id = req.params.id
      if (!id || id == "null") return res.send()
      const { logo, logo_mime } = await propertyService.getLogo({ id })
      res.setHeader('Content-Type', logo_mime)
      return res.send(logo)
    } catch (error) {
      console.log("🚀 ~ Property ~ getImage ~ error:", error)
      return res.status(500).json({ error: "Failed to get image" });
    }
  }

  async getByOwnerUserId(req, res) {
    try {
      let id = req.params.id
      id ??= req.user.user_id
      const data = await propertyService.getByOwnerUserId(id)
      return res.json({ message: "Success", data })
    } catch (error) {
      console.log("🚀 ~ Property ~ getByAdminUserId ~ error:", error)
      return res.status(500).json({ error: "Failed to get Properties" });
    }
  }

  async getMyProperties(req, res) {
    try {
      const userId = req.user.user_id;
      const roleSet = new Set(req.roles);

      let properties = [];

      if (roleSet.has("SUPER_ADMIN")) {
        properties = await propertyService.getAllProperties();

      } else if (roleSet.has("OWNER")) {
        properties = await propertyService.getPropertiesByOwner(userId);

      } else if (roleSet.has("ADMIN")) {
        properties = await propertyService.getPropertyByAdmin(userId);

      } else {
        properties = await propertyService.getUserProperties(userId)
      }

      return res.json({
        message: "Success",
        properties,
      });

    } catch (error) {
      console.error("getMyProperties error:", error);
      return res.status(500).json({
        message: "Failed to fetch properties",
      });
    }
  }

  async getPropertyTax(req, res) {
    try {
      const { id } = req.params

      const result = await propertyService.getPropertyTaxConfig(id)

      return res.status(200).json(result)
    } catch (err) {
      console.error("getPropertyTax:", err)
      return res.status(404).json({
        message: err.message || "Failed to fetch tax configuration"
      })
    }
  }

  async getPropertyAddress(req, res) {
    try {
      const userId = req.user.user_id

      const address = await propertyService.getPropertyAddressById(userId);

      if (!address) {
        return res.status(404).json({ error: "Property not found" });
      }

      return res.json(address);
    } catch (err) {
      console.error("getPropertyAddress:", err);
      return res.status(500).json({ error: "Failed to fetch property address" });
    }
  }

  async getRestaurantTables(req, res) {
    try {
      const { id } = req.params
      const data = await propertyService.getRestaurantTables(id);

      return res.json(data);
    } catch (err) {
      console.error("getPropertyAddress:", err);
      return res.status(500).json({ error: "Failed to fetch data" });
    }
  }


}

const property = new Property();
Object.freeze(property);

export default property;
