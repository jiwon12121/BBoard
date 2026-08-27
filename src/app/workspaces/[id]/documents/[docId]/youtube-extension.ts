import { ResizableNodeView, nodePasteRule } from "@tiptap/core";
import Youtube, { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube";
import type { Node as PMNode } from "@tiptap/pm/model";

// Copied from @tiptap/extension-youtube's source (not exported publicly) -
// used below so pasted links can also get an explicit initial width; see
// the addPasteRules override for why that's needed.
const YOUTUBE_REGEX_GLOBAL =
  /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu\.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/g;

// @tiptap/extension-youtube has no built-in resize option (unlike
// @tiptap/extension-image's `resize` config), so this wraps its rendered
// `div[data-youtube-video] > iframe` with @tiptap/core's ResizableNodeView
// the same way @tiptap/extension-image does internally.
export const ResizableYoutube = Youtube.extend({
  // Same reasoning as Image.extend({ draggable: false }) in editor.tsx -
  // ProseMirror puts draggable="true" on this node view's own outer DOM
  // whenever the node spec says draggable: true, which steals clicks meant
  // for the custom reorder drag-handle. Not needed since reordering goes
  // through that custom handle, not native HTML5 drag.
  draggable: false,
  // See image-extension.ts's ResizableImage.extend for why this is needed
  // for the block to be click-to-select + Delete-able.
  atom: true,
  addStorage() {
    return {
      maxWidth: undefined as number | undefined,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("width");
          return value ? Number(value) : null;
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("height");
          return value ? Number(value) : null;
        },
      },
    };
  },
  // Overridden (rather than left as the inherited default) so a pasted
  // link also gets an explicit initial width - without it, node.attrs.width
  // stays null and the block falls back to the wrapper's width:100% CSS,
  // which (being a percentage inside this nested flex/wrapper structure)
  // resolves against nothing definite and collapses to the iframe's own
  // default intrinsic size (300x150) instead of the column width.
  addPasteRules() {
    if (!this.options.addPasteHandler) return [];
    return [
      nodePasteRule({
        find: YOUTUBE_REGEX_GLOBAL,
        type: this.type,
        getAttributes: (match) => ({
          src: match.input,
          width: this.storage.maxWidth,
        }),
      }),
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-youtube-video", "");

      const iframe = document.createElement("iframe");
      iframe.setAttribute("allowfullscreen", String(this.options.allowFullscreen));
      wrapper.appendChild(iframe);

      // A click on the iframe itself never reaches this page's own click
      // handling (separate browsing context - it just plays the video), so
      // there's nowhere to click to select the block instead. These sit on
      // top of the iframe only along its 4 edges - clicking one selects the
      // block; the uncovered center still plays normally on a single click.
      (["top", "bottom", "left", "right"] as const).forEach((edge) => {
        const strip = document.createElement("div");
        strip.className = "youtube-select-strip";
        strip.dataset.edge = edge;
        strip.contentEditable = "false";
        strip.draggable = false;
        strip.addEventListener("click", () => {
          const pos = getPos();
          if (pos === undefined) return;
          editor.chain().focus().setNodeSelection(pos).run();
        });
        wrapper.appendChild(strip);
      });

      const syncSrc = (currentNode: PMNode) => {
        const embedUrl = getEmbedUrlFromYoutubeUrl({
          url: currentNode.attrs.src,
          startAt: currentNode.attrs.start || 0,
          allowFullscreen: this.options.allowFullscreen,
          autoplay: this.options.autoplay,
          ccLanguage: this.options.ccLanguage,
          ccLoadPolicy: this.options.ccLoadPolicy,
          controls: this.options.controls,
          disableKBcontrols: this.options.disableKBcontrols,
          enableIFrameApi: this.options.enableIFrameApi,
          endTime: this.options.endTime,
          interfaceLanguage: this.options.interfaceLanguage,
          ivLoadPolicy: this.options.ivLoadPolicy,
          loop: this.options.loop,
          modestBranding: this.options.modestBranding,
          nocookie: this.options.nocookie,
          origin: this.options.origin,
          playlist: this.options.playlist,
          progressBarColor: this.options.progressBarColor,
          rel: this.options.rel,
        });
        if (embedUrl && iframe.src !== embedUrl) iframe.src = embedUrl;
      };
      syncSrc(node);

      return new ResizableNodeView({
        element: wrapper,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          // The iframe is a separate browsing context, so once the cursor
          // (shrinking the block) crosses over it, mousemove/mouseup stop
          // reaching this document entirely - the resize looks like it
          // freezes, and if the button happens to come up while over the
          // iframe, this drag never learns it ended and starts following
          // the mouse again on its next move. Disabling pointer-events for
          // the duration of the drag makes the iframe transparent to the
          // mouse so those events keep reaching the resize handlers.
          iframe.style.pointerEvents = "none";
          wrapper.style.width = `${width}px`;
          wrapper.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          iframe.style.pointerEvents = "";
          const pos = getPos();
          if (pos === undefined) return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          syncSrc(updatedNode);
          // Same reasoning as image-extension.ts's onUpdate - a width/height
          // change made outside an active drag (the document-width clamp in
          // editor.tsx) only reaches node.attrs otherwise, leaving a stale
          // inline height that no longer matches the new width.
          if (typeof updatedNode.attrs.width === "number") {
            wrapper.style.width = `${updatedNode.attrs.width}px`;
          }
          if (typeof updatedNode.attrs.height === "number") {
            wrapper.style.height = `${updatedNode.attrs.height}px`;
          }
          return true;
        },
        options: {
          min: { width: 200, height: 150 },
          max: this.storage.maxWidth ? { width: this.storage.maxWidth } : undefined,
          preserveAspectRatio: true,
        },
      });
    };
  },
});
