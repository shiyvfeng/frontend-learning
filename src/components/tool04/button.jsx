// Original teaching component, not official shadcn generated code.
// Configuration is finite; children/props/ref reach the native button.
import React from "react";
export function LocalButton({
  variant = "solid",
  size = "normal",
  className = "",
  ...props
}) {
  const kind = variant === "outline" ? "outline" : "solid";
  const scale = size === "large" ? "large" : "normal";
  return (
    <button
      type="button"
      data-variant={kind}
      data-size={scale}
      className={`tool04-button ${className}`}
      {...props}
    />
  );
}
