import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number | string;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  onClose,
  children,
  maxWidth,
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className="modal-box animate-slide-in"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ModalTitleBarProps {
  title: ReactNode;
  onClose: () => void;
}

export function ModalTitleBar({ title, onClose }: ModalTitleBarProps) {
  return (
    <div className="modal-title-bar">
      <h3 style={{ margin: 0 }}>{title}</h3>
      <button
        className="toggle-sidebar-btn"
        onClick={onClose}
        style={{ padding: "4px" }}
        aria-label="Đóng"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
