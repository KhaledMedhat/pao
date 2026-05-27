import { IconHash, IconVolume } from "@tabler/icons-react";
import { Channel, ServerChannelType } from "~/interfaces/channels.interface";
import ReactionPicker from "./reaction-picker";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { FormField, FormItem, FormLabel, FormControl, Form } from "./ui/form";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Spinner } from "./ui/spinner";
import { Label } from "./ui/label";
import { useState } from "react";
import { createChannelCategorySchema, CreateChannelCategoryValues } from "~/lib/validation";
import { useCreateServerChannelMutation } from "~/redux/apis/channel.api";
import { sileo } from "sileo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const CreateChannelInServerDialog: React.FC<{ currentChannel: Channel | null, open: boolean, onOpenChange: (open: boolean) => void }> = ({ currentChannel, open, onOpenChange }) => {
    const [createServerChannel, { isLoading: isCreatingServerChannel }] = useCreateServerChannelMutation();
    const [currentEmoji, setCurrentEmoji] = useState<string>("😊");
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const createChannelCategory = useForm<CreateChannelCategoryValues>({
        resolver: zodResolver(createChannelCategorySchema),
        defaultValues: {
            channelType: ServerChannelType.Text,
            channelName: "",
        },
    });
    const onCreateChannelCategorySubmit = (data: CreateChannelCategoryValues) => {
        createServerChannel({
            serverId: currentChannel?._id || "",
            payload: data,
        }).unwrap().then(() => {
            onOpenChange(false);
            createChannelCategory.reset();
        }).catch(() => {
            sileo.error({
                title: "Oops, something went wrong!",
                description: "An unexpected error occurred",
            });
        });
    };
    return (
        <Dialog open={open} onOpenChange={(open) => {
            onOpenChange(open)
            createChannelCategory.reset()
        }}>
            <DialogContent showCloseButton={true}>
                <DialogHeader className="space-y-1">
                    <DialogTitle>Create Channel</DialogTitle>
                    <DialogDescription className="flex gap-1 items-center text-md">
                        In {currentChannel?.groupOrServerName} Channels.
                    </DialogDescription>
                </DialogHeader>
                <Form {...createChannelCategory}>
                    <form id="create-channel-category-form" onSubmit={createChannelCategory.handleSubmit(onCreateChannelCategorySubmit)} className="space-y-4">
                        <FormField
                            control={createChannelCategory.control}
                            name="channelType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-md">Channel Type</FormLabel>
                                    <FormControl className="mt-2">
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            name={field.name}
                                        >
                                            <div className="flex flex-col items-start">
                                                <div className="flex items-center gap-3">
                                                    <RadioGroupItem value={ServerChannelType.Text} id="r1" />
                                                    <Label htmlFor="r1" className="text-md font-normal gap-1"><IconHash size={20} /> Text</Label>
                                                </div>
                                                <p className="pl-10 text-sm text-muted-foreground">Send Messages, images, GIFs, emoji, opinions, and puns</p>
                                            </div>

                                            <div className="flex flex-col items-start">
                                                <div className="flex items-center gap-3">
                                                    <RadioGroupItem value={ServerChannelType.Voice} id="r2" />
                                                    <Label htmlFor="r2" className="text-md font-normal gap-1"><IconVolume size={20} /> Voice</Label>
                                                </div>
                                                <p className="pl-10 text-sm text-muted-foreground">Hang out together with voice, video, and screen share</p>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={createChannelCategory.control}
                            name="channelName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-md">Channel Name</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            {createChannelCategory.watch("channelType") === "Text" && <IconHash size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />}
                                            {createChannelCategory.watch("channelType") === "Voice" && <IconVolume size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />}
                                            <Input {...field} className="pl-10 h-11" placeholder="new-channel" autoComplete="off" />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 ">
                                                <ReactionPicker
                                                    isMessageInput={false}
                                                    isShortcut={false}
                                                    currentEmoji={currentEmoji}
                                                    setCurrentEmoji={setCurrentEmoji}
                                                    addEmojiToMessage={(emoji) => {
                                                        setSelectedEmoji(emoji);
                                                        field.onChange(`${field.value} ${emoji}`);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                <DialogFooter className="justify-between!">
                    <Button variant="secondary" size='xl' className="flex-1" onClick={() => {
                        onOpenChange(false)
                        createChannelCategory.reset()
                    }}>
                        Cancel
                    </Button>
                    <Button disabled={isCreatingServerChannel || createChannelCategory.watch("channelName") === ""} type="submit" form="create-channel-category-form" size='xl' className="flex-1">
                        {isCreatingServerChannel ? <><Spinner /> Creating Channel...</> : "Create Channel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default CreateChannelInServerDialog;