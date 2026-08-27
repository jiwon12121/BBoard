import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnList: {
      /** Wraps a new empty paragraph pair in a fixed two-column layout. */
      insertColumns: () => ReturnType;
    };
  }
}

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  addAttributes() {
    return {
      width: {
        default: 50,
        parseHTML: (element: HTMLElement) => {
          const value = parseFloat(element.style.flexBasis);
          return Number.isNaN(value) ? 50 : value;
        },
        renderHTML: (attributes: { width: number }) => ({
          style: `flex: 0 0 ${attributes.width}%; max-width: ${attributes.width}%;`,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column" }), 0];
  },
});

// The two columns render through their own schema (Column's renderHTML
// above) exactly like any other node. This only needs a node view of its
// own for the divider between them, which isn't part of the document
// content and has to sit alongside contentDOM rather than inside it (same
// dom/contentDOM split as e.g. the details toggle button) - clicking it
// selects the whole columnList (NodeSelection), same as clicking an image,
// so Delete removes the layout. The divider itself is purely visual/static
// now - width is fixed 50/50, not draggable.
export const ColumnList = Node.create({
  name: "columnList",
  group: "block",
  content: "column column",
  isolating: true,
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="columnList"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "columnList" }), 0];
  },
  addCommands() {
    return {
      insertColumns:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              { type: "column", attrs: { width: 50 }, content: [{ type: "paragraph" }] },
              { type: "column", attrs: { width: 50 }, content: [{ type: "paragraph" }] },
            ],
          }),
    };
  },
  addNodeView() {
    return ({ getPos, editor }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "columnList");
      dom.style.position = "relative";

      const contentDOM = document.createElement("div");
      contentDOM.dataset.columnRow = "";
      dom.append(contentDOM);

      const divider = document.createElement("div");
      divider.className = "column-divider";
      // Same reasoning as elsewhere: a plain <div> inside the editor's
      // contentEditable region needs this to be reliably clickable instead
      // of competing with native text-selection.
      divider.contentEditable = "false";
      divider.addEventListener("click", () => {
        const pos = getPos();
        if (pos === undefined) return;
        editor.chain().focus().setNodeSelection(pos).run();
      });
      dom.append(divider);

      return { dom, contentDOM };
    };
  },
});
