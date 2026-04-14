import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Unauthorized Access Page
 * Expects navigation state:
 *   state = { endpoint: string }
 */
export default function UnauthorizedAccessPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const endpoint = (location.state as any)?.endpoint || "/login";

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <Card className="rounded-2xl shadow-xl border border-border">
                    <CardContent className="p-8 text-center space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                                <ShieldAlert className="h-8 w-8 text-red-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-foreground">
                                Access Denied
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                You are not authorized to access this section.
                            </p>
                        </div>

                        {/* Endpoint Info */}
                        <div className="bg-muted/40 border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Attempted resource</p>
                            <p className="text-sm font-mono text-foreground break-all">
                                {endpoint}
                            </p>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground">
                            Your role does not have the required permissions to view or interact with this page.
                            Please contact your administrator if you believe this is a mistake.
                        </p>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                variant="hero"
                                className="w-full"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go Back
                            </Button>

                            {/* Future redirect button (you decide target later) */}
                            <Button
                                variant="heroOutline"
                                className="w-full"
                                onClick={() => {
                                    // You decide redirect logic later
                                    // Example: navigate("/dashboard")
                                }}
                            >
                                Go to Safe Area
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
