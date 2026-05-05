import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useGetLogsQuery } from "@/redux/services/hmsApi";
import { formatAppDateTime } from "@/utils/dateFormat";

/* ---------------- Types ---------------- */
type LogItem = {
    id: string;
    property_id: string;
    event_id: string;
    table_name: string;
    event_type: string;
    task_name: string;
    comments: string;
    details: string; // JSON string (dynamic)
    user_id: string;
    user_email: string;
    user_first_name: string;
    user_last_name: string;
    created_on: string;
};

type Props = {
    bookingId: string;
};

/* ---------------- Utils ---------------- */
const parseDetails = (details?: string) => {
    if (!details) return null;
    try {
        return JSON.parse(details);
    } catch {
        return null;
    }
};

const formatKey = (key: string) =>
    key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

/* ---------------- Component ---------------- */
export default function BookingLogsEmbedded({ bookingId }: Props) {
    const [logs, setLogs] = useState<LogItem[]>([]);

    const { data, isLoading } = useGetLogsQuery(
        { eventId: bookingId, tableName: "bookings" },
        { skip: !bookingId }
    );

    useEffect(() => {
        if (!data?.data) return;
        setLogs(data.data); // no pagination, direct render
    }, [data]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Activity Logs</h2>
            </div>

            {isLoading && (
                <p className="text-sm text-muted-foreground">Loading logs...</p>
            )}

            {!isLoading && logs.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity found</p>
            )}

            <div className="space-y-4">
                {logs.map((log) => {
                    const detailsObj = parseDetails(log.details);

                    return (
                        <Card key={log.id} className="rounded-[5px] border bg-background">
                            <CardContent className="p-5 space-y-3">
                                {/* Header */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                        <p className="font-medium text-sm">{log.task_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.comments}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline">{log.event_type}</Badge>
                                        <p className="text-xs text-muted-foreground">
                                            {formatAppDateTime(log.created_on)}
                                        </p>
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="text-xs text-muted-foreground">
                                    By {log.user_first_name} {log.user_last_name} ({log.user_email})
                                </div>

                                {/* Dynamic Details */}
                                {detailsObj && (
                                    <div className="rounded-[3px] border bg-muted/30 p-3">
                                        <p className="text-xs font-medium mb-2">Details</p>
                                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                                            {Object.entries(detailsObj).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="flex justify-between gap-2"
                                                >
                                                    <span className="text-muted-foreground">
                                                        {formatKey(key)}
                                                    </span>
                                                    <span className="font-medium text-right">
                                                        {typeof value === "object"
                                                            ? JSON.stringify(value)
                                                            : String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
