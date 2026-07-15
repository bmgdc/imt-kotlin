import ImtCalculator from "@/components/Imt/ImtCalculator";
import { getStrings } from "@/i18n";
import { formatMessage } from "@/i18n/formatMessage";

export const generateMetadata = async ({ params }) => {
  const { locale } = await params;
  const t = await getStrings(locale);

  const year = new Date().getFullYear();

  const values = {
    year,
    country: "Portugal",
  };

  return {
    title: formatMessage(t.tools.imt.seo.title, values, locale),
    description: formatMessage(t.tools.imt.seo.description, values, locale),
  };
};

const ImtToolPage = async ({ params }) => {
  const { locale } = await params;
  const t = await getStrings(locale);
  const currentYear = new Date().getFullYear();

  return (
    <main className="bg-neutral-50 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-12">
        <nav className="mb-6 text-sm font-medium text-gray-500">
          <ul className="flex items-center gap-2">
            <li>
              <a href={`/${locale}/tools`} className="hover:text-blue-900 transition">
                {t.navigationBar.tools}
              </a>
            </li>
            <li className="text-gray-300">/</li>
            <li className="text-blue-900 font-bold">{t.tools.imt.title}</li>
          </ul>
        </nav>

        <header className="mb-10 space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
            {t.tools.imt.badge} {currentYear}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-tight">
            {t.tools.imt.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">{t.tools.imt.description}</p>
        </header>

        <ImtCalculator t={t} locale={locale} year={currentYear} />

        <footer className="pt-8 border-neutral-200">
          <p className="text-sm text-gray-400 italic leading-relaxed max-w-4xl">{t.tools.imt.disclaimer}</p>
        </footer>
      </section>
    </main>
  );
};

export default ImtToolPage;
