"use client";

import { offset } from "@floating-ui/dom";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import DragHandle from "@tiptap/extension-drag-handle-react";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import useYProvider from "y-partyserver/react";
import { Column, ColumnList } from "./columns-extension";
import { AtomHorizontalRule } from "./horizontal-rule-extension";
import { ResizableImage } from "./image-extension";
import { DEFAULT_WIDTH, ResizableColumn } from "./resizable-column";
import { Toolbar } from "./toolbar";
import { TitleEditor } from "./title-editor";
import { uploadDocumentImage } from "./upload-image";
import { ResizableYoutube } from "./youtube-extension";
import { useWorkspacePresence } from "../../workspace-presence-context";
import { InviteModal } from "../../invite-modal";

const CURSOR_COLORS = ["#676380", "#5f6b5c", "#8a6559", "#7c6a54", "#8a7548"];

// Images/videos default to this fraction of the document's own configured
// width (not the full width) so they read as content inset from the text
// column's edges, not edge-to-edge - same fraction used as the resize max.
const MEDIA_WIDTH_RATIO = 0.9;

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function getFirstTextNode(node: Node): Text | null {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim().length > 0) {
      return child as Text;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const found = getFirstTextNode(child);
      if (found) return found;
    }
  }
  return null;
}

// The handle should align to the vertical center of the block's first
// line, not the whole (possibly multi-line) block - so keep the block's
// own left/width but swap in the first line's actual top/height.
function getFirstLineRect(blockEl: HTMLElement): DOMRect {
  const blockRect = blockEl.getBoundingClientRect();
  const textNode = getFirstTextNode(blockEl);
  if (!textNode) return blockRect;
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const lineRect = range.getClientRects()[0];
  if (!lineRect) return blockRect;
  return new DOMRect(blockRect.left, lineRect.top, blockRect.width, lineRect.height);
}

