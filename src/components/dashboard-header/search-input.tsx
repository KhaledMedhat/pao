import { memo, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowsSort, IconAt, IconFile, IconFileFilled, IconLink, IconPaperclip, IconPhotoFilled, IconRecordMail, IconSearch, IconSend, IconUserFilled, IconVideoFilled, IconX } from "@tabler/icons-react";
import { Input } from "~/components/ui/input";
import { ChannelType, type Channel } from "~/interfaces/channels.interface";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Filter, HasFilter } from "~/interfaces/app.interface";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDate, getInitialsFallback, isValidUrl } from "~/lib/utils";
import { FriendInterface } from "~/interfaces/user.interface";
import { MessageInterface, MessageType } from "~/interfaces/message.interface";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent } from "../ui/card";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { AttachmentsGrid } from "../attachments-grid";
import Link from "next/link";

interface SearchInputProps {
  channel: Channel | null;
  messages: MessageInterface[];
  onScrollToMessage: (messageId: string) => void;
}

const SearchInput = memo(function SearchInput({ channel, messages, onScrollToMessage }: SearchInputProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [filter, setFilter] = useState<Filter | null>(null);
  const [fromFilter, setFromFilter] = useState<FriendInterface | null>(null);
  const [hasFilter, setHasFilter] = useState<HasFilter | null>(null);
  const [mentionsFilter, setMentionsFilter] = useState<FriendInterface | null>(null);
  const [badgeWidth, setBadgeWidth] = useState<number>(0);
  const badgeContainerRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldIgnoreNextCloseRef = useRef(false);
  const truncatedName = useMemo(() => {
    const name =
      channel?.type === ChannelType.Direct
        ? channel?.directChannelOtherMember?.displayName || ""
        : channel?.groupOrServerName || "";
    return name.length > 10 ? `${name.slice(0, 8)}...` : name;
  }, [channel]);

  useEffect(() => {
    if (!filter) {
      setBadgeWidth(0);
      return;
    }

    const badgeElement = badgeContainerRef.current;
    if (!badgeElement) return;

    const updateWidth = () => setBadgeWidth(badgeElement.offsetWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(badgeElement);

    return () => observer.disconnect();
  }, [filter]);

  const applyFilter = (nextFilter: Filter | null) => {
    shouldIgnoreNextCloseRef.current = true;
    setFilter(nextFilter);
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setTimeout(() => {
        shouldIgnoreNextCloseRef.current = false;
      }, 0);
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldIgnoreNextCloseRef.current) {
      return;
    }
    setOpen(nextOpen);
  };

  const hasFilterButtons = [
    {
      icon: IconPhotoFilled,
      label: "image",
      value: HasFilter.IMAGE,
    },
    {
      icon: IconVideoFilled,
      label: "video",
      value: HasFilter.VIDEO,
    },
    {
      icon: IconRecordMail,
      label: "audio",
      value: HasFilter.AUDIO,
    },
    {
      icon: IconFileFilled,
      label: "file",
      value: HasFilter.FILE,
    },
    {
      icon: IconLink,
      label: "link",
      value: HasFilter.LINK,
    },
  ]
  const mountFilterContent = (() => {
    const normalizedInput = inputValue.trim().toLowerCase();
    const filteredFromMessages = messages.filter((message) => message.sentBy?._id === fromFilter?._id && message.type === MessageType.TEXT);
    const filteredMessageByTyping = messages.filter((message) => {
      const messageText = message?.message?.content?.[0]?.content?.[0]?.text;
      return message.type === MessageType.TEXT && typeof messageText === "string" && messageText.toLowerCase().includes(normalizedInput);
    });
    const filteredMessages = inputValue.length > 0 && fromFilter ? filteredMessageByTyping : filteredFromMessages;
    const filteredUsers =
      normalizedInput.length > 0 && !fromFilter && filter === Filter.FROM_SPECIFIC_USER
        ? channel?.members.filter((member) => {
          const displayName = member.displayName?.toLowerCase() ?? "";
          const username = member.username?.toLowerCase() ?? "";
          return displayName.includes(normalizedInput) || username.includes(normalizedInput);
        })
        : channel?.members;
    const filteredHasButtons = normalizedInput.length > 0 && !hasFilter && filter === Filter.HAS_ATTACHMENTS ? hasFilterButtons.filter((filter) => filter.value.includes(normalizedInput)) : hasFilterButtons;
    const filteredHasMessageWithAttachments = normalizedInput.length > 0 && hasFilter && filter === Filter.HAS_ATTACHMENTS ? filteredMessageByTyping.filter((message) => message.attachment?.some((attachment) => attachment.type.toLowerCase().includes(hasFilter?.toLowerCase() ?? ""))) : messages.filter((message) => message.attachment?.some((attachment) => attachment.type.toLowerCase().includes(hasFilter?.toLowerCase() ?? "")));
    const filteredHasMessages =
      normalizedInput.length > 0 && hasFilter && filter === Filter.HAS_ATTACHMENTS ? filteredHasMessageWithAttachments :
        hasFilter !== HasFilter.LINK
          ? messages.filter((message) => message.attachment?.some((attachment) => attachment.type.toLowerCase().includes(hasFilter?.toLowerCase() ?? "")))
          : messages.filter((message) => isValidUrl(message.message.content?.[0]?.content?.[0]?.text));
    const normalizedSelectedMention = (mentionsFilter?.displayName || mentionsFilter?.username || "").trim().toLowerCase();
    const filteredMentionsSource = normalizedInput.length > 0 && mentionsFilter && filter === Filter.MENTIONS_USER ? filteredMessageByTyping : messages;
    const filteredMentionsMessages = filteredMentionsSource.filter((message) =>
      message.message.content?.[0]?.content?.some((content) => {
        if (content.type !== "mention") return false;
        const mentionLabel = content.attrs?.label?.toLowerCase() ?? "";
        if (mentionsFilter && filter === Filter.MENTIONS_USER) {
          return mentionLabel === normalizedSelectedMention || mentionLabel.includes(normalizedSelectedMention);
        }
        return mentionLabel.includes(normalizedInput);
      }),
    );
    switch (filter) {
      case Filter.FROM_SPECIFIC_USER:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {fromFilter ?
              <>
                <div className="flex items-center justify-between px-2">
                  <p>{filteredFromMessages.length} Results</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <IconArrowsSort size={16} />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>

                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {filteredMessages.map((message) => (
                      <Card key={message._id} className="relative group">
                        <div className="hidden group-hover:flex items-center absolute top-2 right-2">
                          <Button
                            variant="outline"
                            className="h-8"
                            onClick={() => onScrollToMessage(message._id)}
                          >
                            Jump
                          </Button>
                        </div>
                        <CardContent>
                          <div className="flex items-start gap-2">
                            <Avatar className="size-10" style={
                              message.sentBy?.profilePicture === SHORT_LOGO_URL && message.sentBy?.profilePictureBannerColor
                                ? { backgroundColor: message.sentBy.profilePictureBannerColor }
                                : undefined
                            }>
                              <AvatarImage src={message.sentBy?.profilePicture} />
                              <AvatarFallback>
                                {getInitialsFallback(message.sentBy?.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(message.createdAt?.toString(), "md")}
                                </p>
                              </div>
                              <p className="text-sm break-all">
                                {message.message.content?.[0]?.content?.[0]?.text}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
              :
              <>
                <p className="text-xs text-muted-foreground px-4 font-semibold">From User</p>
                <div className="flex flex-col">
                  {filteredUsers?.map((member) => (
                    <Button onClick={() => {
                      setFromFilter(member)
                      inputRef.current?.focus();
                      setInputValue("");
                    }} key={member._id} variant="ghost" className="flex items-center justify-start gap-2 w-full">
                      <Avatar className="size-5">
                        <AvatarImage src={member.profilePicture} alt={member.displayName} />
                        <AvatarFallback>{getInitialsFallback(member.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="flex items-center gap-2">{member.displayName}</span>
                      <span className="text-xs text-muted-foreground">{member.username}</span>
                    </Button>
                  ))}
                </div>
              </>
            }

          </div>
        );
      case Filter.HAS_ATTACHMENTS:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {hasFilter ? <>
              <div className="flex items-center justify-between px-2">
                <p>{filteredHasMessages.length} Results</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <IconArrowsSort size={16} />
                      Sort
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>

                  </PopoverContent>
                </Popover>
              </div>
              <Separator />
              <div className="flex flex-col">
                {filteredHasMessages?.map((message) => (
                  <Card key={message._id} className="relative group">
                    <div className="hidden group-hover:flex items-center absolute top-2 right-2">
                      <Button
                        variant="outline"
                        className="h-8"
                        onClick={() => onScrollToMessage(message._id)}
                      >
                        Jump
                      </Button>
                    </div>
                    <CardContent className="w-full">
                      <div className="flex items-start gap-2">
                        <Avatar className="size-10" style={
                          message.sentBy?.profilePicture === SHORT_LOGO_URL && message.sentBy?.profilePictureBannerColor
                            ? { backgroundColor: message.sentBy.profilePictureBannerColor }
                            : undefined
                        }>
                          <AvatarImage src={message.sentBy?.profilePicture} />
                          <AvatarFallback>
                            {getInitialsFallback(message.sentBy?.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(message.createdAt?.toString(), "md")}
                            </p>
                          </div>
                          {isValidUrl(message.message.content?.[0]?.content?.[0]?.text) ? <Link href={message.message.content?.[0]?.content?.[0]?.text ?? ""} target="_blank" className="text-url-link hover:underline cursor-pointer break-all text-sm">{message.message.content?.[0]?.content?.[0]?.text}</Link> :
                            <p className="break-all text-sm">{message.message.content?.[0]?.content?.[0]?.text}</p>}
                          {message.attachment && message.attachment.length > 0 && (
                            <div className="mt-2 w-full">
                              <AttachmentsGrid
                                isAlert={true}
                                messageId={message._id}
                                attachments={message.attachment}
                                sender={message.sentBy}
                                messageSentAt={message.createdAt}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </> : <>
              <p className="text-xs text-muted-foreground px-4 font-semibold">Message Contains</p>
              <div className="flex flex-col">
                {filteredHasButtons?.map((btn) => (
                  <Button onClick={() => {
                    setHasFilter(btn.value)
                    inputRef.current?.focus();
                    setInputValue("");
                  }} key={btn.value} variant="ghost" className="flex items-center justify-start gap-2 w-full">
                    <btn.icon size={20} />
                    {btn.label}
                  </Button>
                ))}
              </div>
            </>}
          </div>
        );

      case Filter.MENTIONS_USER:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {mentionsFilter ?
              <>
                <div className="flex items-center justify-between px-2">
                  <p>{filteredMentionsMessages.length} Results</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <IconArrowsSort size={16} />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>

                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {filteredMentionsMessages.map((message) => (
                      <Card key={message._id} className="relative group">
                        <div className="hidden group-hover:flex items-center absolute top-2 right-2">
                          <Button
                            variant="outline"
                            className="h-8"
                            onClick={() => onScrollToMessage(message._id)}
                          >
                            Jump
                          </Button>
                        </div>
                        <CardContent>
                          <div className="flex items-start gap-2">
                            <Avatar className="size-10" style={
                              message.sentBy?.profilePicture === SHORT_LOGO_URL && message.sentBy?.profilePictureBannerColor
                                ? { backgroundColor: message.sentBy.profilePictureBannerColor }
                                : undefined
                            }>
                              <AvatarImage src={message.sentBy?.profilePicture} />
                              <AvatarFallback>
                                {getInitialsFallback(message.sentBy?.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium">{message.sentBy?.displayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(message.createdAt?.toString(), "md")}
                                </p>
                              </div>
                              {message.message.content?.[0]?.content?.map((msg, idx) => (
                                <span key={idx} className="flex flex-col items-start">
                                  {msg.type === "text" &&
                                    isValidUrl(msg.text) ? <Link href={msg.text ?? ""} target="_blank" className="text-sm text-url-link hover:underline cursor-pointer">{msg.text}</Link> :
                                    <p className="break-all text-sm">{msg.text}</p>}
                                  {msg.type === "mention" && (
                                    <p className="text-sm break-all bg-mention/60 hover:bg-mention px-1 text-mention-secondary font-semibold rounded no-underline cursor-pointer">{msg.attrs?.mentionSuggestionChar + msg.attrs?.label}</p>

                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
              :
              <>
                <p className="text-xs text-muted-foreground px-4 font-semibold">Mentions User</p>
                <div className="flex flex-col">
                  {filteredUsers?.map((member) => (
                    <Button onClick={() => {
                      setMentionsFilter(member)
                      inputRef.current?.focus();
                      setInputValue("");
                    }} key={member._id} variant="ghost" className="flex items-center justify-start gap-2 w-full">
                      <Avatar className="size-5">
                        <AvatarImage src={member.profilePicture} alt={member.displayName} />
                        <AvatarFallback>{getInitialsFallback(member.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="flex items-center gap-2">{member.displayName}</span>
                      <span className="text-xs text-muted-foreground">{member.username}</span>
                    </Button>
                  ))}
                </div>
              </>
            }

          </div>
        );
      default: return (
        <div className="flex flex-col self-start gap-2 w-full">
          <p className="text-xs text-muted-foreground px-4">Filters</p>

          <div className="flex flex-col gap-2 w-full px-2">
            <Button variant="ghost" className="flex items-center justify-start px-2!" size="xl" onClick={() => applyFilter(Filter.FROM_SPECIFIC_USER)}>
              <IconUserFilled size={22} />
              <div className="flex flex-col items-start leading-4">
                <p className="text-foreground">From a specific User</p>
                <p className="text-xs">from: user</p>
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-start px-2!" size="xl" onClick={() => applyFilter(Filter.HAS_ATTACHMENTS)}>
              <IconPaperclip size={22} />
              <div className="flex flex-col items-start leading-4">
                <p className="text-foreground">Includes a specific type of data</p>
                <p className="text-xs">has: link, image, video, audio, file</p>
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-start px-2!" size="xl" onClick={() => applyFilter(Filter.MENTIONS_USER)}>
              <IconAt size={22} />
              <div className="flex flex-col items-start leading-4">
                <p className="text-foreground">Mentions a specific User</p>
                <p className="text-xs">mentions: user</p>
              </div>
            </Button>
          </div>
        </div>
      )
    }
  })();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative w-[300px]">
          {!filter ? (
            <IconSearch
              size={18}
              className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            />
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Clear filter"
              onClick={(e) => {
                e.stopPropagation();
                applyFilter(null);
                setFromFilter(null);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <IconX size={18} />
            </Button>
          )}
          {filter && (
            <span ref={badgeContainerRef} className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
              <Badge variant="secondary">{filter}: {fromFilter?.displayName} {hasFilter} {mentionsFilter?.displayName}</Badge>
            </span>
          )}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && filter && !fromFilter && !hasFilter && !mentionsFilter && inputValue.length === 0) {
                applyFilter(null);
              }
              if (e.key === "Backspace" && fromFilter && inputValue.length === 0) {
                setFromFilter(null);
              }
              if (e.key === "Backspace" && hasFilter && inputValue.length === 0) {
                setHasFilter(null);
              }
              if (e.key === "Backspace" && mentionsFilter && inputValue.length === 0) {
                setMentionsFilter(null);
              }
            }}
            placeholder={!filter ? `Search ${truncatedName}` : undefined}
            className="relative z-0 pr-9"
            style={filter ? { paddingLeft: `${badgeWidth + 10}px` } : undefined}
            onFocus={() => setOpen(true)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-sm p-0 py-4 relative flex flex-col gap-6 items-center"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (inputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        {inputValue.length > 0 && !filter ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground self-start">typing</p>
          </div>
        ) : (
          mountFilterContent
        )}
      </PopoverContent>
    </Popover>
  );
});

export default SearchInput;
