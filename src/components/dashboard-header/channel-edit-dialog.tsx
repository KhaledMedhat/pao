import { memo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPhotoPlus, IconX } from "@tabler/icons-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { Spinner } from "~/components/ui/spinner";
import { ImageCropper } from "~/components/image-cropper";
import UserDetails from "~/components/user-details";
import { editGroupSchema, EditGroupValues } from "~/lib/validation";
import { useUpdateChannelMutation } from "~/redux/apis/channel.api";
import useUpload from "~/hooks/use-upload";
import { ConfigPrefix } from "~/interfaces/app.interface";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { ChannelType, type Channel } from "~/interfaces/channels.interface";

interface ChannelEditDialogProps {
  channel: Channel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChannelEditDialog = memo(function ChannelEditDialog({
  channel,
  open,
  onOpenChange,
}: ChannelEditDialogProps) {
  const [isUploadingLoading, setIsUploadingLoading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(() => {
    if (channel?.groupOrServerLogo && channel.groupOrServerLogo !== SHORT_LOGO_URL) {
      return channel.groupOrServerLogo;
    }
    return null;
  });
  const [hasDeletedExistingLogo, setHasDeletedExistingLogo] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const [updateChannel, { isLoading: isUpdatingChannel }] = useUpdateChannelMutation();
  const { startUpload } = useUpload(ConfigPrefix.SINGLE_IMAGE_UPLOADER, setIsUploadingLoading);

  const editGroupForm = useForm<EditGroupValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      groupName: channel?.groupOrServerName || "",
      groupLogo: undefined,
    },
  });

  const watchedGroupName = editGroupForm.watch("groupName");
  const watchedGroupLogo = editGroupForm.watch("groupLogo");

  const hasNameChange = Boolean(
    watchedGroupName?.trim() && watchedGroupName.trim() !== channel?.groupOrServerName
  );
  const hasLogoChange = Boolean(watchedGroupLogo);
  const hasFormChanges = hasNameChange || hasLogoChange || hasDeletedExistingLogo;

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageUrl(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
    setOriginalImageUrl(null);
  }, []);

  const handleCropApply = useCallback(
    (croppedFile: File) => {
      editGroupForm.setValue("groupLogo", croppedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImageUrl(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);
      setIsCropping(false);
      setOriginalImageUrl(null);
    },
    [editGroupForm]
  );

  const resetFormAndClose = useCallback(() => {
    editGroupForm.reset();
    setProfileImageUrl(null);
    setHasDeletedExistingLogo(false);
    setIsCropping(false);
    setOriginalImageUrl(null);
    onOpenChange(false);
  }, [editGroupForm, onOpenChange]);

  const onEditGroupSubmit = useCallback(
    async (data: EditGroupValues) => {
      const updateDto: { groupOrServerLogo?: string; groupOrServerName?: string } = {};

      if (data.groupLogo) {
        const res = await startUpload([data.groupLogo]);
        if (res?.[0]) {
          updateDto.groupOrServerLogo = res[0].ufsUrl;
        }
      } else if (hasDeletedExistingLogo) {
        updateDto.groupOrServerLogo = SHORT_LOGO_URL;
      }

      if (data.groupName?.trim() && data.groupName.trim() !== channel?.groupOrServerName) {
        updateDto.groupOrServerName = data.groupName;
      }

      if (Object.keys(updateDto).length > 0) {
        await updateChannel({
          channelId: channel?._id || "",
          updateChannelDto: updateDto,
        });
      }

      resetFormAndClose();
    },
    [channel, hasDeletedExistingLogo, startUpload, updateChannel, resetFormAndClose]
  );

  const handleDeleteLogo = useCallback(() => {
    if (profileImageUrl === channel?.groupOrServerLogo) {
      setHasDeletedExistingLogo(true);
    }
    setProfileImageUrl(null);
    editGroupForm.setValue("groupLogo", undefined);
  }, [profileImageUrl, channel?.groupOrServerLogo, editGroupForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          channel?.type === ChannelType.Direct
            ? "max-w-5xl! pb-0 h-[50vh]! overflow-y-auto"
            : "max-w-md"
        }
      >
        {channel?.type === ChannelType.Direct && channel?.directChannelOtherMember ? (
          <>
            <VisuallyHidden.Root>
              <DialogHeader>
                <DialogTitle />
                <DialogDescription />
              </DialogHeader>
            </VisuallyHidden.Root>
            <UserDetails
              user={channel.directChannelOtherMember}
              size="lg"
              setDialogOpen={onOpenChange}
            />
          </>
        ) : isCropping && originalImageUrl ? (
          <ImageCropper
            imageUrl={originalImageUrl}
            onApply={handleCropApply}
            onCancel={handleCropCancel}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <VisuallyHidden.Root>
                <DialogDescription />
              </VisuallyHidden.Root>
            </DialogHeader>
            <Form {...editGroupForm}>
              <form onSubmit={editGroupForm.handleSubmit(onEditGroupSubmit)} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {profileImageUrl && (
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        className="absolute top-0 right-0 rounded-full z-10"
                        onClick={handleDeleteLogo}
                      >
                        <IconX className="size-4" />
                      </Button>
                    )}
                    <div
                      className={`w-28 h-28 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-accent ${profileImageUrl ? "border-solid border-accent" : ""
                        }`}
                    >
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <IconPhotoPlus
                          stroke={2}
                          className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors"
                        />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click to upload a group picture (optional)
                  </p>
                </div>

                <FormField
                  control={editGroupForm.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          type="text"
                          placeholder={channel?.groupOrServerName || ""}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-4 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 bg-transparent"
                    onClick={() => onOpenChange(false)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11"
                    disabled={!hasFormChanges || isUploadingLoading || isUpdatingChannel}
                  >
                    {isUpdatingChannel || isUploadingLoading ? (
                      <>
                        <Spinner />
                        Saving...
                      </>
                    ) : (
                      <>Save</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ChannelEditDialog;
