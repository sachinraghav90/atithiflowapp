function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function toCamelCase(input) {
    return input.replace(/[_-]([a-z0-9])/gi, (_, char) => char.toUpperCase());
}

function toSnakeCase(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/-/g, "_")
        .toLowerCase();
}

function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }

    if (!isPlainObject(value)) {
        return value;
    }

    const normalized = {};

    for (const [rawKey, rawValue] of Object.entries(value)) {
        const nextValue = normalizeValue(rawValue);
        const camelKey = toCamelCase(rawKey);
        const snakeKey = toSnakeCase(rawKey);

        if (!(rawKey in normalized)) {
            normalized[rawKey] = nextValue;
        }

        if (!(camelKey in normalized)) {
            normalized[camelKey] = nextValue;
        }

        if (!(snakeKey in normalized)) {
            normalized[snakeKey] = nextValue;
        }
    }

    return normalized;
}

function getPropertyDescriptor(target, key) {
    let current = target;

    while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) {
            return descriptor;
        }
        current = Object.getPrototypeOf(current);
    }

    return undefined;
}

function setRequestPart(req, key, value) {
    const descriptor = getPropertyDescriptor(req, key);

    if (!descriptor) {
        req[key] = value;
        return;
    }

    if (descriptor.writable) {
        req[key] = value;
        return;
    }

    if (descriptor.set) {
        descriptor.set.call(req, value);
        return;
    }

    if (descriptor.configurable) {
        Object.defineProperty(req, key, {
            configurable: true,
            enumerable: descriptor.enumerable ?? true,
            writable: true,
            value,
        });
        return;
    }

    const currentValue = req[key];
    if (isPlainObject(currentValue)) {
        Object.assign(currentValue, value);
    }
}

export function normalizeRequestKeys(req, _res, next) {
    if (isPlainObject(req.body) || Array.isArray(req.body)) {
        setRequestPart(req, "body", normalizeValue(req.body));
    }

    if (isPlainObject(req.query)) {
        setRequestPart(req, "query", normalizeValue(req.query));
    }

    if (isPlainObject(req.params)) {
        setRequestPart(req, "params", normalizeValue(req.params));
    }

    next();
}

export { normalizeValue };
