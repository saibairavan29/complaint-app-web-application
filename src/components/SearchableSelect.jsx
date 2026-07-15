import React, { useState, useEffect, useMemo, useRef } from "react";
import { getTranslatedProjectName } from "../utils/translationHelper";

export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Search...",
  label = "",
  language = "en",
  emptyMessage = "No matching items found",
  id = "searchable-select",
  isLoading = false,
  hasMore = false,
  onLoadMore = null,
  getBilingualName = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);
  const ignoreNextFocus = useRef(false);

  const containerHeight = 300; // max-height of the listbox
  const itemHeight = 48; // touch target height 48px

  // Helper to format option name bilingually
  const formatName = (option) => {
    if (!option) return "";
    if (getBilingualName) {
      return getBilingualName(option);
    }
    return getTranslatedProjectName(option, language);
  };

  // Synchronize input text with the selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      const selectedOption = options.find((opt) => 
        (opt.id !== undefined && opt.id !== null && String(opt.id) === String(value)) || 
        opt.name === value
      );
      if (selectedOption) {
        setInputValue(formatName(selectedOption));
      } else {
        setInputValue("");
      }
    }
  }, [value, isOpen, options, language]);

  // Debounce the search input query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Reset scroll top when query changes or dropdown opens
  useEffect(() => {
    if (isOpen) {
      setScrollTop(0);
      if (listboxRef.current) {
        listboxRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, debouncedQuery]);

  // Memoize filtered results for smooth performance
  const filteredOptions = useMemo(() => {
    if (!isOpen) return [];
    
    // If the input represents the already selected option exactly, show all options
    const selectedOption = options.find((opt) => 
      (opt.id !== undefined && opt.id !== null && String(opt.id) === String(value)) || 
      opt.name === value
    );
    const selectedFormatted = selectedOption ? formatName(selectedOption) : "";
    
    const query = debouncedQuery.trim().toLowerCase();
    if (!query || query === selectedFormatted.toLowerCase()) {
      return options.filter((opt) => opt.is_active !== false);
    }

    return options.filter((opt) => {
      if (opt.is_active === false) return false;
      const engName = (opt.name || "").toLowerCase();
      const localName = getTranslatedProjectName(opt, language).toLowerCase();
      return engName.includes(query) || localName.includes(query);
    });
  }, [options, debouncedQuery, language, isOpen, value]);

  // Calculate virtualized window range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(filteredOptions.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);

  // Memoize visible slice
  const visibleOptions = useMemo(() => {
    const slice = [];
    for (let i = startIndex; i < endIndex; i++) {
      if (filteredOptions[i]) {
        slice.push({ option: filteredOptions[i], index: i });
      }
    }
    return slice;
  }, [filteredOptions, startIndex, endIndex]);

  // Screen reader announcements for matches
  useEffect(() => {
    if (isOpen) {
      if (filteredOptions.length === 0) {
        setSrAnnouncement("No matching options found.");
      } else {
        setSrAnnouncement(`${filteredOptions.length} matching options. Use up and down arrow keys to navigate.`);
      }
    }
  }, [filteredOptions.length, isOpen]);

  // Handle outside click detection
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Keyboard navigation logic
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
          scrollIndexIntoView(nextIndex);
          return nextIndex;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1;
          scrollIndexIntoView(nextIndex);
          return nextIndex;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          selectOption(filteredOptions[activeIndex]);
        } else if (filteredOptions.length > 0) {
          selectOption(filteredOptions[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const scrollIndexIntoView = (index) => {
    const listbox = listboxRef.current;
    if (!listbox) return;
    const targetScrollTop = index * itemHeight;
    const listboxHeight = listbox.clientHeight || containerHeight;

    if (targetScrollTop + itemHeight > listbox.scrollTop + listboxHeight) {
      listbox.scrollTop = targetScrollTop + itemHeight - listboxHeight;
    } else if (targetScrollTop < listbox.scrollTop) {
      listbox.scrollTop = targetScrollTop;
    }
  };

  const selectOption = (option) => {
    const valToPass = (option.id !== undefined && option.id !== null) ? option.id : option.name;
    onChange(valToPass);
    setInputValue(formatName(option));
    setIsOpen(false);
    setActiveIndex(-1);
    setSrAnnouncement(`Selected ${formatName(option)}`);
    ignoreNextFocus.current = true;
    inputRef.current?.focus();
  };

  // Scroll and load more events listener for virtualization & lazy loading
  const handleScroll = (e) => {
    const listbox = e.currentTarget;
    setScrollTop(listbox.scrollTop);

    if (
      onLoadMore &&
      hasMore &&
      !isLoading &&
      listbox.scrollTop + listbox.clientHeight >= listbox.scrollHeight - 10
    ) {
      onLoadMore();
    }
  };

  const totalHeight = filteredOptions.length * itemHeight;

  return (
    <div ref={containerRef} className="relative w-full text-slate-900 dark:text-white">
      {label && (
        <label
          htmlFor={`${id}-input`}
          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Screen Reader Live Region */}
      <span className="sr-only" aria-live="polite">
        {srAnnouncement}
      </span>

      {/* Selector Trigger Input */}
      <div className="relative">
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          className="w-full h-12 min-h-[48px] px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow pr-10 focus:ring-offset-0 placeholder-slate-400 dark:placeholder-slate-550"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (ignoreNextFocus.current) {
              ignoreNextFocus.current = false;
              return;
            }
            setIsOpen(true);
            setTimeout(() => {
              inputRef.current?.select();
            }, 50);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-haspopup="listbox"
          aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          autoComplete="off"
        />

        {/* Dropdown Indicator Icon */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 min-w-[48px] justify-end"
          aria-label={isOpen ? "Close dropdown" : "Open dropdown"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-[300px] flex flex-col">
          
          <ul
            ref={listboxRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label || placeholder}
            onScroll={handleScroll}
            className="overflow-y-auto py-0 flex-1 scroll-smooth relative"
            style={{ 
              WebkitOverflowScrolling: "touch", 
              height: filteredOptions.length > 0 ? `${Math.min(containerHeight, totalHeight)}px` : "auto" 
            }}
          >
            {filteredOptions.length > 0 ? (
              <div style={{ height: `${totalHeight}px`, width: "100%", position: "relative" }}>
                {visibleOptions.map(({ option, index }) => {
                  const isSelected = (option.id !== undefined && option.id !== null && String(option.id) === String(value)) || option.name === value;
                  const isHighlighted = index === activeIndex;
                  return (
                    <li
                      key={option.id || `${option.name}-${index}`}
                      id={`${id}-opt-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setActiveIndex(index)}
                      style={{
                        position: "absolute",
                        top: `${index * itemHeight}px`,
                        left: 0,
                        right: 0,
                        height: `${itemHeight}px`,
                      }}
                      className={`flex items-center px-4 py-3 cursor-pointer text-base select-none transition-colors border-b border-slate-50 dark:border-slate-800 last:border-b-0 ${
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold"
                          : ""
                      } ${
                        isHighlighted
                          ? "bg-slate-100 dark:bg-slate-800/80"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {language !== "en" && option.localized_names?.[language] && option.localized_names[language] !== (option.name || option.localized_names["en"]) ? (
                        <div className="flex items-center py-1 text-left w-full">
                          <span className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-100">
                            {option.localized_names[language]} ({option.name || option.localized_names?.["en"] || ""})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center py-1 text-left w-full">
                          <span className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-100">
                            {option.name || option.localized_names?.["en"] || ""}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <svg className="w-5 h-5 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </li>
                  );
                })}
              </div>
            ) : (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center select-none min-h-[48px] flex items-center justify-center">
                {isLoading ? "Loading results..." : emptyMessage}
              </li>
            )}
            {isLoading && hasMore && filteredOptions.length > 0 && (
              <div 
                style={{
                  position: "absolute",
                  top: `${totalHeight}px`,
                  left: 0,
                  right: 0,
                  height: "30px",
                }}
                className="text-xs text-slate-450 text-center select-none flex items-center justify-center"
              >
                Loading more...
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
