import { useState, useRef, useEffect } from "react";

const formatAuditValue = (val: any): string => {
    if (val === null || val === undefined) return "None";
    
    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) {
                if (item.room_no) return item.room_no;
                if (item.name) return item.name;
                if (item.title) return item.title;
                const strVals = Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number');
                if (strVals.length > 0) return strVals.join(" ");
                try { return JSON.stringify(item); } catch { return String(item); }
            }
            return String(item);
        }).join(", ");
    }
    
    if (typeof val === 'object') {
        if ("old" in val && "new" in val) {
            return formatAuditValue(val.new);
        }
        try { return JSON.stringify(val); } catch { return String(val); }
    }
    
    if (typeof val === 'string' && val.toUpperCase() === val && val.includes('_')) {
        return val.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }
    
    return String(val);
};

const IGNORED_KEYS = new Set(["property_id", "user_id", "updated_fields", "id", "requested", "payload"]);

const ExpandableAuditList = ({ children }: { children: React.ReactNode }) => {
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight + 2);
        }
    }, [children]);

    return (
        <div className="flex flex-col items-start w-full max-w-[400px]">
            <div 
                ref={contentRef}
                className={`w-full transition-all duration-200 ${expanded ? "" : "line-clamp-3 max-h-[4.5rem] overflow-hidden"}`}
            >
                {children}
            </div>
            {isOverflowing && (
                <button 
                    type="button"
                    className="mt-1 text-[11px] font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                >
                    {expanded ? "Show less" : "Show more"}
                </button>
            )}
        </div>
    );
};

const getFormattedAuditChangesRaw = (details: any, customParsers?: Record<string, (val: any) => string>) => {
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
            if (IGNORED_KEYS.has(key)) return;

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
                {changes.map((change, i) => {
                    const formattedKey = change.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const displayVal = formatAuditValue(change.newVal);
                    return (
                        <div key={i} className="mb-1 last:mb-0 text-sm">
                            <span className="font-semibold text-foreground/80">{formattedKey}:</span>{" "}
                            <span className="text-primary font-medium">{displayVal}</span>
                        </div>
                    );
                })}
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

        const entries = Object.entries(details).filter(([key]) => !IGNORED_KEYS.has(key));
        
        if (entries.length === 0) return "--";

        const displayEntries: { key: string, value: any }[] = [];
        const processedKeys = new Set<string>();

        entries.forEach(([key, value]: [string, any]) => {
            if (processedKeys.has(key)) return;

            if (key.startsWith("new_")) {
                const baseKey = key.replace("new_", "");
                processedKeys.add(`old_${baseKey}`);
                displayEntries.push({ key: baseKey, value });
            } else if (key.startsWith("old_")) {
                const baseKey = key.replace("old_", "");
                const newValue = details[`new_${baseKey}`];
                if (newValue !== undefined) {
                    processedKeys.add(`new_${baseKey}`);
                    displayEntries.push({ key: baseKey, value: newValue });
                } else {
                    displayEntries.push({ key, value });
                }
            } else {
                displayEntries.push({ key, value });
            }
        });
        
        if (displayEntries.length === 0) return "--";

        return (
            <div className="space-y-1">
                {displayEntries.map((entry, i) => {
                    const { key, value } = entry;
                    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const displayVal = formatAuditValue(value);

                    return (
                        <div key={i} className="mb-1 last:mb-0 text-sm">
                            <span className="font-semibold text-foreground/80">{formattedKey}:</span>{" "}
                            <span className="text-primary font-medium">{displayVal}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    return "--";
};

export const getFormattedAuditChanges = (details: any, customParsers?: Record<string, (val: any) => string>) => {
    const content = getFormattedAuditChangesRaw(details, customParsers);
    if (content === "--") return "--";
    return <ExpandableAuditList>{content}</ExpandableAuditList>;
};

export const getAuditChangePlainText = (details: any, customParsers?: Record<string, (val: any) => string>) => {
    if (!details) return "--";

    if (details.before || details.after) {
        const { before, after } = details;
        if (!before || !after) {
            if (typeof details === 'object' && Object.keys(details).length > 0) {
                const entries = Object.entries(details).filter(([key]) => !IGNORED_KEYS.has(key));
                if (entries.length === 0) return "--";
                return entries.map(([key, val]) => {
                    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const displayVal = formatAuditValue(val);
                    return `${formattedKey}: ${displayVal}`;
                }).join(" | ");
            }
            return "--";
        }

        const changes = [];
        Object.keys(after).forEach((key) => {
            if (IGNORED_KEYS.has(key)) return;
            let oldVal = before[key];
            let newVal = after[key];
            if (oldVal !== newVal) {
                if (customParsers && customParsers[key]) {
                    oldVal = customParsers[key](oldVal);
                    newVal = customParsers[key](newVal);
                }
                const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                const displayVal = formatAuditValue(newVal);
                changes.push(`${formattedKey}: ${displayVal}`);
            }
        });
        if (changes.length === 0) return "--";
        return changes.join(" | ");
    }

    if (typeof details === 'object' && Object.keys(details).length > 0) {
        if (details.updated_fields && Array.isArray(details.updated_fields)) {
            return `Updated fields: ${details.updated_fields.join(", ")}`;
        }
        if (details.total_received !== undefined) {
             return `Accounts modified: ${details.inserted} added, ${details.updated} updated, ${details.deleted} removed.`;
        }

        const entries = Object.entries(details).filter(([key]) => !IGNORED_KEYS.has(key));
        if (entries.length === 0) return "--";

        const displayEntries: { key: string, value: any }[] = [];
        const processedKeys = new Set<string>();

        entries.forEach(([key, value]: [string, any]) => {
            if (processedKeys.has(key)) return;

            if (key.startsWith("new_")) {
                const baseKey = key.replace("new_", "");
                processedKeys.add(`old_${baseKey}`);
                displayEntries.push({ key: baseKey, value });
            } else if (key.startsWith("old_")) {
                const baseKey = key.replace("old_", "");
                const newValue = details[`new_${baseKey}`];
                if (newValue !== undefined) {
                    processedKeys.add(`new_${baseKey}`);
                    displayEntries.push({ key: baseKey, value: newValue });
                } else {
                    displayEntries.push({ key, value });
                }
            } else {
                displayEntries.push({ key, value });
            }
        });

        if (displayEntries.length === 0) return "--";

        return displayEntries.map((entry) => {
            const { key, value } = entry;
            const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            const displayVal = formatAuditValue(value);
            return `${formattedKey}: ${displayVal}`;
        }).join(" | ");
    }

    return "--";
};

export const formatAuditActionText = (actionType?: string): string => {
    if (!actionType) return "--";
    return actionType
        .split(/[_ ]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

export const getAuditActionBadge = (actionType?: string) => {
    if (!actionType) return "--";
    
    // Convert e.g. "Status_change" to "Status Change"
    const displayType = formatAuditActionText(actionType);
        
    const type = actionType.toLowerCase();
    
    if (type.includes("create") || type.includes("add") || type.includes("insert")) {
        return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{displayType}</span>;
    }
    if (type.includes("delete") || type.includes("remove") || type.includes("deactivate")) {
        return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">{displayType}</span>;
    }
    
    // Default to Updated styles for other actions
    return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{displayType}</span>;
};
