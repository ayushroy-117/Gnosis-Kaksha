'use client';

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthTabsProps {
  onSuccess?: () => void;
}

export function AuthTabs({ onSuccess }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="w-full space-y-6">
      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('login')}
          className={`pb-3 px-4 font-medium text-base transition-colors ${
            activeTab === 'login'
              ? 'text-[#1295D8] border-b-2 border-[#1295D8]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`pb-3 px-4 font-medium text-base transition-colors ${
            activeTab === 'register'
              ? 'text-[#1295D8] border-b-2 border-[#1295D8]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setActiveTab('register')}
            onLoginSuccess={onSuccess}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => setActiveTab('login')}
            onRegisterSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}
