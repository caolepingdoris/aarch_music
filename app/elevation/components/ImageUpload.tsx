import type { RefObject } from "react";
import { Upload } from "lucide-react";
import type { UploadedImage } from "../types";

interface ImageUploadProps {
  image: UploadedImage | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
}

export function ImageUpload({ image, inputRef, onFile }: ImageUploadProps) {
  const openPicker = () => inputRef.current?.click();

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );

  if (!image) {
    return (
      <div className="el-upload" onClick={openPicker}>
        <span className="el-corner tl" />
        <span className="el-corner tr" />
        <span className="el-corner bl" />
        <span className="el-corner br" />
        <div className="el-upload-icon">
          <Upload size={24} strokeWidth={1.4} />
        </div>
        <div className="el-upload-label">Drop elevation</div>
        <div className="el-upload-hint">optional — a photograph of the structure</div>
        {fileInput}
      </div>
    );
  }

  return (
    <div className="el-image-wrap">
      <img src={image.url} alt="Uploaded structure" className="el-image" />
      <div className="el-grid-overlay" />
      <div className="el-image-change" onClick={openPicker}>
        Change photo
      </div>
      {fileInput}
    </div>
  );
}
