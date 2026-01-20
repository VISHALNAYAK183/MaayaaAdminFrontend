import React, { useState } from "react";
import { addCoupon, AddCouponPayload } from "../../api/adminCoupon";

const AddCoupon = () => {
  const [form, setForm] = useState<AddCouponPayload>({
    code: "",
    discountType: "P",
    value: 0,
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
    validFrom: "",
    validTill: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "discountType"
          ? (value as "P" | "F")
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await addCoupon({
        ...form,
        value: Number(form.value),
        minPurchase: Number(form.minPurchase),
        maxDiscount: Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit),
      });

      alert(res.data.message);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add coupon");
    }
  };

  return (
    <div className="bg-white p-6 rounded max-w-3xl">
      <h2 className="text-2xl font-semibold mb-6">Add Coupon</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">

        {/* Coupon Code */}
        <div>
          <label className="block mb-1 font-medium">Coupon Code</label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="SUMMER25"
            className="input w-full"
            required
          />
        </div>

        {/* Discount Type */}
        <div>
          <label className="block mb-1 font-medium">Discount Type</label>
          <select
            name="discountType"
            value={form.discountType}
            onChange={handleChange}
            className="input w-full"
          >
            <option value="P">Percentage (%)</option>
            <option value="F">Flat Amount (₹)</option>
          </select>
        </div>

        {/* Discount Value */}
        <div>
          <label className="block mb-1 font-medium">
            Discount Value
          </label>
          <input
            type="number"
            name="value"
            value={form.value}
            onChange={handleChange}
            placeholder="25"
            className="input w-full"
            required
          />
        </div>

        {/* Minimum Purchase */}
        <div>
          <label className="block mb-1 font-medium">
            Minimum Purchase (₹)
          </label>
          <input
            type="number"
            name="minPurchase"
            value={form.minPurchase}
            onChange={handleChange}
            placeholder="999"
            className="input w-full"
          />
        </div>

        {/* Maximum Discount */}
        <div>
          <label className="block mb-1 font-medium">
            Maximum Discount (₹)
          </label>
          <input
            type="number"
            name="maxDiscount"
            value={form.maxDiscount}
            onChange={handleChange}
            placeholder="200"
            className="input w-full"
          />
        </div>

        {/* Usage Limit */}
        <div>
          <label className="block mb-1 font-medium">
            Usage Limit
          </label>
          <input
            type="number"
            name="usageLimit"
            value={form.usageLimit}
            onChange={handleChange}
            placeholder="10"
            className="input w-full"
          />
        </div>

        {/* Valid From */}
        <div>
          <label className="block mb-1 font-medium">Valid From</label>
          <input
            type="date"
            name="validFrom"
            value={form.validFrom}
            onChange={handleChange}
            className="input w-full"
            required
          />
        </div>

        {/* Valid Till */}
        <div>
          <label className="block mb-1 font-medium">Valid Till</label>
          <input
            type="date"
            name="validTill"
            value={form.validTill}
            onChange={handleChange}
            className="input w-full"
            required
          />
        </div>

        {/* Submit */}
        <div className="col-span-2 text-right mt-4">
          <button
            type="submit"
            className="bg-black text-white px-8 py-2 rounded hover:opacity-90"
          >
            Add Coupon
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddCoupon;
