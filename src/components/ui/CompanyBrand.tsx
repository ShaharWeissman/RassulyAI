export default function CompanyBrand({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`company-brand ${className}`}
      role="img"
      aria-label="מנשה רסולי — הנדסה אזרחית בע״מ"
    >
      <span className="company-brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="company-brand-copy" aria-hidden="true">
        <strong>מנשה רסולי</strong>
        <small>הנדסה אזרחית בע״מ</small>
      </span>
    </span>
  );
}
