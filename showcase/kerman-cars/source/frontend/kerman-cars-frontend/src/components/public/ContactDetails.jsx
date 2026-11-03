import { contactItems } from "../../services/siteInfoData";
export default function ContactDetails({ settings, hideEmpty = false }) {
    const items = contactItems(settings);
    if (!items.length)
        return hideEmpty ? null : (
            <p role="status">اطلاعات تماس هنوز ثبت نشده است.</p>
        );
    return (
        <dl className="site-info-contacts">
            {items.map((item) => (
                <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>
                        {item.href ? (
                            <a
                                href={item.href}
                                dir="ltr"
                                target={item.external ? "_blank" : undefined}
                                rel={item.external ? "noreferrer" : undefined}
                            >
                                {item.value}
                                {item.external && (
                                    <span className="visually-hidden">
                                        {" "}
                                        (صفحه جدید)
                                    </span>
                                )}
                            </a>
                        ) : (
                            <span>{item.value}</span>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
