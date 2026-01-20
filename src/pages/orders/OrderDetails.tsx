import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOrderDetails } from "../../api/adminApi";
import ShipOrderModal from "../../components/ShipOrderModal";
import UpdateStatusModal from "../../components/UpdateStatusModal";

export default function OrderDetails() {
  const { orderId } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getOrderDetails(Number(orderId)).then(res => setData(res.data));
  }, [orderId]);

  if (!data) return <p>Loading...</p>;

  const status = data.order.status;

  return (
    <div>
      <h2>Order #{data.order.order_id}</h2>
      <p>Status: {status}</p>

      <h3>Products</h3>
      {data.products.map((p: any) => (
        <div key={p.product_id}>
          <b>{p.name}</b> — ₹{p.price} × {p.quantity}
        </div>
      ))}

    
      {status === "PLACED" && (
        <>
          <h3>Actions</h3>
          <ShipOrderModal orderId={data.order.order_id} />
        </>
      )}

      
      {["SHIPPED", "OUT_FOR_DELIVERY"].includes(status) && (
        <UpdateStatusModal
          orderId={data.order.order_id}
          currentStatus={status}
        />
      )}
    </div>
  );
}
