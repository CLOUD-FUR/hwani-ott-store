'use client';

interface GoogleButtonProps {
  onClick: () => void;
  className?: string;
}

export default function GoogleButton({ onClick, className = '' }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-medium transition-colors mb-6 border border-gray-300 shadow-sm ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M43.089 21.507c0-1.424-.132-2.768-.357-4.017H24v7.48h10.36c-.454 2.083-1.135 3.86-2.043 5.338l3.38 2.667c2.487-2.458 3.952-6.182 3.952-11.465z"
        />
        <path
          fill="#34A853"
          d="M24 44c2.938 0 5.682-.973 7.838-2.643l-3.742-2.943c-1.877 1.273-4.21 2.027-6.947 2.027-5.377 0-9.908-3.578-11.513-8.42L8.489 33.96c2.176 1.844 4.817 2.988 7.826 2.988z"
        />
        <path
          fill="#FBBC05"
          d="M12.875 17.124c-.418-.993-.66-2.06-.66-3.195 0-1.136.245-2.2.674-3.192l-.05-.045C10.867 9.623 10.03 10.652 9.5 11.85c-1.588 4.109-1.588 8.66 0 12.772l1.374 1.08z"
        />
        <path
          fill="#EA4335"
          d="M24 9.75c1.333-.133 2.6-.25 3.856-.25 1.6 0 3.154.283 4.624.775l.018-.018C34.946 8.88 36.03 7.89 36.03 7.89c-1.884-.94-3.945-1.65-6.168-1.65-3.896 0-7.476 2.178-9.443 5.476-.018.025-.054.05-.074.076z"
        />
      </svg>
      <span>Google로 계속하기</span>
    </button>
  );
}
