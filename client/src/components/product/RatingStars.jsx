import { FiStar } from "react-icons/fi";

/**
 * Displays a star rating. interactive=true renders clickable stars for
 * submitting a rating; otherwise it's a read-only display.
 */
const RatingStars = ({ rating = 0, size = 16, interactive = false, onChange }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <FiStar
            size={size}
            className={star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
};

export default RatingStars;