import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Search, Check, Globe } from "lucide-react";
import "./CreatableSelect.css";

const toProperCase = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

/**
 * CreatableSelect
 * Props:
 *  - value: string (currently selected value)
 *  - onChange: (value: string) => void
 *  - options: string[] (list of existing options)
 *  - placeholder: string
 *  - label: string (optional, shown inside when empty)
 */
const CreatableSelect = ({ value, onChange, options = [], placeholder = "Search or create…", onCreateOption }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When opening, focus the search input
  const handleOpen = () => {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const properQuery = toProperCase(query.trim());

  // Filter existing options by query
  const filtered = options
    .map((opt) => {
      if (typeof opt === "object" && opt !== null) {
        return {
          label: toProperCase(opt.label || opt.name || opt.value),
          value: opt.value || opt.name,
          isGlobal: Boolean(opt.isGlobal),
        };
      }
      return {
        label: toProperCase(opt),
        value: opt,
        isGlobal: false,
      };
    })
    .filter((o, i, arr) => arr.findIndex((x) => x.value.toLowerCase() === o.value.toLowerCase()) === i) // deduplicate
    .filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  // Check if the typed query already exists
  const exactMatch = filtered.some((o) => o.label.toLowerCase() === query.toLowerCase());

  const select = (val) => {
    onChange(toProperCase(val));
    setOpen(false);
    setQuery("");
  };

  const createNew = () => {
    if (properQuery) {
      if (onCreateOption) {
        onCreateOption(properQuery);
      } else {
        onChange(properQuery);
      }
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="cs-wrap" ref={containerRef}>
      {/* Trigger button */}
      <button type="button" className={`cs-trigger ${open ? "cs-open" : ""}`} onClick={handleOpen}>
        <span className={value ? "cs-value" : "cs-placeholder"}>{value ? toProperCase(value) : placeholder}</span>
        <ChevronDown size={16} className={`cs-chevron ${open ? "rotated" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="cs-dropdown">
          {/* Search */}
          <div className="cs-search-row">
            <Search size={14} className="cs-search-icon" />
            <input
              ref={inputRef}
              id="searchQuery"
              name="searchQuery"
              aria-label="Search or type to create"
              className="cs-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type to create…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) select(filtered[0]);
                  else if (properQuery) createNew();
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>

          {/* Options list */}
          <div className="cs-list">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`cs-option ${value && toProperCase(value) === opt.label ? "cs-selected" : ""}`}
                onClick={() => select(opt.value)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {opt.label}
                  {opt.isGlobal && <Globe size={14} style={{ color: "#3b82f6", opacity: 0.8 }} title="Global Option" />}
                </span>
                {value && toProperCase(value) === opt.label && <Check size={14} />}
              </button>
            ))}

            {/* Create new option */}
            {query.trim() && !exactMatch && (
              <button type="button" className="cs-create-btn" onClick={createNew}>
                <Plus size={14} />
                Create &nbsp;<strong>"{properQuery}"</strong>
              </button>
            )}

            {filtered.length === 0 && !query.trim() && (
              <div className="cs-empty">No options yet. Type to create one.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatableSelect;
