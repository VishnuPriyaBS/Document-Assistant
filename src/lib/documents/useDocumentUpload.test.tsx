import { act, renderHook } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { useDocumentUpload } from "./useDocumentUpload";
import {
  removeDocument,
  updateDocument,
  upsertDocument,
} from "@/lib/redux/slices/documentsSlice";

const { dispatch } = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => dispatch,
}));

class MockXHR extends EventTarget {
  static instances: MockXHR[] = [];

  upload = new EventTarget();
  status = 0;
  responseText = "";
  timeout = 0;

  open = vi.fn();
  send = vi.fn();

  constructor() {
    super();
    MockXHR.instances.push(this);
  }
}

function latestXHR() {
  const xhr = MockXHR.instances.at(-1);

  if (!xhr) {
    throw new Error("No upload request was created.");
  }

  return xhr;
}

function temporaryId(): string {
  const action = dispatch.mock.calls
    .map(([action]) => action)
    .find(
      (action) =>
        upsertDocument.match(action) &&
        action.payload.status === "uploading"
    );

  if (!action || !upsertDocument.match(action)) {
    throw new Error("No uploading document was created.");
  }

  return action.payload.id;
}

describe("useDocumentUpload", () => {
  beforeEach(() => {
    dispatch.mockClear();
    MockXHR.instances = [];
    vi.stubGlobal("XMLHttpRequest", MockXHR);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unsupported files without starting a request", () => {
    const { result } = renderHook(() => useDocumentUpload());

    act(() => {
      result.current.handleFiles([
        new File(["image"], "photo.jpg"),
      ]);
    });

    expect(MockXHR.instances).toHaveLength(0);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: upsertDocument.type,
        payload: expect.objectContaining({
          name: "photo.jpg",
          status: "error",
          error: "Only PDF and TXT files are supported.",
        }),
      })
    );
  });

  it("rejects empty and oversized files", () => {
    const { result } = renderHook(() => useDocumentUpload());

    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.txt"
    );

    act(() => {
      result.current.handleFiles([
        new File([], "empty.txt"),
        oversized,
      ]);
    });

    expect(MockXHR.instances).toHaveLength(0);

    for (const error of [
      "Cannot upload an empty file.",
      "File size must not exceed 10 MB.",
    ]) {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: upsertDocument.type,
          payload: expect.objectContaining({
            status: "error",
            error,
          }),
        })
      );
    }
  });

  it("does not upload when disabled", () => {
    const { result } = renderHook(() =>
      useDocumentUpload({ disabled: true })
    );

    act(() => {
      result.current.handleFiles([
        new File(["Hello"], "notes.txt"),
      ]);
    });

    expect(MockXHR.instances).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("updates progress and calls onUploaded after success", () => {
    const onUploaded = vi.fn();

    const { result } = renderHook(() =>
      useDocumentUpload({ onUploaded })
    );

    const file = new File(["Hello"], "notes.txt");

    act(() => {
      result.current.handleFiles([file]);
    });

    const xhr = latestXHR();
    const id = temporaryId();

    expect(xhr.open).toHaveBeenCalledWith(
      "POST",
      "/api/documents"
    );

    expect(xhr.timeout).toBe(60000);
    expect(xhr.send).toHaveBeenCalledWith(expect.any(FormData));

    act(() => {
      xhr.upload.dispatchEvent(
        new ProgressEvent("progress", {
          lengthComputable: true,
          loaded: 50,
          total: 100,
        })
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      updateDocument({
        id,
        changes: { progress: 50 },
      })
    );

    act(() => {
      xhr.upload.dispatchEvent(new Event("load"));
    });

    expect(dispatch).toHaveBeenCalledWith(
      updateDocument({
        id,
        changes: {
          status: "processing",
          progress: 100,
        },
      })
    );

    expect(onUploaded).not.toHaveBeenCalled();

    const document = {
      id: "saved-document-1",
      name: file.name,
      size: file.size,
      uploadedAt: "2026-10-29T00:00:00.000Z",
      status: "ready" as const,
    };

    act(() => {
      xhr.status = 201;
      xhr.responseText = JSON.stringify({ document });
      xhr.dispatchEvent(new Event("load"));
    });

    expect(dispatch).toHaveBeenCalledWith(removeDocument(id));

    expect(dispatch).toHaveBeenCalledWith(
      upsertDocument({
        ...document,
        progress: 100,
      })
    );

    expect(onUploaded).toHaveBeenCalledExactlyOnceWith(document);
  });

  it.each([
    ["error", "Network error. Please try again."],
    ["timeout", "Upload timed out. Please try again."],
  ])("handles the %s event", (event, message) => {
    const onUploaded = vi.fn();

    const { result } = renderHook(() =>
      useDocumentUpload({ onUploaded })
    );

    act(() => {
      result.current.handleFiles([
        new File(["Hello"], "notes.txt"),
      ]);
    });

    const id = temporaryId();

    act(() => {
      latestXHR().dispatchEvent(new Event(event));
    });

    expect(dispatch).toHaveBeenCalledWith(
      updateDocument({
        id,
        changes: {
          status: "error",
          error: message,
        },
      })
    );

    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("shows a server rejection without selecting the document", () => {
    const onUploaded = vi.fn();

    const { result } = renderHook(() =>
      useDocumentUpload({ onUploaded })
    );

    act(() => {
      result.current.handleFiles([
        new File(["Not a real PDF"], "broken.pdf"),
      ]);
    });

    const xhr = latestXHR();
    const id = temporaryId();

    act(() => {
      xhr.status = 415;
      xhr.responseText = JSON.stringify({
        error: "Invalid PDF file.",
      });
      xhr.dispatchEvent(new Event("load"));
    });

    expect(dispatch).toHaveBeenCalledWith(
      updateDocument({
        id,
        changes: {
          status: "error",
          error: "Invalid PDF file.",
        },
      })
    );

    expect(dispatch).not.toHaveBeenCalledWith(removeDocument(id));
    expect(onUploaded).not.toHaveBeenCalled();
  });
});