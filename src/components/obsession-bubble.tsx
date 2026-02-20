import { IconPlus, IconUser } from "@tabler/icons-react";
import { PencilIcon, Plus, Trash2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getInitialsFallback } from "~/lib/utils";
import { User } from "~/interfaces/user.interface";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { setObsessionSchema, SetObsessionValues } from "~/lib/validation";
import { Button } from "./ui/button";
import ReactionPicker from "./reaction-picker";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select";
import { OBSSESSION_DURATIONS } from "~/constants/constants";
import { useUpdateUserMutation } from "~/redux/apis/auth.api";
import { Spinner } from "./ui/spinner";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

const ObsessionBubble: React.FC<{ haveObsession: boolean, prompt: string, currentUserInfo: User }> = ({ haveObsession, prompt, currentUserInfo }) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentEmoji, setCurrentEmoji] = useState<string>("😊");
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [selectedValue, setSelectedValue] = useState<string>(OBSSESSION_DURATIONS[0].value.toString())
    const selectedItem = OBSSESSION_DURATIONS.find((item) => item.value.toString() === selectedValue)
    const [updateUser, { isLoading: isUpdatingUserLoading }] = useUpdateUserMutation();
    const setObsessionForm = useForm<SetObsessionValues>({
        resolver: zodResolver(setObsessionSchema),
        defaultValues: {
            obsession: "",
        },
    });

    useEffect(() => {
        if (dialogOpen && haveObsession && currentUserInfo.obsession) {
            setObsessionForm.reset({ obsession: currentUserInfo.obsession.text ?? "" });
            setSelectedEmoji(currentUserInfo.obsession.emoji ?? null);
            setCurrentEmoji(currentUserInfo.obsession.emoji ?? "😊");
            setSelectedValue(String(currentUserInfo.obsession.duration ?? OBSSESSION_DURATIONS[0].value));
        }
    }, [dialogOpen, haveObsession, currentUserInfo.obsession, setObsessionForm]);

    const onSetObsessionSubmit = (data: SetObsessionValues) => {
        updateUser({
            obsession: {
                text: data.obsession ?? null,
                emoji: selectedEmoji,
                duration: parseInt(selectedValue),
            },
        });
    }
    return (
        <div className="absolute top-full -mt-2 left-26 group/button-hover mr-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                {haveObsession ? (
                    <HoverCard openDelay={0}>
                        <HoverCardTrigger asChild>
                            <div className="relative w-full max-w-xs group">
                                <div className="absolute -top-4 -left-1 z-5 w-3 h-3 bg-card rotate-45 rounded-xl" />
                                <div className="absolute -top-2 left-3 z-5">
                                    <div className="w-6 h-6 bg-card rotate-45 rounded-xl" />
                                </div>

                                <div className={`${currentUserInfo.obsession?.text?.trim() || currentUserInfo.obsession?.emoji ? "" : "italic"} relative z-10 bg-card pl-3 pr-2 py-2.5 rounded-2xl text-muted-foreground text-sm transition-all duration-300 ease-in-out overflow-hidden max-h-14 group-hover:max-h-screen`}>
                                    <p className="line-clamp-2 group-hover:line-clamp-none transition-all duration-300 pr-1 wrap-break-word">
                                        {currentUserInfo.obsession?.text?.trim() || currentUserInfo.obsession?.emoji
                                            ? (currentUserInfo.obsession.emoji ? currentUserInfo.obsession.emoji + " " + currentUserInfo.obsession.text : currentUserInfo.obsession.text)
                                            : <span className="flex items-center gap-1">
                                                <span className="bg-main-primary rounded-full p-1 z-10">
                                                    <IconPlus className="size-full" size={16} color="var(--foreground)" />
                                                </span>
                                                {prompt}
                                            </span>}
                                    </p>
                                </div>
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent sideOffset={4} side="top" className="w-fit border-accent/10 flex items-center p-1 justify-center  rounded-2xl bg-muted ml-10">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-tl-2xl rounded-bl-2xl rounded-tr-none rounded-br-none"
                                onClick={() => setDialogOpen(true)}
                            >
                                <PencilIcon size={16} color={`var(--color-muted-foreground)`} className="hover:bg-hover" />
                            </Button>
                            <Button
                                disabled={isUpdatingUserLoading}
                                onClick={() => updateUser({ obsession: { text: null, emoji: null, duration: -1 } })
                                }
                                variant="ghost" size="icon" className="rounded-tr-2xl rounded-br-2xl rounded-tl-none rounded-bl-none">
                                <Trash2Icon size={16} color={`var(--color-muted-foreground)`} className="hover:bg-hover" />
                            </Button>
                        </HoverCardContent>
                    </HoverCard>
                ) : (
                    <DialogTrigger asChild>
                        <div className="relative w-full max-w-xs cursor-pointer">

                            <div className="absolute -top-4 -left-1 z-5 w-3 h-3 bg-main group-hover/button-hover:bg-main/70 rotate-45 rounded-xl" />
                            {/* Tail below */}
                            <div className="absolute -top-2 left-3 z-5 ">
                                <div className="w-6 h-6 bg-main rotate-45 rounded-xl group-hover/button-hover:bg-main/70" />
                            </div>

                            {/* Bubble */}
                            <div className="relative z-10 bg-main flex items-center gap-2 group-hover/button-hover:bg-main/70 group-hover/button-hover:text-foreground px-4 py-2.5 rounded-2xl text-muted-foreground text-sm italic overflow-hidden max-h-14 group-hover/button-hover:max-h-screen">
                                <span className="bg-main-primary rounded-full p-1 z-10">
                                    <IconPlus className="size-full text-muted-foreground group-hover/button-hover:text-foreground" size={16} />
                                </span>
                                <p className="line-clamp-2 group-hover/button-hover:line-clamp-none transition-all duration-300 pr-1 wrap-break-words w-full">
                                    {prompt}
                                </p>
                            </div>
                        </div>
                    </DialogTrigger>
                )}
                <DialogContent className="pb-6">
                    <DialogHeader className="">
                        <DialogTitle>Set your status</DialogTitle>
                        <DialogDescription></DialogDescription>
                    </DialogHeader>
                    <div className="w-full flex justify-center">
                        <Card className="p-0 max-w-sm w-full">
                            <CardContent className="p-0">
                                <div className="relative w-full h-30 bg-cover-placeholder rounded-t-2xl">
                                    <div className="absolute -bottom-10 left-4">
                                        <Avatar className="size-20">
                                            <AvatarImage
                                                src={currentUserInfo.profilePicture}
                                                alt={currentUserInfo.displayName}
                                            />
                                            <AvatarFallback>{getInitialsFallback(currentUserInfo.displayName)}</AvatarFallback>
                                            <AvatarBadge className="size-4.5! right-1 ring-4" variant={currentUserInfo.status.type} />
                                        </Avatar>
                                    </div>
                                    <div className="absolute top-full -mt-2 left-26 mr-2">
                                        <div className="relative w-full max-w-xs">

                                            <div className="absolute -top-4 -left-1 z-5 w-3 h-3 bg-main  rotate-45 rounded-xl" />
                                            {/* Tail below */}
                                            <div className="absolute -top-2 left-3 z-5 ">
                                                <div className="w-6 h-6 bg-main rotate-45 rounded-xl " />
                                            </div>

                                            {/* Bubble */}
                                            <div className={`relative z-10 bg-main flex items-center gap-2  px-4 py-2.5 rounded-2xl text-muted-foreground text-sm  overflow-hidden max-h-14 ${setObsessionForm.watch("obsession") || selectedEmoji ? "" : "italic"}`}>
                                                <p className="line-clamp-2 transition-all duration-300 pr-1 wrap-break-words w-full">
                                                    {[selectedEmoji, setObsessionForm.watch("obsession")].filter(Boolean).join(" ") || prompt}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pt-16 pb-8 flex flex-col items-start gap-2">
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-semibold">{currentUserInfo.displayName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm">{currentUserInfo.username}</p>
                                            {currentUserInfo.pronouns && <>
                                                &#8226;
                                                <p className="text-sm">{currentUserInfo.pronouns}</p>
                                            </>}
                                        </div>

                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter className="mx-8 flex-col!">
                        <Form {...setObsessionForm}>
                            <form id="set-obsession-form" onSubmit={setObsessionForm.handleSubmit(onSetObsessionSubmit)} className="space-y-4 w-full">
                                <FormField
                                    control={setObsessionForm.control}
                                    name="obsession"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 ">
                                                        <ReactionPicker
                                                            isMessageInput={false}
                                                            isShortcut={false}
                                                            currentUserId={currentUserInfo._id}
                                                            currentEmoji={currentEmoji}
                                                            setCurrentEmoji={setCurrentEmoji}
                                                            selectedEmoji={selectedEmoji}
                                                            addEmojiToMessage={(emoji) => {
                                                                setSelectedEmoji(emoji);
                                                                // Don't append emoji to input — it's sent as obsession.emoji; input is text only
                                                            }}
                                                        />
                                                    </div>
                                                    <Input type="text" placeholder="What's yout obesession today!" className="pl-10 h-11" {...field} autoComplete="off" />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                        <div className="w-full flex items-center justify-between mt-10">
                            <Select value={selectedValue} onValueChange={(value) => setSelectedValue(value)}>
                                <SelectTrigger className="w-full max-w-48 border-none cursor-pointer">
                                    <SelectValue placeholder="Clear after today">
                                        {selectedItem ? selectedItem.text : "Select duration"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Clear after</SelectLabel>
                                        {OBSSESSION_DURATIONS.map((duration) => (
                                            <SelectItem key={duration.value} value={duration.value.toString()}>{duration.text}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button
                                form="set-obsession-form"
                                type="submit"
                                size="lg"
                            >
                                {isUpdatingUserLoading ? (
                                    <>
                                        <Spinner />
                                        Saving...
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

export default ObsessionBubble;