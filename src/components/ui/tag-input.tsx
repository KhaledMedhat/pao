"use client";

import { useRef, type KeyboardEvent, type MouseEvent, useId } from "react";
import { cn } from "~/lib/utils";
import { Badge } from "./badge";
import { IconX } from "@tabler/icons-react";

export interface Tag {
  id: string;
  text: string;
}

interface StyleClasses {
  inlineTagsContainer?: string;
  input?: string;
  tag?: {
    body?: string;
    closeButton?: string;
  };
}

interface TagInputProps {
  id?: string;
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  placeholder?: string;
  styleClasses?: StyleClasses;
  activeTagIndex: number | null;
  setActiveTagIndex?: (index: number | null) => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
  className?: string;
  tagVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined;
}

export function TagInput({
  id,
  tags,
  setTags,
  placeholder = "Add a tag",
  styleClasses,
  activeTagIndex,
  setActiveTagIndex,
  onInputChange,
  inputValue = "",
  className,
  tagVariant = "default",
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const componentId = id || generatedId;

  const removeTag = (tagId: string, event?: MouseEvent) => {
    event?.stopPropagation();
    const newTags = tags.filter((tag) => tag.id !== tagId);
    setTags(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }

    if (e.key === "ArrowLeft" && inputValue === "" && tags.length > 0) {
      const newIndex = activeTagIndex === null ? tags.length - 1 : Math.max(0, activeTagIndex - 1);
      setActiveTagIndex?.(newIndex);
    }

    if (e.key === "ArrowRight" && activeTagIndex !== null) {
      const newIndex = activeTagIndex >= tags.length - 1 ? null : activeTagIndex + 1;
      setActiveTagIndex?.(newIndex);
    }

    if (e.key === "Delete" && activeTagIndex !== null) {
      removeTag(tags[activeTagIndex].id);
      setActiveTagIndex?.(null);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setActiveTagIndex?.(null);
  };

  const handleInputBlur = () => {
    setActiveTagIndex?.(null);
  };

  const handleInputChange = (value: string) => {
    onInputChange?.(value);
  };

  return (
    <div
      tabIndex={0}
      className={cn(
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground gap-1 border-muted-foreground flex items-center h-11 w-full min-w-0 rounded-md border bg-transparent px-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        styleClasses?.inlineTagsContainer,
        className
      )}
      onClick={handleContainerClick}
    >
      {tags.map((tag) => (
        <Badge tabIndex={-1} key={tag.id} className="cursor-pointer rounded-sm py-1" variant={tagVariant} onClick={(e) => removeTag(tag.id, e)}>
          {tag.text}
          <IconX size={12} />
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={componentId}
        type="text"
        placeholder={tags.length === 0 ? placeholder : ""}
        className={cn(
          "bg-transparent text-lg outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 h-6",
          // Dynamic width based on available space
          tags.length === 0 ? "grow" : "shrink-0 min-w-[80px] max-w-[200px]",
          styleClasses?.input
        )}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: tags.length > 0 ? `${Math.max(80, (inputValue.length + 1) * 8)}px` : undefined,
        }}
      />
    </div>
  );
}
