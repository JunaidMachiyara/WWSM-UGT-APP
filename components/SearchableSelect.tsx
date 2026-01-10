
import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface SearchableOption {
    id: string;
    name: string;
    description?: string;
}

interface SearchableSelectProps {
    options: SearchableOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        // Prevent "Enter" from submitting the parent form
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // If there's exactly one match, select it
            if (filteredOptions.length === 1) {
                handleSelect(filteredOptions[0].id);
            }
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`flex items-center justify-between w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 cursor-pointer focus-within:ring-1 focus-within:ring-primary focus-within:border-primary ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 flex flex-col max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <input
                            type="text"
                            className="w-full text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <ul className="overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.id}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-primary transition-colors ${option.id === value ? 'bg-blue-100 text-primary font-semibold' : 'text-gray-700'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option.id);
                                    }}
                                >
                                    {option.name}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-sm text-gray-500 italic">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
