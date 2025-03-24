'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoadingButton({ href, children, className }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = (e) => {
    setIsLoading(true);
  };

  return (
    <Link 
      href={href}
      onClick={handleClick}
      className={`${className} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
          Redirecting...
        </span>
      ) : (
        children
      )}
    </Link>
  );
} 