import { useState } from "react";
import { updateOrderStatus } from "../api/adminApi";

export default function UpdateStatusModal({
  orderId,
  currentStatus
}: {
  orderId: number;
  currentStatus: string;
}) {
  const allowedNext = {
    PLACED: ["SHIPPED"],
    SHIPPED: ["OUT_FOR_DELIVERY"],
    OUT_FOR_DELIVERY: ["DELIVERED"]
  }[currentStatus] || [];

  const [status, setStatus] = useState(allowedNext[0]);

  const submit = async () => {
    await updateOrderStatus(orderId, {
      status,
      description: status.split("_").join(" "),
      location: "Customer City"
    });

    alert("Status updated");
    window.location.reload();
  };

  if (!allowedNext.length) return null;

  return (
    <div>
      <h3>Update Order Status</h3>

      <select value={status} onChange={e => setStatus(e.target.value)}>
        {allowedNext.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button onClick={submit}>Update</button>
    </div>
  );
}
