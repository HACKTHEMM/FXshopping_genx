'use client';

import { useState } from 'react';

interface SettingsProps {
  onTabChange?: (tab: string) => void;
}

export default function Settings({ onTabChange }: SettingsProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: 'mateusz.madura@startify.space',
    currentPassword: '',
    newPassword: 'mateuszMadura1987',
    repeatPassword: 'mateuszMadura1987'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = () => {
    // Handle password change logic here
    console.log('Saving password changes...');
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      email: 'mateusz.madura@startify.space',
      currentPassword: '',
      newPassword: 'mateuszMadura1987',
      repeatPassword: 'mateuszMadura1987'
    });
  };

  return (
    <main className="px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Left Section - Profile & Security Info */}
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-black mb-6">Profile & security.</h2>
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-black leading-tight">
                You're in the right place to keep things <span className="text-blue-600">secure</span>.
              </h3>
              <p className="text-gray-600 text-lg">
                Update your credentials and stay in control of your account.
              </p>
              <button 
                onClick={() => onTabChange?.('Dashboard')}
                className="bg-white text-black px-6 py-3 rounded-xl font-medium border border-black hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
              >
                <span>Back to Dashboard</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Section - Password Management */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-black">Your password.</h3>
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-8">
            You can change your login password here to keep your account secure.
          </p>

          <div className="space-y-6">
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your current password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="******"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showCurrentPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showNewPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Repeat New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat new password
              </label>
              <div className="relative">
                <input
                  type={showRepeatPassword ? "text" : "password"}
                  name="repeatPassword"
                  value={formData.repeatPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showRepeatPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <p className="text-sm text-gray-500">
              Minimum 8 characters, with at least one number and one uppercase letter.
            </p>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleSaveChanges}
                className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 flex-1"
              >
                Save changes
              </button>
              <button
                onClick={handleCancel}
                className="bg-white text-black px-6 py-3 rounded-xl font-medium border border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
