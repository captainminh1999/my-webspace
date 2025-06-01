// src/components/ModalFrame.tsx
import React, { useRef } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
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
  // Ref for card height so we know when it’s fully scrolled off
  const cardRef = useRef<HTMLElement>(null);

  // Framer Motion scroll helpers
  const { scrollY } = useScroll();
  const cardHeight = cardRef.current?.offsetHeight ?? 0;
  // map scrollY 0→cardHeight to marginTop 0→‑cardHeight
  const cardOffset = useTransform(scrollY, [0, cardHeight], [0, -cardHeight]);

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
            <div className="fixed inset-0 z-50 overflow-y-auto max-h-screen pointer-events-none p-4">
            <motion.article
                ref={cardRef}
                style={{ marginTop: cardOffset }}
                className="relative pointer-events-auto bg-white dark:bg-gray-800 w-full max-w-xl mx-auto rounded-2xl shadow-lg"
                initial={{ translateY: "100%", opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* close button in top‑right, sticks when scrolling */}
                <button
                onClick={onClose}
                className="sticky top-4 float-right mr-4 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 transition"
                aria-label="Close modal"
                >
                <X size={14} />
                </button>

                {/* content body */}
                <div className="clear-both p-6 prose prose-lg dark:prose-invert">
                <h2>{title}</h2>
                {children}
                </div>
            </motion.article>
            </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModalFrame;
