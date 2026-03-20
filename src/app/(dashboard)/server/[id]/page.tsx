import ChannelView from "~/components/channel-view";

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ChannelView channelId={id} />;
}
