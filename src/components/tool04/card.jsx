// Adapted teaching subset of shadcn/ui Card, MIT (c)2023 shadcn.
// Source: https://github.com/shadcn-ui/ui/blob/25af02b1b467fcd53b63e0c6d6d324c57c16ef18/apps/v4/registry/new-york-v4/ui/card.tsx
// Local changes: JSX, scoped handwritten CSS, semantic h3/p, no Tailwind/cn.
// This file is maintained here; not CLI-generated. License: /licenses/shadcn-ui-MIT.txt
import React from "react";
export function Card({ className = "", ...props }) {
  return (
    <div data-slot="card" className={`tool04-card ${className}`} {...props} />
  );
}
export function CardHeader({ className = "", ...props }) {
  return (
    <div
      data-slot="card-header"
      className={`tool04-card-header ${className}`}
      {...props}
    />
  );
}
export function CardTitle(props) {
  return <h3 data-slot="card-title" {...props} />;
}
export function CardDescription(props) {
  return <p data-slot="card-description" {...props} />;
}
export function CardContent(props) {
  return <div data-slot="card-content" {...props} />;
}
export function CardFooter(props) {
  return <div data-slot="card-footer" {...props} />;
}
