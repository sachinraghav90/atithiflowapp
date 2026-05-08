import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useGetLogsQuery, useGetAllRoomsMetaQuery } from "@/redux/services/hmsApi";
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
    propertyId?: number;
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
export default function BookingLogsEmbedded({ bookingId, propertyId }: Props) {
    const [logs, setLogs] = useState<LogItem[]>([]);

    const { data, isLoading } = useGetLogsQuery(
        { eventId: bookingId, tableName: "bookings" },
        { skip: !bookingId }
    );

    const { data: roomsMeta } = useGetAllRoomsMetaQuery({ propertyId }, {
        skip: !propertyId
    });

    useEffect(() => {
        if (!data?.data) return;
        setLogs(data.data); // no pagination, direct render
    }, [data]);

    const renderValue = (key: string, value: any) => {
        if (key.toLowerCase() === "rooms" && Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {value.map((roomNo: any) => {
                        const meta = roomsMeta?.find((r: any) => String(r.room_no) === String(roomNo));
                        return (
                            <div 
                                key={roomNo} 
                                className="flex flex-col items-center justify-center min-w-[40px] px-2 py-1 bg-primary/5 border border-primary/20 rounded-[3px] shadow-sm"
                            >
                                <span className="text-[10px] font-bold text-primary">{roomNo}</span>
                                {meta?.floor_number && (
                                    <span className="text-[8px] text-muted-foreground leading-none">F{meta.floor_number}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1">
                    {value.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 h-4">{String(v)}</Badge>
                    ))}
                </div>
            );
        }

        if (typeof value === "object" && value !== null) {
            return <span className="italic opacity-50">{JSON.stringify(value)}</span>;
        }

        return <span className="text-foreground/90">{String(value)}</span>;
    };

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
                        <Card key={log.id} className="rounded-[5px] border border-border/70 bg-background shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                {/* TOP BAR: TASK + TYPE + TIME */}
                                <div className="flex justify-between items-center px-5 py-3 border-b border-border/50 bg-muted/10">
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm text-primary/90">{log.task_name}</p>
                                        <p className="text-[11px] text-muted-foreground/80 font-medium">
                                            {log.comments}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-[11px] font-medium px-2 py-0 h-5 bg-background border-border/60">
                                            {formatKey(log.event_type)}
                                        </Badge>
                                        <p className="text-[11px] text-muted-foreground/70 font-medium">
                                            {formatAppDateTime(log.created_on)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* USER INFO */}
                                    <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                                        <span className="font-semibold uppercase tracking-tight">Performed By:</span>
                                        <span className="text-foreground/90 font-medium">{log.user_first_name} {log.user_last_name}</span>
                                        <span className="opacity-50">•</span>
                                        <span className="italic">{log.user_email}</span>
                                    </div>

                                    {/* DYNAMIC DETAILS */}
                                    {detailsObj && (
                                        <div className="rounded-[3px] border border-border/50 bg-muted/5 p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
                                                {Object.entries(detailsObj).map(([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="flex flex-col gap-1"
                                                    >
                                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                            {formatKey(key)}
                                                        </span>
                                                        <div className="text-xs font-semibold">
                                                            {renderValue(key, value)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
