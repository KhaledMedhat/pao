import { memo, useMemo } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "~/components/ui/input";
import { ChannelType, type Channel } from "~/interfaces/channels.interface";

interface SearchInputProps {
  channel: Channel | null;
}

const SearchInput = memo(function SearchInput({ channel }: SearchInputProps) {
  const truncatedName = useMemo(() => {
    const name =
      channel?.type === ChannelType.Direct
        ? channel?.directChannelOtherMember?.displayName || ""
        : channel?.groupOrServerName || "";
    return name.length > 10 ? `${name.slice(0, 8)}...` : name;
  }, [channel]);

  return (
    <div className="relative">
      <IconSearch
        size={20}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input placeholder={`Search ${truncatedName}`} />
    </div>
  );
});

export default SearchInput;
