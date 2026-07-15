import { roundCurrency } from "@/lib/tools/Imt/tax_utils";

const ImtReferenceTable = ({ tableData, label, price, t, isSecondary }) => {
  if (!tableData || tableData.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm bg-white">
      <div className={`px-8 py-5 border-b border-blue-100 ${isSecondary ? "bg-teal-700" : "bg-blue-900"}`}>
        <h4 className="text-white font-bold text-xl tracking-tight">{label}</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base text-left">
          <thead>
            <tr className="bg-neutral-50 text-gray-500 font-bold uppercase text-xs tracking-widest border-b border-neutral-100">
              <th className="px-8 py-5">{t.tables.header.price}</th>
              <th className="px-8 py-5 text-center">{t.tables.header.rate}</th>
              <th className="px-8 py-5 text-right">{t.tables.header.deduction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {tableData.map((bracket, idx) => {
              const previousLimit = idx === 0 ? 0 : tableData[idx - 1].upTo;

              const isActive = price <= bracket.upTo && (idx === 0 ? price >= 0 : price > previousLimit);
              const isSingleRowFlatRate = tableData.length === 1 && bracket.upTo === Infinity;

              let limitText = "";
              if (isSingleRowFlatRate) {
                limitText = price > 0 ? `${roundCurrency(price)}€` : "Valor de Aquisição";
              } else if (idx === 0) {
                limitText = `${t.tables.adpositions.upTo} ${roundCurrency(bracket.upTo)}€`;
              } else if (bracket.upTo === Infinity) {
                limitText = `${t.tables.adpositions.over} ${roundCurrency(previousLimit)}€`;
              } else {
                limitText = `${t.tables.adpositions.from} ${roundCurrency(previousLimit)}€ ${t.tables.adpositions.to} ${roundCurrency(bracket.upTo)}€`;
              }

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${isActive ? (isSecondary ? "bg-teal-50" : "bg-blue-50") : "hover:bg-gray-50"}`}
                >
                  <td className={`px-8 py-5 font-medium ${isActive ? "text-blue-900" : "text-gray-700"}`}>
                    {limitText}
                  </td>
                  <td className="px-8 py-5 text-center text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold">{(bracket.rate * 100).toFixed(1)}%</span>
                      {bracket.rate === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase text-green-700 bg-green-100 rounded-md">
                          Isento
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right text-gray-500 font-mono">
                    {bracket.deduction > 0 ? `${roundCurrency(bracket.deduction)}€` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImtReferenceTable;
