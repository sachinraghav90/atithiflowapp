import { useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

type WebcamCaptureProps = {
  onCapture: (payload: { blob: Blob; previewUrl: string; mime: "image/jpeg" | "image/png" }) => void;
  onDelete?: () => void;
  onCancelRequest?: () => void;
  initialPreviewUrl?: string | null;
  rightAction?: ReactNode;
};

export default function WebcamCapture({ onCapture, onDelete, onCancelRequest, initialPreviewUrl = null, rightAction }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam | null>(null);
  const autoRetryRef = useRef(false);
  const ownedPreviewUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
  const [error, setError] = useState<string>("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const hasPreview = useMemo(() => Boolean(previewUrl), [previewUrl]);

  useEffect(() => {
    if (!previewUrl) {
      openCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCamera = () => {
    setError("");
    setIsVideoReady(false);
    setCameraOpen(true);
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const [header, data] = dataUrl.split(",");
    const mime = (header.match(/:(.*?);/)?.[1] || "image/jpeg") as "image/jpeg" | "image/png";
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return { blob: new Blob([ab], { type: mime }), mime };
  };

  const capture = () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      setError("Camera is not ready yet. Please wait a moment and retry.");
      return;
    }

    const { blob, mime } = dataUrlToBlob(screenshot);
    const nextPreview = URL.createObjectURL(blob);
    if (ownedPreviewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(ownedPreviewUrlRef.current);
    }
    ownedPreviewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setCameraOpen(false);
    onCapture({ blob, previewUrl: nextPreview, mime });
  };

  const retake = () => {
    if (ownedPreviewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(ownedPreviewUrlRef.current);
    }
    ownedPreviewUrlRef.current = null;
    setPreviewUrl(null);
    openCamera();
  };

  const remove = () => {
    autoRetryRef.current = false;
    if (ownedPreviewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(ownedPreviewUrlRef.current);
    }
    ownedPreviewUrlRef.current = null;
    setPreviewUrl(null);
    setCameraOpen(false);
    onDelete?.();
    onCancelRequest?.();
  };

  useEffect(() => {
    return () => {
      if (ownedPreviewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(ownedPreviewUrlRef.current);
      }
      ownedPreviewUrlRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      {cameraOpen && (
        <div className="space-y-2">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={{
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            onUserMedia={() => {
              autoRetryRef.current = false;
              setIsVideoReady(true);
              setError("");
            }}
            onUserMediaError={() => {
              setIsVideoReady(false);
              if (!autoRetryRef.current) {
                autoRetryRef.current = true;
                window.setTimeout(() => openCamera(), 250);
                return;
              }
              setError("Unable to access webcam. Please allow camera permission.");
            }}
            className="w-full rounded-md border border-border bg-muted object-cover"
          />
          {!isVideoReady ? <p className="text-xs text-muted-foreground">Starting camera...</p> : null}
          <div className="flex gap-2">
            <Button size="sm" variant="hero" className="h-8" onClick={capture} disabled={!isVideoReady}>Capture</Button>
            <Button size="sm" variant="heroOutline" className="h-8" onClick={remove}>Cancel</Button>
          </div>
        </div>
      )}

      {hasPreview && (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex flex-col space-y-2 max-w-full">
            <img
              src={previewUrl ?? ""}
              alt="Captured guest"
              className="max-h-[60vh] w-auto max-w-full rounded-md border border-border object-contain"
            />
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button size="sm" variant="heroOutline" className="h-8" onClick={retake}>Retake</Button>
                <Button size="sm" variant="heroOutline" className="h-8" onClick={remove}>Remove</Button>
              </div>
              {rightAction ? <div>{rightAction}</div> : null}
            </div>
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
