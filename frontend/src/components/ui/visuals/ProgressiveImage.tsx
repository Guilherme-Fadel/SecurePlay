import { useEffect, useState, type ImgHTMLAttributes } from 'react';

export function ProgressiveImage({ className = '', src, onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);
  return <img {...props} src={src} className={`progressive-image ${loaded ? 'is-loaded' : ''} ${className}`} onLoad={(event) => { setLoaded(true); onLoad?.(event); }} onError={onError} />;
}
