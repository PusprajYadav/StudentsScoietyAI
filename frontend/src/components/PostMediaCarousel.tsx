import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PostMediaCarouselProps {
  images: string[];
  alt: string;
  onOpen?: (index: number) => void;
}

export function PostMediaCarousel({ images, alt, onOpen }: PostMediaCarouselProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const activeImage = images[index] || images[0] || "";

  useEffect(() => {
    setImageLoaded(false);
  }, [activeImage]);

  useEffect(() => {
    const node = rootRef.current;

    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-[24px] border border-app-border"
      style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}
    >
      <div className="relative">
        <div className="relative min-h-[190px] bg-app-secondary/40 sm:min-h-[250px] xl:min-h-[270px]">
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg transition hover:bg-slate-900 sm:px-3 sm:py-2 sm:text-xs"
            >
              <Expand className="h-4 w-4" />
              View full
            </button>
          ) : null}

          {!isVisible ? (
            <div className="absolute inset-0 animate-pulse bg-app-secondary/70" />
          ) : null}

          {isVisible ? (
            <img
              src={activeImage}
              alt={alt}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onClick={() => onOpen?.(index)}
              className={`max-h-[300px] w-full bg-app-secondary/10 object-contain transition duration-300 sm:max-h-[360px] xl:max-h-[380px] ${
                imageLoaded ? "cursor-zoom-in opacity-100" : "opacity-0"
              }`}
            />
          ) : null}

          {isVisible && !imageLoaded ? (
            <div className="absolute inset-0 animate-pulse bg-app-secondary/70" />
          ) : null}
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((current) => (current === 0 ? images.length - 1 : current - 1))}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/55 text-white sm:h-10 sm:w-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((current) => (current === images.length - 1 ? 0 : current + 1))}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/55 text-white sm:h-10 sm:w-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex items-center justify-between gap-4 bg-app-card px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex gap-2">
            {images.map((image, imageIndex) => (
              <button
                key={image}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`h-2.5 rounded-full transition ${
                  imageIndex === index ? "w-8 bg-brand" : "w-2.5 bg-app-border"
                }`}
                aria-label={`Go to image ${imageIndex + 1}`}
              />
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
            {index + 1}/{images.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}
