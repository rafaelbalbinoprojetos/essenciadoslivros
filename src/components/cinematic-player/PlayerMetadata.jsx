import React from "react";
import { Heart, Share2, Star } from "lucide-react";

export function PlayerMetadata({
  title,
  author,
  liked,
  onToggleLike,
  onShare,
  rating,
  ratingHover,
  onRatingHover,
  onRate,
  canRate,
}) {
  return (
    <div className="player-metadata">
      <div className="player-metadata__main">
        <button type="button" onClick={onToggleLike} aria-label="Curtir" className={`icon-action ${liked ? "is-liked" : ""}`}>
          <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h2>{title}</h2>
          <p>{author}</p>
        </div>
        <button type="button" onClick={onShare} aria-label="Compartilhar" className="icon-action">
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {canRate && (
        <div className="player-rating" onMouseLeave={() => onRatingHover?.(0)}>
          <div>
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (ratingHover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => onRatingHover?.(n)}
                  onClick={() => onRate?.(n)}
                  aria-label={`Avaliar com ${n} estrela${n > 1 ? "s" : ""}`}
                >
                  <Star className="h-5 w-5" fill={filled ? "currentColor" : "none"} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <span>{rating ? "Sua avaliaÃ§Ã£o" : "Toque para avaliar"}</span>
        </div>
      )}
    </div>
  );
}

