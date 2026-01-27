import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOrderDetails } from "../../api/adminApi";
import ShipOrderModal from "../../components/ShipOrderModal";
import UpdateStatusModal from "../../components/UpdateStatusModal";
import {
  approveOrder,
  rejectOrder
} from "../../api/adminApi";

export default function OrderDetails() {
  const { orderId } = useParams();
  const [data, setData] = useState<any>(null);
const handleApprove = async () => {
  await approveOrder(data.order.order_id);
  window.location.reload();
};

const handleReject = async () => {
  if (!confirm("Reject this order?")) return;
  await rejectOrder(data.order.order_id);
  window.location.reload();
};
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

    
     <h3 className="mt-6 font-semibold">Actions</h3>

{/* REQUESTED */}
{status === "REQUESTED" && (
  <div className="flex gap-3">
    <button
      onClick={handleApprove}
      className="bg-green-600 text-white px-4 py-2 rounded"
    >
      Approve
    </button>

    <button
      onClick={handleReject}
      className="bg-red-600 text-white px-4 py-2 rounded"
    >
      Reject
    </button>
  </div>
)}

{/* PLACED */}
{status === "PLACED" && (
  <ShipOrderModal orderId={data.order.order_id} />
)}

{/* SHIPPED / OUT_FOR_DELIVERY */}
{["SHIPPED", "OUT_FOR_DELIVERY"].includes(status) && (
  <UpdateStatusModal
    orderId={data.order.order_id}
    currentStatus={status}
  />
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
