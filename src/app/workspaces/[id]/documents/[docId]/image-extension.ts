import { ResizableNodeView, getRenderedAttributes, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import type { Node as PMNode } from "@tiptap/pm/model";

const RESIZE_MANAGED_ATTRIBUTES = new Set(["src", "width", "height"]);

// @tiptap/extension-image's built-in `resize` option (Image.configure({
// resize: {...} })) only supports minWidth/minHeight, not a max - so a
// resize drag can grow an image past the document's own width with no way
// to stop it through that option. This mirrors the built-in nodeView (see
// node_modules/@tiptap/extension-image/dist/index.js) but adds a `max`,
// read from storage.maxWidth so it can be kept in sync with the document's
// configured width from React (see editor.tsx).
export const ResizableImage = Image.extend({
  draggable: false,
  addStorage() {
    return {
      maxWidth: undefined as number | undefined,
    };
  },
  addNodeView() {
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.draggable = false;

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null || key === "src" || key === "width" || key === "height") return;
        el.setAttribute(key, value);
      });

      const syncImageSource = (src: unknown) => {
        if (typeof src === "string" && src !== "") {
          if (el.getAttribute("src") !== src) el.src = src;
          return;
        }
        if (el.hasAttribute("src")) el.removeAttribute("src");
      };
      syncImageSource(mergedAttributes.src);

      let previousHTMLAttributes = { ...HTMLAttributes };
      const onUpdate = (updatedNode: PMNode) => {
        if (updatedNode.type !== node.type) return false;
        const newHTMLAttributes = getRenderedAttributes(
          updatedNode,
          editor.extensionManager.attributes.filter(
            (attribute) => attribute.type === updatedNode.type.name,
          ),
        );
        Object.keys(previousHTMLAttributes).forEach((key) => {
          if (!RESIZE_MANAGED_ATTRIBUTES.has(key) && !(key in newHTMLAttributes)) {
            el.removeAttribute(key);
          }
        });
        Object.entries(newHTMLAttributes).forEach(([key, value]) => {
          if (RESIZE_MANAGED_ATTRIBUTES.has(key)) return;
          if (value != null) el.setAttribute(key, value);
          else el.removeAttribute(key);
        });
        syncImageSource(newHTMLAttributes.src);
        previousHTMLAttributes = newHTMLAttributes;
        // width/height changes made outside an active drag (e.g. the
        // document-width clamp in editor.tsx) only reach node.attrs - a
        // drag itself keeps the element in sync frame-by-frame via
        // onResize, but nothing else re-applies the size here otherwise,
        // so a stale inline height would be left behind, no longer
        // matching the now width-capped (via CSS max-width) element.
        if (typeof updatedNode.attrs.width === "number") {
          el.style.width = `${updatedNode.attrs.width}px`;
        }
        if (typeof updatedNode.attrs.height === "number") {
          el.style.height = `${updatedNode.attrs.height}px`;
        }
        return true;
      };

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate,
        options: {
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          min: { width: 80, height: 80 },
          max: this.storage.maxWidth ? { width: this.storage.maxWidth } : undefined,
          preserveAspectRatio: true,
        },
      });

      const dom = nodeView.dom as HTMLElement;
      const showNodeView = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";
      if (el.complete && el.naturalWidth > 0) showNodeView();
      else {
        el.onload = showNodeView;
        el.onerror = showNodeView;
      }

      return nodeView;
    };
  },
});
