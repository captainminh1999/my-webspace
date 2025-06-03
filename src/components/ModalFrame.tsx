// src/components/ModalFrame.tsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    <AnimatePresence>
      {isOpen && (
        <>
        {/* Backdrop */}
          <motion.div
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
            <motion.article
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white dark:bg-gray-800 w-full max-w-6xl mx-auto rounded-2xl shadow-lg pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative p-6">
                {/* Close button — follows the card up for 20 px, then scrolls with page */}
                <button
                  onClick={onClose}
                  className="sticky top-5 ml-auto mr-4 h-5 w-5 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 transition"
                  aria-label="Close modal"
                >
                  <X size={14} />
                </button>

                {/* content body */}
                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-700 p-6 prose prose-lg dark:prose-invert">
                  <h2>{title}</h2>
                  {children}
                </div>
              </div>
            </motion.article>
            </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModalFrame;
