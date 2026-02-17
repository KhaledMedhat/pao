import { toast } from "sonner";
import { ConfigPrefix } from "~/interfaces/app.interface";
import { useUploadThing } from "~/lib/uploadthing";

const useUpload = (configPrefix: ConfigPrefix, setIsUploadingLoading?: (isUploading: boolean) => void,) => {
  const { startUpload, routeConfig } = useUploadThing(configPrefix, {
    onClientUploadComplete: () => {
      setIsUploadingLoading?.(false);
    },
    onUploadError: (error: Error) => {
      setIsUploadingLoading?.(false);
      toast.error(error.message);
    },
    onUploadBegin: () => {
      setIsUploadingLoading?.(true);
    },
  });

  return { startUpload, routeConfig };
};

export default useUpload;
