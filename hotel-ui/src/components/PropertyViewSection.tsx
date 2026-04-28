type Props = {
    title: string;
    children: React.ReactNode;
};

export default function PropertyViewSection({ title, children }: Props) {

    return (
        <div className="space-y-4">

            <h3 className="text-sm font-semibold text-foreground">{title}</h3>

            <div className="grid grid-cols-1 gap-4">

                {children}

            </div>

        </div>
    );
}
