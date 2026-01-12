import { useState } from "react";
import { updateOrderStatus } from "../api/adminApi";

export default function UpdateStatusModal({ orderId }: { orderId: number }) {
  const [status, setStatus] = useState("OUT_FOR_DELIVERY");

  const submit = () => {
    updateOrderStatus(orderId, {
      status,
      description: status,
      location: "Customer City"
    }).then(() => {
      alert("Status updated");
      window.location.reload();
    });
  };

  return (
    <div>
      <h3>Update Status</h3>
      <select onChange={e => setStatus(e.target.value)}>
        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
        <option value="DELIVERED">DELIVERED</option>
      </select>
      <button onClick={submit}>Update</button>
    </div>
  );
}
