type Props = {
    title: string;
    children: React.ReactNode;
};

export default function PropertyViewSection({ title, children }: Props) {

    return (
        <div className="border border-border rounded-[5px] bg-card p-5 space-y-4">

            <h3 className="font-semibold text-base">{title}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {children}

            </div>

        </div>
    );
}
