// src/components/WidgetModal.tsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface WidgetModalProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * Full-screen overlay that animates from a grid card (must share layoutId).
 * Backdrop click or the × button closes it via the supplied `onClose`.
 */
const WidgetModal: React.FC<WidgetModalProps> = ({ id, title, children, onClose }) => (
  <AnimatePresence>
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur"
      onClick={onClose}
    />

    <motion.div
        key="modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Close"
        >
        ×
        </button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </motion.div>
  </AnimatePresence>
);

export default WidgetModal;
