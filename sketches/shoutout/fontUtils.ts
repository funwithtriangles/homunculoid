const injectedFontKeys = new Set<string>();

type FontInjectionOptions = {
  fontFamily: string;
  fontUrl: string;
  fontStyle?: string;
  fontWeight?: number | string;
  fontDisplay?: string;
  format?: string;
};

export function ensureFontInjected({
  fontFamily,
  fontUrl,
  fontStyle = "normal",
  fontWeight = 400,
  fontDisplay = "swap",
  format = "woff2",
}: FontInjectionOptions) {
  const id =
    `hud-font-${fontFamily}-${fontStyle}-${fontWeight}-${format}`.replace(
      /[^a-z0-9_-]/gi,
      "-",
    );
  if (injectedFontKeys.has(id)) {
    return;
  }

  if (!document?.head) {
    return;
  }

  if (document.getElementById(id)) {
    injectedFontKeys.add(id);
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@font-face {
  font-family: "${fontFamily}";
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  font-display: ${fontDisplay};
  src: url("${fontUrl}") format("${format}");
}`;
  document.head.appendChild(style);
  injectedFontKeys.add(id);
}
