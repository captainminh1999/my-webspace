// src/components/ModalFrame.tsx
import React from "react";
import { LazyMotion, AnimatePresence, domAnimation, m } from "framer-motion";
import { X } from "lucide-react"; // icon library already in project

interface ModalFrameProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * ModalFrame implements the new scroll‑up card design:
 *   • backdrop stays fixed & blurred
 *   • card sits in a scroll frame that uses the browser scrollbar
 *   • close button is a large floating circle at bottom‑center
 */
const ModalFrame: React.FC<ModalFrameProps> = ({ isOpen, title, children, onClose }) => {

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <>
          {/* Backdrop */}
            <m.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

        {/* Scroll frame */}
          <div
            className="fixed inset-0 z-50 overflow-y-auto max-h-screen p-4"
            onClick={onClose}
          >
            <m.article
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white dark:bg-gray-800 w-full max-w-6xl mx-auto rounded-2xl shadow-lg pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative p-6">
                {/* header with title and close button */}
                <div className="flex items-start">
                  <h1 className="text-2xl font-bold flex-1">{title}</h1>
                  <button
                    onClick={onClose}
                    className="sticky top-5 ml-auto h-5 w-5 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 transition"
                    aria-label="Close modal"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* content body */}
                {children}
              </div>
            </m.article>
            </div>
        </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
};

export default ModalFrame;
