export const getFormattedAuditChanges = (details: any, customParsers?: Record<string, (val: any) => string>) => {
    if (!details) return "--";

    // Standard format (before/after objects)
    if (details.before || details.after) {
        const { before, after } = details;
        if (!before || !after) {
            if (typeof details === 'object' && Object.keys(details).length > 0) {
                return (
                    <div className="space-y-1 text-muted-foreground">
                        {Object.entries(details).map(([key, val], i) => (
                            <div key={i} className="mb-1 last:mb-0">
                                <span className="font-semibold text-foreground/80">{key}:</span> {String(val)}
                            </div>
                        ))}
                    </div>
                );
            }
            return "--";
        }

        const changes = [];
        Object.keys(after).forEach((key) => {
            let oldVal = before[key];
            let newVal = after[key];
            
            if (oldVal !== newVal) {
                if (customParsers && customParsers[key]) {
                    oldVal = customParsers[key](oldVal);
                    newVal = customParsers[key](newVal);
                }
                changes.push({ key, oldVal, newVal });
            }
        });

        if (changes.length === 0) return "--";

        return (
            <div className="space-y-1">
                {changes.map((change, i) => (
                    <div key={i} className="mb-1 last:mb-0">
                        <span className="font-semibold text-foreground/80">{change.key}:</span>{" "}
                        <span className="text-primary font-medium">{String(change.newVal ?? "None")}</span>
                    </div>
                ))}
            </div>
        );
    }

    // Property style / custom objects without before/after
    if (typeof details === 'object' && Object.keys(details).length > 0) {
        // Handle legacy arrays
        if (details.updated_fields && Array.isArray(details.updated_fields)) {
            return (
                <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Updated fields:</span> {details.updated_fields.join(", ")}
                </div>
            );
        }
        
        // Handle legacy bank updates
        if (details.total_received !== undefined) {
             return (
                <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Accounts modified:</span> {details.inserted} added, {details.updated} updated, {details.deleted} removed.
                </div>
            );
        }

        const entries = Object.entries(details).filter(([key]) => key !== "property_id" && key !== "user_id" && key !== "updated_fields" && key !== "id");
        
        if (entries.length === 0) return "--";

        return (
            <div className="space-y-1">
                {entries.map(([key, value]: [string, any], i) => {
                    if (typeof value === "object" && value !== null && "old" in value) {
                        const oldVal = value.old ?? "None";
                        const newVal = value.new ?? "None";
                        return (
                            <div key={i} className="mb-1 last:mb-0">
                                <span className="font-semibold text-foreground/80">{key}:</span>{" "}
                                <span className="text-primary font-medium">{String(newVal)}</span>
                            </div>
                        );
                    }
                    
                    // Fallback for simple key-value pairs
                    return (
                        <div key={i} className="mb-1 last:mb-0">
                            <span className="font-semibold text-foreground/80">{key}:</span> {String(value)}
                        </div>
                    );
                })}
            </div>
        );
    }

    return "--";
};

export const getAuditActionBadge = (actionType?: string) => {
    if (!actionType) return "--";
    
    const type = actionType.toLowerCase();
    
    if (type === "create" || type === "add" || type === "insert") {
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">{type}</span>;
    }
    if (type === "delete" || type === "remove" || type === "deactivate") {
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 capitalize">{type}</span>;
    }
    
    // Default to Updated styles for other actions
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">{type}</span>;
};
