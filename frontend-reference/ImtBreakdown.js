const ImtBreakdown = ({ results, t }) => {
  const labels = t.results;
  const buyers = t.form.buyers;

  return (
    <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <h3 className="font-bold text-blue-900">{labels.breakdownTitle}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 font-bold uppercase text-[10px] tracking-widest bg-white border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4">#</th>
              <th className="px-6 py-4">{buyers.share.label}</th>
              <th className="px-6 py-4">{labels.imt}</th>
              <th className="px-6 py-4">{labels.stampDuty}</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {results.breakdown.map((row, i) => (
              <tr key={i} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-bold text-blue-900">
                  {buyers.label} {i + 1}
                </td>
                <td className="px-6 py-4 text-gray-600">{(row.share * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-gray-600">{row.imt}€</td>
                <td className="px-6 py-4 text-gray-600">{row.stampDuty}€</td>
                <td className="px-6 py-4 font-bold text-blue-900 text-right">{row.total}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImtBreakdown;
