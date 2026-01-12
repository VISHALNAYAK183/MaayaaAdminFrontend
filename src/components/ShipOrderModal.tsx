import { useState } from "react";
import { shipOrder } from "../api/adminApi";

export default function ShipOrderModal({ orderId }: { orderId: number }) {
  const [form, setForm] = useState<any>({});

  const submit = () => {
    shipOrder(orderId, form).then(() => {
      alert("Order shipped");
      window.location.reload();
    });
  };

  return (
    <div>
      <h3>Ship Order</h3>
      <input placeholder="Carrier" onChange={e => setForm({...form, carrier: e.target.value})}/>
      <input placeholder="Tracking Number" onChange={e => setForm({...form, trackingNumber: e.target.value})}/>
      <input placeholder="Tracking URL" onChange={e => setForm({...form, trackingUrl: e.target.value})}/>
      <input type="date" onChange={e => setForm({...form, estimatedDeliveryDate: e.target.value})}/>
      <button onClick={submit}>Ship</button>
    </div>
  );
}
