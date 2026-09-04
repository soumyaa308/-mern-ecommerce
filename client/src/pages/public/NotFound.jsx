import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="container-app flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-brand-600">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found</p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;