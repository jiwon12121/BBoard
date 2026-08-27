import HorizontalRule from "@tiptap/extension-horizontal-rule";

// StarterKit's bundled version renders a plain <hr>, which fights the
// browser's (and Tailwind preflight's) own default hr styling when trying
// to pad out its click-to-select hit area without changing how thick the
// visible line looks - a plain div avoids that entirely: the outer div is
// the (padded, easy-to-click) box, the inner one is the visible 1px line.
export const AtomHorizontalRule = HorizontalRule.extend({
  // Needed for click-to-select + Delete - see ResizableImage's atom: true
  // for the full explanation (same reasoning, this just has no other
  // custom behavior worth its own file).
  atom: true,
  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "horizontalRule");
      const line = document.createElement("div");
      line.className = "hr-line";
      dom.append(line);
      return { dom };
    };
  },
});
