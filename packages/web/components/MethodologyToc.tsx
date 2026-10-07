"use client";

import { useEffect, useState } from "react";

export interface TocItem { id: string; label: string; code?: string; group: string }

export function MethodologyToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    // The app header height varies (the dataset notice is optional), so the sticky offset is measured.
    const header = document.querySelector("header");
    const setOffset = () => document.documentElement.style.setProperty("--method-offset", `${Math.ceil(header?.getBoundingClientRect().height ?? 72)}px`);
    setOffset();
    const resize = header ? new ResizeObserver(setOffset) : null;
    if (header) resize?.observe(header);
    return () => resize?.disconnect();
  }, []);

  useEffect(() => {
    const elements = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target.id); else visible.delete(entry.target.id); }
      const first = items.find((item) => visible.has(item.id));
      if (first) setActive(first.id);
    }, { rootMargin: "-160px 0px -55% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  const groups = [...new Set(items.map((item) => item.group))];
  return <nav className="method-toc" aria-label="On this page">
    {groups.map((group) => <div key={group} className="method-toc-group">
      <p className="method-toc-title">{group}</p>
      <ul>
        {items.filter((item) => item.group === group).map((item) => <li key={item.id}>
          <a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} onClick={() => setActive(item.id)}>
            {item.code && <span className="method-toc-code">{item.code}</span>}<span>{item.label}</span>
          </a>
        </li>)}
      </ul>
    </div>)}
  </nav>;
}
