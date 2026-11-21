import { createElement } from "react";

const RENDERS = import.meta.glob("../assets/renders/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

export function Render({ name }: { name: string }) {
  const src = RENDERS[`../assets/renders/${name}.svg`];
  return src
    ? createElement("img", { className: "render", src, alt: "" })
    : createElement("span", { className: "render" });
}