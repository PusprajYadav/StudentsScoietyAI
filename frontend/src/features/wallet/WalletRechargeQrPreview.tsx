import { useEffect, useMemo, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import {
  buildQrCodeOptions,
  createQrCodeInstance,
  DEFAULT_QR_STYLE,
} from "../../components/tools/codes/helpers";

interface WalletRechargeQrPreviewProps {
  value: string;
  size?: number;
}

export function WalletRechargeQrPreview({
  value,
  size = 188,
}: WalletRechargeQrPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const qrStyle = useMemo(
    () => ({
      ...DEFAULT_QR_STYLE,
      width: size,
      height: size,
      margin: 8,
    }),
    [size]
  );

  useEffect(() => {
    if (!previewRef.current || !value.trim()) {
      return;
    }

    if (!qrRef.current) {
      qrRef.current = createQrCodeInstance(value, qrStyle);
      previewRef.current.innerHTML = "";
      qrRef.current.append(previewRef.current);
      return;
    }

    qrRef.current.update(buildQrCodeOptions(value, qrStyle));

    if (!previewRef.current.firstChild) {
      qrRef.current.append(previewRef.current);
    }
  }, [qrStyle, value]);

  return (
    <div className="rounded-[24px] border border-app-border bg-white p-3 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.28)]">
      <div
        ref={previewRef}
        className="mx-auto flex min-h-[188px] items-center justify-center"
      />
    </div>
  );
}
