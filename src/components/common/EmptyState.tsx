import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  iconWrapperClassName?: string;
  plain?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  className = '',
  iconWrapperClassName = 'bg-blue-50',
  plain = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={
        plain
          ? `flex items-center justify-center px-10 py-20 ${className}`
          : `bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[420px] flex items-center justify-center px-10 py-20 ${className}`
      }
    >
      <div className="flex flex-col items-center text-center max-w-md">
        <div className={`p-7 rounded-3xl shadow-sm mb-6 ${iconWrapperClassName}`}>
          {icon}
        </div>

        <h3 className="text-xl font-bold text-gray-900">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}