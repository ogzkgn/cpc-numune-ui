import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Sayfa bulunamadı</h1>
      <p className="max-w-md text-sm text-slate-600">
        Aradığınız sayfa taşınmış veya silinmiş olabilir. Lütfen menüyü kullanarak devam edin.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-primary/90"
      >
        Gösterge Paneline Dön
      </Link>
    </div>
  );
};

export default NotFoundPage;
