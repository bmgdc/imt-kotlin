import React, { useId } from "react";
import { IoAlertCircleOutline } from "react-icons/io5";

import { trackEvent } from "@/lib/analytics";

const Tooltip = ({ tooltip }) => {
  return (
    <div className="group/tooltip relative flex items-center">
      <IoAlertCircleOutline className="text-gray-400 hover:text-blue-900 transition-colors" size={16} />

      <div
        className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        w-64 p-3 bg-gray-900 text-white
        text-xs leading-relaxed
        rounded-lg shadow-xl
        opacity-0 invisible
        group-hover/tooltip:opacity-100
        group-hover/tooltip:visible
        transition-all duration-200
        z-50 pointer-events-none
        normal-case
        [&_*]:text-xs
        [&_*]:font-normal
      "
      >
        {React.Children.toArray(tooltip)}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
};

const Toggle = ({ label, tooltip, active, onClick, disabled, id }) => {
  const uid = useId();
  const base = label.trim().replace(/\s+/g, "-").toLowerCase();
  const inputId = id ?? `toggle-${base}-${uid}`;

  return (
    <div
      className={`flex items-center gap-2 select-none p-2 rounded-lg -ml-2 ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-neutral-50"
      }`}
    >
      <label htmlFor={inputId} className="flex items-center gap-3 cursor-inherit">
        <input
          id={inputId}
          type="checkbox"
          checked={active}
          onChange={!disabled ? onClick : undefined}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 shrink-0 ${
            active ? "bg-blue-900 border-blue-900 shadow-sm" : "bg-white border-gray-300"
          }`}
        >
          {active && <span className="text-white font-bold text-xs">✓</span>}
        </div>

        <span className={`text-sm font-bold leading-tight ${active ? "text-blue-900" : "text-gray-700"}`}>
          {label}
        </span>
      </label>

      {tooltip && <Tooltip tooltip={tooltip} />}
    </div>
  );
};

const ImtForm = ({
  buyers,
  location,
  isInUrbanRehabArea,
  postRehabFirstTransfer,
  price,
  purpose,
  setBuyers,
  setIsInUrbanRehabArea,
  setPostRehabFirstTransfer,
  setLocation,
  setPrice,
  setPurpose,
  t,
}) => {
  const trackCalculation = (triggerSource) => {
    if (!price || price <= 0) return;

    trackEvent("use_calculator", {
      tool_name: "imt_calculator",
      trigger: triggerSource,

      property_price: Number(price),
      property_location: location,
      property_purpose: purpose,

      is_rehab: isInUrbanRehabArea || postRehabFirstTransfer,
      has_young_buyer: buyers.some((b) => b.isYoungunEligible),
      has_offshore_buyer: buyers.some((b) => b.isOffshoreEntity),
      has_non_resident_buyer: buyers.some((b) => b.isNonResident),

      number_of_buyers: buyers.length,
    });
  };

  const inputBaseClass =
    "w-full p-3 rounded-xl border-2 border-neutral-100 bg-white focus:border-blue-900 outline-none transition";
  const totalShare = buyers.reduce((sum, b) => sum + b.share, 0);
  const isShareValid = Math.abs(totalShare - 1) < 0.001;

  const addBuyer = () => {
    const currentTotal = buyers.reduce((sum, b) => sum + b.share, 0);
    const remaining = Math.round((1 - currentTotal) * 10000) / 10000;
    setBuyers([
      ...buyers,
      {
        share: Math.max(0, remaining),
        isYoungunEligible: false,
        isOffshoreEntity: false,
        isNonResident: false,
      },
    ]);
  };

  const updateBuyer = (index, fields) => {
    const newBuyers = [...buyers];
    newBuyers[index] = { ...newBuyers[index], ...fields };
    setBuyers(newBuyers);
  };

  const removeBuyer = (index) => {
    if (buyers.length <= 1) return;

    const newBuyers = buyers.filter((_, i) => i !== index);
    if (newBuyers.length === 1) {
      newBuyers[0].share = 1;
    }
    setBuyers(newBuyers);
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide"
            >
              {t.tools.imt.form.location.label}
            </label>
            <select
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setTimeout(() => trackCalculation("location_change"), 500);
              }}
              className={inputBaseClass}
            >
              <option value="mainland">{t.tools.imt.form.location.values.mainland}</option>
              <option value="islands">{t.tools.imt.form.location.values.islands}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="purpose"
              className="block text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide"
            >
              {t.tools.imt.form.purpose.label}
            </label>
            <select
              id="purpose"
              value={purpose}
              onChange={(e) => {
                const newPurpose = e.target.value;
                setPurpose(newPurpose);

                const isHousing = newPurpose === "hpp" || newPurpose === "secondary";
                if (newPurpose !== "hpp") {
                  const updatedBuyers = buyers.map((b) => ({
                    ...b,
                    isYoungunEligible: false,
                    isNonResident: isHousing ? b.isNonResident : false,
                  }));
                  setBuyers(updatedBuyers);
                }
                setTimeout(() => trackCalculation("purpose_change"), 500);
              }}
              className={inputBaseClass}
            >
              <option value="hpp">{t.tools.imt.form.purpose.values.hpp}</option>
              <option value="secondary">{t.tools.imt.form.purpose.values.secondary}</option>
              <option value="rustic">{t.tools.imt.form.purpose.values.rustic}</option>
              <option value="other">{t.tools.imt.form.purpose.values.other}</option>
            </select>
          </div>
        </div>

        {/* Price Input */}
        <div>
          <label
            htmlFor="price"
            className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide"
          >
            <span>{t.tools.imt.form.price.label}</span>
            {t.tools.imt.form.price.tooltip && <Tooltip tooltip={t.tools.imt.form.price.tooltip} />}
          </label>
          <input
            id="price"
            type="number"
            value={price || ""}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => trackCalculation("price_blur")}
            placeholder="0"
            className={`${inputBaseClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-lg font-medium`}
          />
        </div>

        {/* Urban Rehabilitation */}
        <div className="flex flex-col gap-2 pt-2">
          <Toggle
            label={t.tools.imt.form.exemptions.isInUrbanRehabArea.label}
            tooltip={t.tools.imt.form.exemptions.isInUrbanRehabArea.tooltip}
            active={isInUrbanRehabArea}
            onClick={() => {
              setIsInUrbanRehabArea(!isInUrbanRehabArea);
              if (!isInUrbanRehabArea) {
                setPostRehabFirstTransfer(false);
              }
            }}
          />

          <Toggle
            label={t.tools.imt.form.exemptions.postRehabFirstTransfer.label}
            tooltip={t.tools.imt.form.exemptions.postRehabFirstTransfer.tooltip}
            active={postRehabFirstTransfer}
            disabled={purpose !== "hpp"}
            onClick={() => {
              setPostRehabFirstTransfer(!postRehabFirstTransfer);
              if (!postRehabFirstTransfer) {
                setIsInUrbanRehabArea(false);
              }
            }}
          />
        </div>

        {/* Buyers Section */}
        <div className="pt-6 border-t border-neutral-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-blue-900">{t.tools.imt.form.buyers.label}</h3>
            <button
              onClick={addBuyer}
              className="text-sm font-bold text-blue-600 hover:text-blue-800 transition px-3 py-1 rounded-lg hover:bg-blue-50"
            >
              + {t.tools.imt.form.buyers.addBuyer}
            </button>
          </div>

          <div className="space-y-4">
            {buyers.map((buyer, idx) => (
              <div
                key={idx}
                className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 relative group"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Share Input */}
                  {buyers.length > 1 && (
                    <div className="w-full sm:w-32 shrink-0">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        {t.tools.imt.form.buyers.share.label} (%)
                      </label>
                      <input
                        type="number"
                        value={Math.round(buyer.share * 100)}
                        onChange={(e) => updateBuyer(idx, { share: e.target.value / 100 })}
                        className={`${inputBaseClass} bg-white`}
                      />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col sm:flex-row sm_items-center gap-4 sm:gap-6">
                    {/* IMT Jovem */}
                    <Toggle
                      id={`buyer-${idx}-youngun`}
                      label={t.tools.imt.form.buyers.youngunBenefit.label}
                      tooltip={t.tools.imt.form.buyers.youngunBenefit.tooltip}
                      active={buyer.isYoungunEligible}
                      disabled={purpose !== "hpp" || buyer.isOffshoreEntity || buyer.isNonResident}
                      onClick={() =>
                        updateBuyer(idx, {
                          isYoungunEligible: !buyer.isYoungunEligible,
                          isOffshoreEntity: false,
                          isNonResident: false,
                        })
                      }
                    />

                    {/* Offshore */}
                    <Toggle
                      id={`buyer-${idx}-offshore`}
                      label={t.tools.imt.form.buyers.taxHavenEntity.label}
                      tooltip={t.tools.imt.form.buyers.taxHavenEntity.tooltip}
                      active={buyer.isOffshoreEntity}
                      disabled={buyer.isYoungunEligible || buyer.isNonResident}
                      onClick={() =>
                        updateBuyer(idx, {
                          isOffshoreEntity: !buyer.isOffshoreEntity,
                          isYoungunEligible: false,
                          isNonResident: false,
                        })
                      }
                    />

                    {/* Non-resident */}
                    <Toggle
                      id={`buyer-${idx}-non-resident`}
                      label={t.tools.imt.form.buyers.nonResidentBuyer.label}
                      tooltip={t.tools.imt.form.buyers.nonResidentBuyer.tooltip}
                      active={!!buyer.isNonResident}
                      disabled={
                        (purpose !== "hpp" && purpose !== "secondary") ||
                        buyer.isYoungunEligible ||
                        buyer.isOffshoreEntity
                      }
                      onClick={() =>
                        updateBuyer(idx, {
                          isNonResident: !buyer.isNonResident,
                          isYoungunEligible: false,
                          isOffshoreEntity: false,
                        })
                      }
                    />
                  </div>
                </div>

                {buyers.length > 1 && (
                  <button
                    onClick={() => removeBuyer(idx)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition p-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {!isShareValid && (
              <div className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                <IoAlertCircleOutline />
                {`${t.tools.imt.form.buyers.share.warning + (totalShare * 100).toFixed(0)}%)`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImtForm;
