import { memo, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowsSort, IconAt, IconFileFilled, IconHash, IconLink, IconPaperclip, IconPhotoFilled, IconRecordMail, IconSearch, IconUserFilled, IconVideoFilled, IconX } from "@tabler/icons-react";
import { Input } from "~/components/ui/input";
import { ChannelMessageRoom, ChannelType, type Channel } from "~/interfaces/channels.interface";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Filter, HasFilter } from "~/interfaces/app.interface";
import { Badge } from "../ui/badge";
import { RoundedCheckbox } from "../ui/checkbox";
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
import UserDetails from "../user-details";
import { Field, FieldGroup } from "../ui/field";
import { Label } from "../ui/label";
import Message from "../message";

interface SearchInputProps {
  channel: Channel | null;
  messages: MessageInterface[];
  onScrollToMessage: (messageId: string) => void;
}

const SearchInput = memo(function SearchInput({ channel, messages, onScrollToMessage }: SearchInputProps) {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [open, setOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [filter, setFilter] = useState<Filter | null>(null);
  const [fromFilter, setFromFilter] = useState<FriendInterface | null>(null);
  const [hasFilter, setHasFilter] = useState<HasFilter | null>(null);
  const [inFilter, setInFilter] = useState<ChannelMessageRoom | null>(null);
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
  const sortMessagesByDate = (messageList: MessageInterface[]) =>
    [...messageList].sort((a, b) => {
      const firstDate = new Date(a.createdAt ?? 0).getTime();
      const secondDate = new Date(b.createdAt ?? 0).getTime();
      return sortOrder === "newest" ? secondDate - firstDate : firstDate - secondDate;
    });

  const SortOptions = () => (
    <FieldGroup className="gap-4">
      <Field onClick={() => setSortOrder("newest")} orientation="horizontal" className="justify-between">
        <Label htmlFor="newest-checkbox">Newest</Label>
        <RoundedCheckbox id="newest-checkbox" name="newest-checkbox" checked={sortOrder === "newest"} onCheckedChange={(checked) => checked && setSortOrder("newest")} />
      </Field>
      <Field onClick={() => setSortOrder("oldest")} orientation="horizontal" className="justify-between">
        <Label htmlFor="oldest-checkbox">Oldest</Label>
        <RoundedCheckbox id="oldest-checkbox" name="oldest-checkbox" checked={sortOrder === "oldest"} onCheckedChange={(checked) => checked && setSortOrder("oldest")} />
      </Field>
    </FieldGroup>
  );

  const getMessageContentNodes = (message: MessageInterface) => message.message.content?.[0]?.content ?? [];

  const getMessageSearchText = (message: MessageInterface) =>
    getMessageContentNodes(message)
      .map((content) => {
        if (content.type === "mention") {
          return content.attrs?.label ?? "";
        }
        return content.text ?? "";
      })
      .join(" ")
      .toLowerCase();

  const mountFilterContent = (() => {
    const normalizedInput = inputValue.trim().toLowerCase();
    const matchesNormalizedInput = (value: string) => value.toLowerCase().includes(normalizedInput);
    const messageMatchesTyping = (message: MessageInterface) =>
      normalizedInput.length === 0 || getMessageSearchText(message).includes(normalizedInput);

    const filteredFromMessages = messages.filter((message) => message.sentBy?._id === fromFilter?._id && message.type === MessageType.TEXT);
    const filteredMessages =
      normalizedInput.length > 0 && fromFilter
        ? filteredFromMessages.filter(messageMatchesTyping)
        : filteredFromMessages;
    const filteredFromUsers =
      normalizedInput.length > 0 && !fromFilter && filter === Filter.FROM_SPECIFIC_USER
        ? channel?.members.filter((member) => {
          const displayName = member.displayName?.toLowerCase() ?? "";
          const username = member.username?.toLowerCase() ?? "";
          return matchesNormalizedInput(displayName) || matchesNormalizedInput(username);
        })
        : channel?.members;
    const filteredMentionUsers =
      normalizedInput.length > 0 && !mentionsFilter && filter === Filter.MENTIONS_USER
        ? channel?.members.filter((member) => {
          const displayName = member.displayName?.toLowerCase() ?? "";
          const username = member.username?.toLowerCase() ?? "";
          return matchesNormalizedInput(displayName) || matchesNormalizedInput(username);
        })
        : channel?.members;
    const filteredInChannels =
      normalizedInput.length > 0 && !inFilter && filter === Filter.IN_SPECIFIC_CHANNEL
        ? channel?.channelMessageRooms?.filter((room) => matchesNormalizedInput(room.name.toLowerCase()))
        : channel?.channelMessageRooms;
    const filteredHasButtons = normalizedInput.length > 0 && !hasFilter && filter === Filter.HAS_ATTACHMENTS ? hasFilterButtons.filter((filter) => filter.value.includes(normalizedInput)) : hasFilterButtons;
    const hasFilteredMessagesSource =
      hasFilter !== HasFilter.LINK
        ? messages.filter((message) => message.attachment?.some((attachment) => attachment.type.toLowerCase().includes(hasFilter?.toLowerCase() ?? "")))
        : messages.filter((message) => isValidUrl(message.message.content?.[0]?.content?.[0]?.text));
    const filteredHasMessages =
      normalizedInput.length > 0 && hasFilter && filter === Filter.HAS_ATTACHMENTS
        ? hasFilteredMessagesSource.filter(messageMatchesTyping)
        : hasFilteredMessagesSource;
    const normalizedSelectedMention = (mentionsFilter?.displayName || mentionsFilter?.username || "").trim().toLowerCase();
    const filteredMentionsMessages = messages.filter((message) => {
      const matchesMention = getMessageContentNodes(message).some((content) => {
        if (content.type !== "mention") return false;
        const mentionLabel = content.attrs?.label?.toLowerCase() ?? "";
        if (mentionsFilter && filter === Filter.MENTIONS_USER) {
          return mentionLabel === normalizedSelectedMention || mentionLabel.includes(normalizedSelectedMention);
        }
        return mentionLabel.includes(normalizedInput);
      });
      if (!matchesMention) return false;
      if (mentionsFilter && filter === Filter.MENTIONS_USER && normalizedInput.length > 0) {
        return messageMatchesTyping(message);
      }
      return true;
    });
    const filteredInMessagesSource = messages.filter((message) => message.referenceMessageRoomId === inFilter?._id);
    const filteredInMessages =
      normalizedInput.length > 0 && inFilter && filter === Filter.IN_SPECIFIC_CHANNEL
        ? filteredInMessagesSource.filter(messageMatchesTyping)
        : filteredInMessagesSource;
    const sortedFromMessages = sortMessagesByDate(filteredMessages);
    const sortedInMessages = sortMessagesByDate(filteredInMessages);
    const sortedHasMessages = sortMessagesByDate(filteredHasMessages);
    const sortedMentionsMessages = sortMessagesByDate(filteredMentionsMessages);
    switch (filter) {
      case Filter.FROM_SPECIFIC_USER:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {fromFilter ?
              <>
                <div className="flex items-center justify-between px-2">
                  <p>{sortedFromMessages.length} Results</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <IconArrowsSort size={16} />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-38">
                      <SortOptions />
                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {sortedFromMessages.map((message) => (
                      <Card key={message._id} className="relative group py-0 pb-4 px-2">
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
                          <Message className="p-0!" message={message} showHeader={true} isHovered={false} isHighlighted={false} channel={channel || undefined} onScrollToMessage={onScrollToMessage} contextMenuTriggerDisabled={true} messageCreatedAtFromatLength="sm" />
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
                  {filteredFromUsers?.map((member) => (
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
                  {!filteredFromUsers?.length && <p className="px-4 py-2 text-sm text-muted-foreground">No users found.</p>}
                </div>
              </>
            }

          </div>
        );
      case Filter.IN_SPECIFIC_CHANNEL:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {inFilter ?
              <>
                <div className="flex items-center justify-between px-2">
                  <p>{sortedInMessages.length} Results</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <IconArrowsSort size={16} />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-38">
                      <SortOptions />
                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />
                <div className="flex flex-col">
                  {sortedInMessages?.map((message) => (
                    <Card key={message._id} className="relative group py-0 pb-4 px-2">
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
                        <Message className="p-0!" message={message} showHeader={true} isHovered={false} isHighlighted={false} channel={channel || undefined} onScrollToMessage={onScrollToMessage} contextMenuTriggerDisabled={true} messageCreatedAtFromatLength="sm" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
              :
              <>
                <p className="text-xs text-muted-foreground px-4 font-semibold">In Channel</p>
                <div className="flex flex-col">
                  {filteredInChannels?.map((channel) => (
                    <Button onClick={() => {
                      setInFilter(channel)
                      inputRef.current?.focus();
                      setInputValue("");
                    }} key={channel._id} variant="ghost" className="flex items-center justify-start gap-2 w-full">
                      <IconHash size={20} />
                      {channel.name}
                    </Button>
                  ))}
                  {!filteredInChannels?.length && <p className="px-4 py-2 text-sm text-muted-foreground">No channels found.</p>}
                </div>
              </>}
          </div>
        );
      case Filter.HAS_ATTACHMENTS:
        return (
          <div className="flex flex-col self-start gap-2 w-full px-2">
            {hasFilter ? <>
              <div className="flex items-center justify-between px-2">
                <p>{sortedHasMessages.length} Results</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <IconArrowsSort size={16} />
                      Sort
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="max-w-38">
                    <SortOptions />
                  </PopoverContent>
                </Popover>
              </div>
              <Separator />
              <div className="flex flex-col">
                {sortedHasMessages?.map((message) => (
                  <Card key={message._id} className="relative group py-0 pb-4 px-2">
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
                      <Message className="p-0!" message={message} showHeader={true} isHovered={false} isHighlighted={false} channel={channel || undefined} onScrollToMessage={onScrollToMessage} contextMenuTriggerDisabled={true} messageCreatedAtFromatLength="sm" />
                    </CardContent>
                  </Card>
                ))}
                {!filteredHasMessages?.length && <p className="px-2 py-2 text-sm text-muted-foreground">No messages found.</p>}
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
                  <p>{sortedMentionsMessages.length} Results</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <IconArrowsSort size={16} />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-38">
                      <SortOptions />
                    </PopoverContent>
                  </Popover>
                </div>
                <Separator />
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {sortedMentionsMessages.map((message) => (
                      <Card key={message._id} className="relative group py-0 pb-4 px-2">
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
                          <Message className="p-0!" message={message} showHeader={true} isHovered={false} isHighlighted={false} channel={channel || undefined} onScrollToMessage={onScrollToMessage} contextMenuTriggerDisabled={true} messageCreatedAtFromatLength="sm" />
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
                  {filteredMentionUsers?.map((member) => (
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
                  {!filteredMentionUsers?.length && <p className="px-4 py-2 text-sm text-muted-foreground">No users found.</p>}
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
            {channel?.type === ChannelType.Server && <Button variant="ghost" className="flex items-center justify-start px-2!" size="xl" onClick={() => applyFilter(Filter.IN_SPECIFIC_CHANNEL)}>
              <IconHash size={22} />
              <div className="flex flex-col items-start leading-4">
                <p className="text-foreground">Sent in specific channel</p>
                <p className="text-xs">in: channel</p>
              </div>
            </Button>}
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
  const activeFilterValue = fromFilter?.displayName || hasFilter || mentionsFilter?.displayName || inFilter?.name;

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
                setInFilter(null);
                setMentionsFilter(null);
                setHasFilter(null);
                setInputValue("");
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <IconX size={18} />
            </Button>
          )}
          {filter && (
            <span ref={badgeContainerRef} className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
              <Badge variant="secondary">{activeFilterValue ? `${filter}: ${activeFilterValue}` : filter}</Badge>
            </span>
          )}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && filter && !fromFilter && !hasFilter && !mentionsFilter && !inFilter && inputValue.length === 0) {
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
              if (e.key === "Backspace" && inFilter && inputValue.length === 0) {
                setInFilter(null);
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
