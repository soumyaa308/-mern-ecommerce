import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiCheckCircle } from "react-icons/fi";
import { fetchOrderById } from "../../features/orders/ordersSlice";
import { formatINR } from "../../utils/formatCurrency";

const OrderSuccess = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentOrder } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [dispatch, id]);

  return (
    <div className="container-app flex flex-col items-center py-20 text-center">
      <FiCheckCircle size={56} className="text-brand-600" />
      <h1 className="mt-4 text-2xl font-bold">Order Placed Successfully!</h1>
      <p className="mt-2 text-gray-500">Thank you for your order. We'll start processing it right away.</p>

      {currentOrder && (
        <div className="card mt-8 w-full max-w-md p-6 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono">{currentOrder._id}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold">{formatINR(currentOrder.total)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-gray-500">Payment Method</span>
            <span className="uppercase">{currentOrder.paymentMethod}</span>
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link to="/my-orders" className="btn-primary">
          View My Orders
        </Link>
        <Link to="/shop" className="btn-secondary">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;