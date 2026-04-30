type Props = {
    title: string;
    children: React.ReactNode;
};

export default function PropertyViewSection({ title, children }: Props) {

    return (
        <div className="space-y-3">

            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">{title}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                {children}

            </div>

        </div>
    );
}
