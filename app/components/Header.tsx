'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  uniqueId: string;
  tier: string;
  provider: string;
  isVerified: boolean;
  createdAt: string;
}

interface CartContextType {
  cartCount: number;
  setCartCount: (count: number) => void;
  refreshCartCount: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        const items = (data.data || []) as { quantity: number }[];
        const total = items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(total);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    void refreshCartCount();
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export default function Header() {
  const { cartCount, setCartCount } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.data.user);
        }
      } catch {
        // Not authenticated - keep user as null
      }
    };
    void checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    setCartCount(0);
    router.push('/');
  };

  const isProductsActive = pathname.startsWith('/products');

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/OTT.png"
            alt="화니 OTT"
            width={42}
            height={42}
            className="h-10 w-10 rounded-xl object-contain"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            화니 OTT
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-sm font-medium text-gray-600">
          <Link
            href="/products"
            className={isProductsActive ? 'text-blue-600' : 'transition hover:text-blue-600'}
          >
            상품
          </Link>
          {user ? (
            <>
              <Link
                href="/cart"
                className="relative flex items-center gap-1.5 transition hover:text-blue-600"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>장바구니</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/user"
                className="flex items-center gap-1.5 transition hover:text-blue-600"
              >
                <User className="h-4 w-4" />
                <span>마이페이지</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600 whitespace-nowrap shrink-0 min-h-[44px]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="transition hover:text-blue-600">
                로그인
              </Link>
              <Link
                href="/auth/login"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600 whitespace-nowrap shrink-0 min-h-[44px]"
              >
                시작하기
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
