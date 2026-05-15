type Props = {
    title: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    titleClassName?: string;
};

export default function PropertyViewSection({ title, children, className, titleClassName }: Props) {

    return (
        <section className="space-y-4 rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm">

            <h3 className={titleClassName || "text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3"}>
                {title}
            </h3>

            <div className={className || "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4"}>
                {children}
            </div>

        </section>
    );
}
