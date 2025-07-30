"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Group, Category, Person, Task } from "@/lib/types";
import { performSearch, type SearchResult } from "@/lib/search-service";

interface GlobalSearchProps {
  groups: Group[];
  categories: Category[];
  people: Person[];
  tasks: Task[];
  onResultClick?: (result: SearchResult) => void;
}

export function GlobalSearch({
  groups,
  categories,
  people,
  tasks,
  onResultClick,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search function that uses server-side search with fallback
  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      const searchResults = await performSearch(searchQuery, {
        groups,
        categories,
        people,
        tasks,
      });
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executeSearch(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, groups, categories, people, tasks]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    onResultClick?.(result);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "group":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "category":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "person":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "task":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-muted-foreground"
        >
          <Search className="mr-2 h-4 w-4" />
          Search everything...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder="Search groups, categories, people, tasks..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {query ? "No results found." : "Start typing to search..."}
            </CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleResultClick(result)}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {result.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getTypeColor(result.type)}`}
                        >
                          {result.type}
                        </Badge>
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                      {result.metadata && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.metadata}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
