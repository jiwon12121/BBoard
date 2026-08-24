"use client";

export function DeleteDocumentButton({
  docId,
  deleteAction,
}: {
  docId: string;
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!confirm("이 문서를 삭제할까요? 되돌릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="docId" value={docId} />
      <button type="submit" className="text-xs text-red-600 underline">
        삭제
      </button>
    </form>
  );
}
