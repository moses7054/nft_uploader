"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

type Attribute = { trait_type: string; value: string };

type Step = "image" | "metadata" | "done";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function UrlDisplay({ label, url }: { label: string; url: string }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="flex items-center gap-1">
        <span className="break-all font-mono text-sm text-emerald-400">{url}</span>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("image");
  const [dragging, setDragging] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<Attribute[]>([{ trait_type: "", value: "" }]);
  const [metadataUrl, setMetadataUrl] = useState<string>("");
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setImageError("");
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const uploadImage = async () => {
    if (!imageFile) return;
    setImageLoading(true);
    setImageError("");
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      const res = await fetch("/api/images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      setStep("metadata");
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setImageLoading(false);
    }
  };

  const addAttribute = () => setAttributes((a) => [...a, { trait_type: "", value: "" }]);
  const removeAttribute = (i: number) => setAttributes((a) => a.filter((_, idx) => idx !== i));
  const updateAttribute = (i: number, field: keyof Attribute, val: string) =>
    setAttributes((a) => a.map((attr, idx) => (idx === i ? { ...attr, [field]: val } : attr)));

  const uploadMetadata = async () => {
    if (!name.trim()) {
      setMetadataError("Name is required.");
      return;
    }
    setMetadataLoading(true);
    setMetadataError("");
    try {
      const validAttrs = attributes.filter((a) => a.trait_type.trim() && a.value.trim());
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          image: imageUrl,
          attributes: validAttrs,
          properties: {
            files: [{ uri: imageUrl, type: imageFile?.type ?? "image/jpeg" }],
            category: "image",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setMetadataUrl(data.url);
      setStep("done");
    } catch (err: unknown) {
      setMetadataError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setMetadataLoading(false);
    }
  };

  const reset = () => {
    setStep("image");
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    setImageError("");
    setName("");
    setDescription("");
    setAttributes([{ trait_type: "", value: "" }]);
    setMetadataUrl("");
    setMetadataError("");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">NFT Uploader</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Upload your image and metadata, then use the metadata URL in your mint script.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex w-full items-center gap-0">
        {(["image", "metadata", "done"] as Step[]).map((s, idx) => {
          const labels = ["1. Image", "2. Metadata", "3. Done"];
          const active = step === s;
          const done =
            (s === "image" && (step === "metadata" || step === "done")) ||
            (s === "metadata" && step === "done");
          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  active
                    ? "bg-emerald-500 text-white"
                    : done
                    ? "bg-emerald-800 text-emerald-300"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {done ? "✓" : idx + 1}
              </div>
              <span className={`mt-1 text-xs ${active ? "text-zinc-100" : "text-zinc-500"}`}>
                {labels[idx]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        {/* ─── STEP 1: Image ─── */}
        {step === "image" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Upload Image</h2>

            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
                dragging ? "border-emerald-500 bg-emerald-950" : "border-zinc-700 hover:border-zinc-500"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="preview"
                  className="max-h-52 rounded-lg object-contain"
                />
              ) : (
                <>
                  <svg className="mb-3 h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-zinc-400">Drag & drop or click to select</p>
                  <p className="mt-1 text-xs text-zinc-600">JPEG, PNG, GIF, WEBP, SVG</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {imageFile && (
              <p className="mt-2 text-center text-xs text-zinc-500">
                {imageFile.name} — {(imageFile.size / 1024).toFixed(1)} KB
              </p>
            )}

            {imageError && (
              <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">{imageError}</p>
            )}

            <button
              onClick={uploadImage}
              disabled={!imageFile || imageLoading}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {imageLoading ? "Uploading…" : "Upload Image"}
            </button>
          </div>
        )}

        {/* ─── STEP 2: Metadata ─── */}
        {step === "metadata" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">NFT Metadata</h2>

            {imageUrl && <UrlDisplay label="Image URL" url={imageUrl} />}

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meow #1"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="A short description of your NFT"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Attributes</label>
                  <button
                    onClick={addAttribute}
                    className="text-xs text-emerald-500 hover:text-emerald-400"
                  >
                    + Add trait
                  </button>
                </div>
                <div className="space-y-2">
                  {attributes.map((attr, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={attr.trait_type}
                        onChange={(e) => updateAttribute(i, "trait_type", e.target.value)}
                        placeholder="Trait type"
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                      />
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateAttribute(i, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => removeAttribute(i)}
                        className="px-2 text-zinc-600 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {metadataError && (
              <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">{metadataError}</p>
            )}

            <button
              onClick={uploadMetadata}
              disabled={metadataLoading}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {metadataLoading ? "Uploading…" : "Upload Metadata"}
            </button>
          </div>
        )}

        {/* ─── STEP 3: Done ─── */}
        {step === "done" && (
          <div>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900 text-3xl">
                ✓
              </div>
              <h2 className="mt-3 text-lg font-semibold">All done!</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Paste the metadata URL into <code className="font-mono text-emerald-400">nft_mint.ts</code> as{" "}
                <code className="font-mono text-emerald-400">metadataUri</code>.
              </p>
            </div>

            <UrlDisplay label="Image URL" url={imageUrl} />
            <UrlDisplay label="Metadata URL — use this in nft_mint.ts" url={metadataUrl} />

            <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-800 p-3 font-mono text-xs text-zinc-300">
              <span className="text-zinc-500">// nft_mint.ts</span>
              <br />
              <span className="text-purple-400">const</span> metadataUri{" "}
              <span className="text-zinc-400">=</span>{" "}
              <span className="text-amber-300">&quot;{metadataUrl}&quot;</span>;
            </div>

            <button
              onClick={reset}
              className="mt-5 w-full rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Upload another NFT
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Powered by MongoDB GridFS · Deployed on Vercel
      </p>
    </main>
  );
}
