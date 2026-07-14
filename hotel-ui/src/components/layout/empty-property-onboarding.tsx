import { Building2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function EmptyPropertyOnboarding() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center space-y-6">
            <div className="h-24 w-24 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Building2 className="h-12 w-12" />
            </div>
            
            <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-semibold text-foreground">No property configured yet</h2>
                <p className="text-muted-foreground">
                    Create your first property to start using bookings, rooms, room status, laundry, restaurant orders, inventory, and other hotel operations.
                </p>
            </div>

            <Button onClick={() => navigate("/properties")} size="lg" className="mt-4 gap-2">
                <PlusCircle className="h-5 w-5" />
                Create Your First Property
            </Button>
        </div>
    );
}
