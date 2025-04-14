import React, { useState } from "react";

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

  return (
    <img
      src={imgSrc || fallback}
      alt={alt}
      onError={() => setImgSrc(fallback)}
      {...props}
    />
  );
};

export default ImageWithFallback;
