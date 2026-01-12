import { useEffect, useState } from "react";
import { getOrders } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";

const STATUSES = [
  "PLACED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("PLACED");
  const navigate = useNavigate();


  useEffect(() => {
    fetchOrders();
  }, [status]);

  const fetchOrders = async () => {
    try {
      const res = await getOrders(status);
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Admin Orders</h2>

      <div className="mb-4">
        <label className="mr-2 font-medium">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

    
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Order ID</th>
            <th className="border p-2">Amount</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-4">
                No orders found
              </td>
            </tr>
          )}

          {orders.map(o => (
            <tr key={o.order_id}>
              <td className="border p-2">{o.order_id}</td>
              <td className="border p-2">₹{o.amount}</td>
              <td className="border p-2">{o.status}</td>
              <td className="border p-2">
                <button
                  className="text-blue-600 underline"
                  onClick={() => navigate(`/orders/${o.order_id}`)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
