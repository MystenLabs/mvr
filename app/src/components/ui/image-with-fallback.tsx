import React, { useEffect, useRef, useState } from "react";

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string;
};

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallback = "/default-icon.svg",
  alt,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const ref = useRef<HTMLImageElement>(null);

  // An image of the server HTML may have failed before hydration, in which
  // case `onError` never fires. `naturalWidth` is also 0 for some valid images
  // (e.g. SVGs without dimensions), so we reload it to get the event again.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) img.src = img.src;
  }, []);

  return (
    <img
      ref={ref}
      src={imgSrc || fallback}
      alt={alt}
      onError={() => setImgSrc(fallback)}
      {...props}
    />
  );
};

export default ImageWithFallback;
