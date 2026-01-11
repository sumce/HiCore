import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface AutocompleteInputProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  field,
  value,
  onChange,
  placeholder,
  className = '',
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    if (!newVal.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await api.getSuggestions(field, newVal);
        setSuggestions(results || []);
        setIsOpen((results || []).length > 0);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSelect = (e: React.MouseEvent, item: string) => {
    // Critical: preventDefault prevents the input from losing focus.
    // This maintains the 'focus-within' state on the parent row in DataEntryForm,
    // ensuring the dropdown stays z-indexed above subsequent rows during the click.
    e.preventDefault();
    onChange(item);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if(suggestions && suggestions.length > 0) setIsOpen(true); }}
        className={className}
        placeholder={placeholder}
        required={required}
      />
      {loading && (
        <div className="absolute right-3 top-2.5 pointer-events-none">
           <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {isOpen && suggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] w-full min-w-[120px] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-black/5">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-2.5 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
              onMouseDown={(e) => handleSelect(e, item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