export function DocumentEditor({
  documentId,
  title,
  width: initialWidth,
  userId,
  userName,
  accessToken,
  renameAction,
  updateWidthAction,
  editable,
  canShare,
  documentInviteUrl,
  documentInviteRole,
  createDocumentInviteAction,
}: {
  documentId: string;
  title: string;
  width: number | null;
  userId: string;
  userName: string;
  accessToken: string;
  renameAction: (formData: FormData) => void;
  updateWidthAction: (width: number) => void;
  editable: boolean;
  canShare: boolean;
  documentInviteUrl: string | null;
  documentInviteRole: string | undefined;
  createDocumentInviteAction: (formData: FormData) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const provider = useYProvider({
    host: process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? "localhost:8787",
    party: "document-sync",
    room: documentId,
    options: {
      // Known server-side already — skip a client-side Supabase round trip
      // that would otherwise block the WebSocket from opening at all
      // (the provider awaits params() before connecting).
      params: { token: accessToken },
    },
  });

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setSynced(provider.synced);
    const handleSynced = (isSynced: boolean) => setSynced(isSynced);
    provider.on("synced", handleSynced);
    return () => {
      provider.off("synced", handleSynced);
    };
  }, [provider]);

  // Caches the Yjs doc in the browser (IndexedDB) so a document that's been
  // opened before can render instantly from that local copy on a revisit,
  // instead of waiting on a fresh round trip to the sync server every time.
  // Yjs merges updates regardless of arrival order, so the network sync
  // above still runs the same as always and just reconciles in place once
  // it catches up - no special handling needed for the two racing.
  const [localSynced, setLocalSynced] = useState(false);

  useEffect(() => {
    setLocalSynced(false);
    const persistence = new IndexeddbPersistence(documentId, provider.doc);
    const handleSynced = () => setLocalSynced(true);
    persistence.on("synced", handleSynced);
    return () => {
      persistence.off("synced", handleSynced);
      persistence.destroy();
    };
  }, [documentId, provider.doc]);

  // Local cache usually finishes near-instantly, so the loading state below
  // is often true for a single frame - just long enough to flash on screen
  // and off again, which reads as a glitch rather than "loading". Waiting a
  // beat before showing it means content that's ready by then never shows
  // any loading state at all, and only genuinely slow loads (a fresh
  // network sync with no local cache yet) see it.
  const contentReady = synced || localSynced;
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);

  useEffect(() => {
    if (contentReady) {
      setShowLoadingSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowLoadingSkeleton(true), 150);
    return () => clearTimeout(timer);
  }, [contentReady]);

  // Reports which document this user is currently on, for the workspace
  // activity sidebar's "지금 이 워크스페이스" list.
  const { setCurrentDocument } = useWorkspacePresence();

  useEffect(() => {
    setCurrentDocument({ id: documentId, title });
    return () => setCurrentDocument(null);
  }, [documentId, title, setCurrentDocument]);

  // Who's currently viewing/editing this document - read from the same Yjs
  // awareness data CollaborationCaret uses for cursor colors, so no extra
  // network channel is needed.
  const [viewers, setViewers] = useState<
    { clientId: number; name: string; color: string }[]
  >([]);

  useEffect(() => {
    const updateViewers = () => {
      const states = provider.awareness.getStates() as Map<
        number,
        { user?: { name: string; color: string } }
      >;
      const list: { clientId: number; name: string; color: string }[] = [];
      states.forEach((state, clientId) => {
        if (state.user) list.push({ clientId, ...state.user });
      });
      setViewers(list);
    };
    updateViewers();
    provider.awareness.on("change", updateViewers);
    return () => {
      provider.awareness.off("change", updateViewers);
    };
  }, [provider]);

  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const handleCustomMessage = (message: string) => {
      try {
        const data = JSON.parse(message) as { type?: string; width?: number };
        if (data.type === "width-change" && typeof data.width === "number") {
          setWidth(data.width);
        }
      } catch {
        // ignore malformed messages
      }
    };
    provider.on("custom-message", handleCustomMessage);
    return () => {
      provider.off("custom-message", handleCustomMessage);
    };
  }, [provider]);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    updateWidthAction(newWidth);
    provider.sendMessage(
      JSON.stringify({ type: "width-change", width: newWidth }),
    );
  };

  const mediaWidth = Math.round((width ?? DEFAULT_WIDTH) * MEDIA_WIDTH_RATIO);
  // handleDrop below is captured once by useEditor (only [provider, editable]
  // are deps), so it needs a ref rather than reading `mediaWidth` directly
  // to see width changes made after the editor was created.
  const mediaWidthRef = useRef(mediaWidth);
  mediaWidthRef.current = mediaWidth;

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      extensions: [
        // horizontalRule disabled here in favor of the atom:true version
        // below it, so the divider can be click-selected and deleted -
        // see AtomHorizontalRule's own comment.
        StarterKit.configure({ undoRedo: false, horizontalRule: false }),
        AtomHorizontalRule,
        Collaboration.configure({ document: provider.doc }),
        CollaborationCaret.configure({
          provider,
          user: { name: userName, color: colorForUser(userId) },
        }),
        Details.configure({ persist: true }),
        DetailsSummary,
        DetailsContent,
        TaskList,
        TaskItem.configure({ nested: true }),
        ResizableImage,
        ResizableYoutube,
        ColumnList,
        Column,
      ],
      editorProps: {
        handleDrop: (view, event, _slice, moved) => {
          // `moved` means this is an internal drag (e.g. reordering a
          // block), not a file being dropped in from outside.
          if (moved) return false;
          const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
            file.type.startsWith("image/"),
          );
          if (files.length === 0) return false;
          event.preventDefault();

          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const insertPos = coords?.pos ?? view.state.selection.from;

          (async () => {
            for (const file of files) {
              const url = await uploadDocumentImage(file);
              if (!url) continue;
              const { schema, tr } = view.state;
              view.dispatch(
                tr.insert(
                  insertPos,
                  schema.nodes.image.create({ src: url, width: mediaWidthRef.current }),
                ),
              );
            }
          })();

          return true;
        },
      },
    },
    [provider, editable],
  );

  // Resize's max width lives in extension storage (not a config option -
  // @tiptap/extension-image's resize option has no max, so both media
  // extensions read it from here instead) so it can track the document's
  // own width as that changes, without recreating the editor.
  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage as unknown as Record<string, { maxWidth?: number }>;
    storage.image.maxWidth = mediaWidth;
    storage.youtube.maxWidth = mediaWidth;

    // Existing images/videos were sized against whatever the document's
    // width was at the time - narrowing the document past one of them
    // should shrink it back down to fit too, not just cap future resizes.
    // Runs off `synced`/`localSynced` too so media that arrives already
    // oversized (opening a doc that's since been narrowed, whether from the
    // local cache or a fresh network sync) gets caught on load, not only on
    // the next live width change.
    const { state } = editor;
    let tr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== "image" && node.type.name !== "youtube") return;
      const currentWidth = node.attrs.width;
      if (typeof currentWidth !== "number" || currentWidth <= mediaWidth) return;
      const scale = mediaWidth / currentWidth;
      tr = tr.setNodeAttribute(pos, "width", Math.round(mediaWidth));
      const currentHeight = node.attrs.height;
      if (typeof currentHeight === "number") {
        tr = tr.setNodeAttribute(pos, "height", Math.round(currentHeight * scale));
      }
      changed = true;
    });
    if (changed) editor.view.dispatch(tr);
  }, [editor, mediaWidth, synced, localSynced]);

  // Only one drag handle should be visible at a time: left by default,
  // right only in the last 10% of the hovered block's own row width (not
  // based on where the text happens to end - short lines have a lot of
  // empty space after the text, and that empty space is still part of
  // the block, not "past" it).
  // Which block is "hovered" is tracked via the drag handle plugin's own
  // onNodeChange - it already does the edge-clamped hit-testing that makes
  // the first/last block work correctly, so we reuse it instead of
  // re-resolving the position ourselves (that duplicate logic is what
  // caused the first block to behave differently before).
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const hoveredPosRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleNodeChange = ({ pos }: { editor: Editor; node: unknown; pos: number }) => {
    hoveredPosRef.current = pos >= 0 ? pos : null;
  };

  const handleEditorMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || rafRef.current !== null) return;
    const { clientX } = event;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (hoveredPosRef.current === null) return;
      const dom = editor.view.nodeDOM(hoveredPosRef.current);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      const rightZoneStart = rect.left + rect.width * 0.9;
      setActiveSide(clientX >= rightZoneStart ? "right" : "left");
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const dragHandlePosition = useMemo(
    () => ({
      placement: activeSide === "left" ? ("left" as const) : ("right" as const),
      // A little breathing room between the handle and the block - only
      // needed on the left, where the handle otherwise sits flush against it.
      middleware: activeSide === "left" ? [offset(6)] : undefined,
    }),
    [activeSide],
  );

  const getReferencedVirtualElement = () => {
    if (!editor || hoveredPosRef.current === null) return null;
    const dom = editor.view.nodeDOM(hoveredPosRef.current);
    if (!(dom instanceof HTMLElement)) return null;
    const rect = getFirstLineRect(dom);
    return { getBoundingClientRect: () => rect };
  };

  return (
    <div className="p-8">
      <ResizableColumn width={width} onWidthChange={handleWidthChange}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <TitleEditor title={title} renameAction={renameAction} />
            <div className="flex shrink-0 items-center gap-2">
              {viewers.length > 0 && (
                <div className="flex -space-x-2">
                  {viewers.map((viewer) => (
                    <span
                      key={viewer.clientId}
                      title={viewer.name}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white ring-2 ring-canvas"
                      style={{ backgroundColor: viewer.color }}
                    >
                      {viewer.name.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
              {canShare && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="cursor-pointer rounded-md border border-border-ink px-3 py-1 text-sm text-ink hover:bg-sidebar"
                >
                  공유
                </button>
              )}
            </div>
          </div>
          <InviteModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title="문서 공유"
            inviteUrl={documentInviteUrl}
            inviteRole={documentInviteRole}
            createInviteAction={createDocumentInviteAction}
          />
          <div className="relative" onMouseMove={editable ? handleEditorMouseMove : undefined}>
            {editable && (
              <div className="absolute left-2 top-2 z-10">
                <Toolbar editor={editor} mediaWidth={mediaWidth} />
              </div>
            )}
            <EditorContent editor={editor} className="min-h-[400px] p-4" />
            {editor && editable && (
              <DragHandle
                editor={editor}
                computePositionConfig={dragHandlePosition}
                onNodeChange={handleNodeChange}
                getReferencedVirtualElement={getReferencedVirtualElement}
              >
                {null}
              </DragHandle>
            )}
            {showLoadingSkeleton && !contentReady && (
              <div className="absolute inset-0 flex flex-col gap-3 bg-canvas p-4 pt-8">
                <div className="h-5 w-3/4 animate-pulse rounded-md bg-border-ink" />
                <div className="h-4 w-full animate-pulse rounded-md bg-border-ink" />
                <div className="h-4 w-5/6 animate-pulse rounded-md bg-border-ink" />
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-border-ink" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-border-ink" />
                <div className="h-4 w-4/5 animate-pulse rounded-md bg-border-ink" />
                <div className="h-4 w-1/2 animate-pulse rounded-md bg-border-ink" />
              </div>
            )}
          </div>
        </div>
      </ResizableColumn>
    </div>
  );
}
