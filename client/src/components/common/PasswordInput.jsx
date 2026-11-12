import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Reusable PasswordInput with accessible toggle to show/hide password text.
 * Hidden by default, uses Lucide Eye/EyeOff icons, supports keyboard access.
 */
const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  disabled = false,
  className = '',
  autoComplete = 'current-password',
  leftIcon: LeftIcon = null,
  showToggleLabel = 'Show password',
  hideToggleLabel = 'Hide password',
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      {LeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <LeftIcon className="w-4 h-4" />
        </div>
      )}
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full min-h-[44px] ${LeftIcon ? 'pl-10' : 'pl-3.5'} pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        disabled={disabled}
        tabIndex={0}
        aria-label={showPassword ? hideToggleLabel : showToggleLabel}
        title={showPassword ? hideToggleLabel : showToggleLabel}
        className="absolute inset-y-0 right-0 min-w-[44px] flex items-center justify-center text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:text-orange-600 transition-colors cursor-pointer"
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Eye className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;

