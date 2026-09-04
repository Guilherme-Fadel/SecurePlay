import {
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";

export function ProgressiveImage({
  className = "",
  src,
  onLoad,
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const imageRef = useRef<HTMLImageElement>(null);
  const sourceKey = src ?? "";
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const loaded = Boolean(sourceKey) && loadedSource === sourceKey;

  useLayoutEffect(() => {
    const image = imageRef.current;
    // Imagens vindas do memory/disk cache podem concluir antes do efeito do
    // React. Nesse caso não haverá um segundo `load`, então confirmamos o estado
    // diretamente pelo elemento antes de o navegador pintar o blur.
    setLoadedSource(
      image?.complete && image.naturalWidth > 0 ? sourceKey : null,
    );
  }, [sourceKey]);

  return (
    <img
      {...props}
      ref={imageRef}
      src={src}
      className={`progressive-image ${loaded ? "is-loaded" : ""} ${className}`}
      onLoad={(event) => {
        setLoadedSource(sourceKey);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoadedSource(null);
        onError?.(event);
      }}
    />
  );
}
